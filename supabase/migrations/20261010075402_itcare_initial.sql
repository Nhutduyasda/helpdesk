-- Apply only to a new local/test Supabase project after reviewing this migration.
begin;
create schema if not exists itcare_private;
revoke all on schema itcare_private from public;
grant usage on schema itcare_private to authenticated;
create type public.ticket_status as enum ('new','acknowledged','in_progress','waiting_for_user','resolved','closed');
create type public.support_method as enum ('remote','onsite');
create sequence public.ticket_number_seq start 1001;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 full_name text not null check (length(full_name) between 1 and 120),
 department text not null default 'Văn phòng' check (length(department) between 1 and 120),
 role text not null default 'employee' check (role in ('employee','it')),
 active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tickets (
 id uuid primary key default gen_random_uuid(),
 ticket_number text not null unique default ('ITC-' || nextval('public.ticket_number_seq')::text),
 employee_id uuid not null references public.profiles(id), request_id uuid not null,
 description text not null check (length(description) <= 2000),
 status public.ticket_status not null default 'new', support_method public.support_method,
 resolution text check (length(resolution) <= 2000),
 attachment_manifest jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 submitted_at timestamptz, resolved_at timestamptz,
 unique (employee_id,request_id), check (jsonb_array_length(attachment_manifest) <= 3)
);
create table public.ticket_attachments (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
 storage_path text not null unique, content_type text not null check (content_type in ('image/jpeg','image/png','image/webp')),
 file_size bigint not null check (file_size between 1 and 5242880),
 uploaded_by uuid not null references public.profiles(id), ready boolean not null default false,
 position integer not null check(position between 0 and 2), unique(ticket_id,position),
 created_at timestamptz not null default now()
);
create table public.ticket_comments (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
 author_id uuid not null references public.profiles(id), message text not null check (length(btrim(message)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table public.ticket_events (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), event_type text not null,
 event_data jsonb not null default '{}', operation_id uuid,
 created_at timestamptz not null default now(), unique(ticket_id,actor_id,operation_id)
);
create index on public.tickets(employee_id,created_at desc);
create index on public.tickets(status,created_at desc) where submitted_at is not null;
create index on public.ticket_attachments(ticket_id);
create index on public.ticket_comments(ticket_id,created_at);
create index on public.ticket_events(ticket_id,created_at);

create function itcare_private.active_user() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active);
$$;
create function itcare_private.is_it() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active and role='it');
$$;
create function itcare_private.can_read_ticket(p_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select itcare_private.active_user() and exists(select 1 from public.tickets t where t.id=p_id and
 (t.employee_id=auth.uid() or (t.submitted_at is not null and itcare_private.is_it())));
$$;
create function itcare_private.can_upload(p_path text) returns boolean language sql stable security definer set search_path = '' as $$
 select itcare_private.active_user() and exists(select 1 from public.ticket_attachments a join public.tickets t on t.id=a.ticket_id
 where a.storage_path=p_path and a.uploaded_by=auth.uid() and t.employee_id=auth.uid() and t.submitted_at is null);
$$;
create function itcare_private.can_read_object(p_path text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.ticket_attachments a where a.storage_path=p_path and itcare_private.can_read_ticket(a.ticket_id));
$$;
revoke all on all functions in schema itcare_private from public;
grant execute on all functions in schema itcare_private to authenticated;

alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_events enable row level security;
revoke all on public.profiles,public.tickets,public.ticket_attachments,public.ticket_comments,public.ticket_events from anon,authenticated;
grant select on public.profiles,public.tickets,public.ticket_attachments,public.ticket_comments,public.ticket_events to authenticated;
create policy profile_read on public.profiles for select to authenticated using (id=auth.uid() or itcare_private.is_it());
create policy ticket_read on public.tickets for select to authenticated using (itcare_private.can_read_ticket(id));
create policy attachment_read on public.ticket_attachments for select to authenticated using (itcare_private.can_read_ticket(ticket_id));
create policy comment_read on public.ticket_comments for select to authenticated using (itcare_private.can_read_ticket(ticket_id));
create policy event_read on public.ticket_events for select to authenticated using (itcare_private.can_read_ticket(ticket_id));

create function itcare_private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(nullif(left(new.raw_user_meta_data->>'full_name',120),''),'Nhân viên'));
 return new;
end; $$;
revoke all on function itcare_private.new_profile() from public,authenticated;
create trigger itcare_profile after insert on auth.users for each row execute function itcare_private.new_profile();

-- Reserve a draft and server-generated upload paths. Retry uses the same request UUID.
create function public.prepare_ticket(p_request_id uuid,p_description text,p_files jsonb default '[]') returns public.tickets
language plpgsql security definer set search_path='' as $$
declare t public.tickets; f jsonb; path text; mime text; size bigint; file_index integer := 0;
begin
 if not itcare_private.active_user() then raise exception 'Account inactive or unauthenticated' using errcode='42501'; end if;
 if p_request_id is null or p_description is null or p_files is null or length(btrim(p_description))>2000 or jsonb_typeof(p_files)<>'array'
 or jsonb_array_length(p_files)>3 or (btrim(p_description)='' and jsonb_array_length(p_files)=0) then raise exception 'Invalid incident'; end if;
 -- Serializes concurrent identical requests before checking/allocating the identifier.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || p_request_id::text,0));
 select * into t from public.tickets where employee_id=auth.uid() and request_id=p_request_id;
 if found then
  if t.attachment_manifest<>p_files or t.description<>btrim(p_description) then raise exception 'Retry content changed; use a new request ID'; end if;
  return t;
 end if;
 insert into public.tickets(employee_id,request_id,description,attachment_manifest) values(auth.uid(),p_request_id,btrim(p_description),p_files) returning * into t;
 for f in select value from pg_catalog.jsonb_array_elements(p_files) loop
  mime := f->>'content_type'; size := (f->>'file_size')::bigint;
  if mime not in ('image/jpeg','image/png','image/webp') or mime is null or size is null or size<1 or size>5242880
    or coalesce(f->>'sha256','') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid attachment'; end if;
  path := auth.uid()::text || '/' || t.id::text || '/' || gen_random_uuid()::text || case mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end;
  insert into public.ticket_attachments(ticket_id,storage_path,content_type,file_size,uploaded_by,position) values(t.id,path,mime,size,auth.uid(),file_index);
  file_index := file_index + 1;
 end loop;
 return t;
