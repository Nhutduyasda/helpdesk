begin;
-- Additive: existing ownership, foreign keys, RPCs and storage policies remain.
alter table public.tickets alter column employee_id drop not null;
alter table public.tickets add column reporter_name text check(length(reporter_name) between 1 and 120);
alter table public.tickets add column reporter_department text check(length(reporter_department) between 1 and 120);
alter table public.tickets add column reporter_location text check(length(reporter_location)<=200);
alter table public.tickets add constraint ticket_reporter check(employee_id is not null or (reporter_name is not null and reporter_department is not null));
alter table public.ticket_attachments alter column uploaded_by drop not null;
alter table public.ticket_events alter column actor_id drop not null;
create table itcare_private.intake_requests (
 request_id uuid primary key, content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),
 ticket_id uuid not null unique references public.tickets(id), created_at timestamptz not null default now()
);
create table itcare_private.intake_limits (bucket text primary key, window_start timestamptz not null, attempts integer not null);
alter table itcare_private.intake_requests enable row level security;
alter table itcare_private.intake_limits enable row level security;
revoke all on itcare_private.intake_requests,itcare_private.intake_limits from public,anon,authenticated;

-- Global bound remains effective even if proxy headers are spoofed. No raw IP stored.
create function public.intake_allow(p_bucket text) returns boolean language plpgsql security definer set search_path='' as $$
declare total integer; personal integer;
begin
 delete from itcare_private.intake_limits where window_start < now()-interval '2 hours';
 insert into itcare_private.intake_limits values('global',date_trunc('hour',now()),1)
 on conflict(bucket) do update set attempts=case when intake_limits.window_start=excluded.window_start then intake_limits.attempts+1 else 1 end,window_start=excluded.window_start returning attempts into total;
 insert into itcare_private.intake_limits values('ip:'||p_bucket,date_trunc('hour',now()),1)
 on conflict(bucket) do update set attempts=case when intake_limits.window_start=excluded.window_start then intake_limits.attempts+1 else 1 end,window_start=excluded.window_start returning attempts into personal;
 return total<=100 and personal<=10;
end; $$;

create function public.prepare_public_ticket(p_request_id uuid,p_hash text,p_name text,p_department text,p_location text,p_description text,p_files jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tickets; prior itcare_private.intake_requests; f jsonb; idx integer:=0;
begin
 if p_request_id is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_name is null or length(btrim(p_name)) not between 1 and 120
 or p_department is null or length(btrim(p_department)) not between 1 and 120 or p_location is null or length(p_location)>200
 or p_description is null or length(p_description)>2000 or p_files is null or jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files)>3
 or (btrim(p_description)='' and jsonb_array_length(p_files)=0) then raise exception 'Invalid intake'; end if;
 perform pg_advisory_xact_lock(hashtextextended('public:'||p_request_id::text,0));
 select * into prior from itcare_private.intake_requests where request_id=p_request_id;
 if found then
  if prior.content_hash<>p_hash then raise exception 'Retry content changed'; end if;
  select * into t from public.tickets where id=prior.ticket_id;
 else
  insert into public.tickets(employee_id,request_id,description,attachment_manifest,reporter_name,reporter_department,reporter_location)
  values(null,p_request_id,btrim(p_description),p_files,btrim(p_name),btrim(p_department),btrim(p_location)) returning * into t;
  insert into itcare_private.intake_requests(request_id,content_hash,ticket_id) values(p_request_id,p_hash,t.id);
  for f in select value from jsonb_array_elements(p_files) loop
   if coalesce(f->>'content_type','') not in ('image/jpeg','image/png','image/webp') or coalesce((f->>'file_size')::bigint,0) not between 1 and 5242880 or coalesce(f->>'sha256','') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid attachment'; end if;
   insert into public.ticket_attachments(ticket_id,storage_path,content_type,file_size,uploaded_by,position)
   values(t.id,'public/'||t.id::text||'/'||idx::text,f->>'content_type',(f->>'file_size')::bigint,null,idx);
   idx:=idx+1;
  end loop;
 end if;
 return jsonb_build_object('id',t.id,'ticketNumber',t.ticket_number,'submitted',t.submitted_at is not null,'attachments',coalesce((select jsonb_agg(jsonb_build_object('path',storage_path,'position',position) order by position) from public.ticket_attachments where ticket_id=t.id),'[]'::jsonb));
end; $$;

create function public.finalize_public_ticket(p_request_id uuid,p_hash text) returns text language plpgsql security definer set search_path='' as $$
declare t public.tickets;
begin
 select t1.* into t from public.tickets t1 join itcare_private.intake_requests r on r.ticket_id=t1.id where r.request_id=p_request_id and r.content_hash=p_hash for update of t1;
 if not found then raise exception 'Invalid reservation'; end if;
 if t.submitted_at is not null then return t.ticket_number; end if;
 if exists(select 1 from public.ticket_attachments a where a.ticket_id=t.id and not exists(select 1 from storage.objects o where o.bucket_id='incident-photos' and o.name=a.storage_path and (o.metadata->>'size')::bigint=a.file_size and o.metadata->>'mimetype'=a.content_type)) then raise exception 'Attachments incomplete'; end if;
 update public.ticket_attachments set ready=true where ticket_id=t.id;
 update public.tickets set submitted_at=now(),updated_at=now() where id=t.id;
 insert into public.ticket_events(ticket_id,actor_id,event_type,event_data) values(t.id,null,'submitted','{"source":"public","identity_verified":false}');
 return t.ticket_number;
end; $$;
revoke all on function public.intake_allow(text),public.prepare_public_ticket(uuid,text,text,text,text,text,jsonb),public.finalize_public_ticket(uuid,text) from public,anon,authenticated;
grant execute on function public.intake_allow(text),public.prepare_public_ticket(uuid,text,text,text,text,text,jsonb),public.finalize_public_ticket(uuid,text) to service_role;
-- Employee routes are retired. Comments/history and every IT mutation require IT.
alter policy comment_read on public.ticket_comments using (itcare_private.is_it() and itcare_private.can_read_ticket(ticket_id));
alter policy event_read on public.ticket_events using (itcare_private.is_it() and itcare_private.can_read_ticket(ticket_id));
create or replace function public.update_ticket(p_ticket_id uuid,p_operation_id uuid,p_changes jsonb) returns public.tickets
language plpgsql security definer set search_path='' as $$
declare t public.tickets; next_status public.ticket_status; next_method public.support_method; prior jsonb;
begin
 if not itcare_private.is_it() then raise exception 'IT role required' using errcode='42501'; end if;
 if not itcare_private.can_read_ticket(p_ticket_id) then raise exception 'Not authorized' using errcode='42501'; end if;
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

commit;