end; $$;

-- Commit success only after every reserved object exists with expected size and MIME.
create function public.finalize_ticket(p_ticket_id uuid) returns public.tickets language plpgsql security definer set search_path='' as $$
declare t public.tickets;
begin
 if not itcare_private.active_user() then raise exception 'Account inactive' using errcode='42501'; end if;
 select * into t from public.tickets where id=p_ticket_id and employee_id=auth.uid() for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 if t.submitted_at is not null then return t; end if;
 if exists(select 1 from public.ticket_attachments a where a.ticket_id=t.id and not exists(
   select 1 from storage.objects o where o.bucket_id='incident-photos' and o.name=a.storage_path
    and (o.metadata->>'size')::bigint=a.file_size and o.metadata->>'mimetype'=a.content_type)) then raise exception 'Attachments incomplete'; end if;
 update public.ticket_attachments set ready=true where ticket_id=t.id;
 update public.tickets set submitted_at=now(),updated_at=now() where id=t.id returning * into t;
 insert into public.ticket_events(ticket_id,actor_id,event_type,event_data) values(t.id,auth.uid(),'submitted','{}');
 return t;
end; $$;

-- One atomic mutation includes comments, technician fields and append-only history.
create function public.update_ticket(p_ticket_id uuid,p_operation_id uuid,p_changes jsonb) returns public.tickets
language plpgsql security definer set search_path='' as $$
declare t public.tickets; next_status public.ticket_status; next_method public.support_method; prior jsonb;
begin
 if not itcare_private.active_user() or not itcare_private.can_read_ticket(p_ticket_id) then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into t from public.tickets where id=p_ticket_id and submitted_at is not null for update;
 if not found or p_operation_id is null or p_changes is null or jsonb_typeof(p_changes)<>'object' or p_changes='{}'::jsonb then raise exception 'Invalid action'; end if;
 select event_data->'changes' into prior from public.ticket_events where ticket_id=t.id and actor_id=auth.uid() and operation_id=p_operation_id;
 if found then if prior<>p_changes then raise exception 'Operation content changed'; end if; return t; end if;
 if t.status='closed' then raise exception 'Closed tickets are read-only'; end if;
 if exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('status','support_method','resolution','reply')) then raise exception 'Unknown fields'; end if;
 if (p_changes ? 'status' or p_changes ? 'support_method' or p_changes ? 'resolution') and not itcare_private.is_it() then raise exception 'IT role required' using errcode='42501'; end if;
 next_status := coalesce((p_changes->>'status')::public.ticket_status,t.status);
 next_method := coalesce((p_changes->>'support_method')::public.support_method,t.support_method);
 if p_changes ? 'status' and next_status='new' then raise exception 'Cannot reset to new'; end if;
 if next_status='closed' and t.status<>'resolved' then raise exception 'Resolve before closing'; end if;
 if p_changes ? 'resolution' and length(btrim(coalesce(p_changes->>'resolution','')))>2000 then raise exception 'Resolution too long'; end if;
 if next_status='resolved' and coalesce(nullif(btrim(p_changes->>'resolution'),''),nullif(t.resolution,'')) is null then raise exception 'Resolution required'; end if;
 if p_changes ? 'reply' then
  insert into public.ticket_comments(ticket_id,author_id,message) values(t.id,auth.uid(),btrim(p_changes->>'reply'));
 end if;
 update public.tickets set status=next_status,support_method=next_method,
 resolution=case when p_changes ? 'resolution' then btrim(p_changes->>'resolution') else resolution end,
 resolved_at=case when next_status='resolved' then coalesce(resolved_at,now()) when next_status='closed' then resolved_at else null end,
 updated_at=now() where id=t.id returning * into t;
 insert into public.ticket_events(ticket_id,actor_id,event_type,event_data,operation_id) values(t.id,auth.uid(),'updated',jsonb_build_object('changes',p_changes),p_operation_id);
 return t;
end; $$;

create function public.set_employee_active(p_employee_id uuid,p_active boolean) returns public.profiles language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 if not itcare_private.is_it() then raise exception 'IT role required' using errcode='42501'; end if;
 if p_active is null then raise exception 'Active is required'; end if;
 update public.profiles set active=p_active,updated_at=now() where id=p_employee_id and role='employee' returning * into p;
 if not found then raise exception 'Employee not found'; end if;
 return p;
end; $$;
revoke all on function public.prepare_ticket(uuid,text,jsonb),public.finalize_ticket(uuid),public.update_ticket(uuid,uuid,jsonb),public.set_employee_active(uuid,boolean) from public,anon;
grant execute on function public.prepare_ticket(uuid,text,jsonb),public.finalize_ticket(uuid),public.update_ticket(uuid,uuid,jsonb),public.set_employee_active(uuid,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('incident-photos','incident-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy itcare_storage_read on storage.objects for select to authenticated using (bucket_id='incident-photos' and itcare_private.can_read_object(name));
create policy itcare_storage_upload on storage.objects for insert to authenticated with check (bucket_id='incident-photos' and itcare_private.can_upload(name));
-- No browser update/delete of objects. Retry reuses existing immutable objects.
commit;
