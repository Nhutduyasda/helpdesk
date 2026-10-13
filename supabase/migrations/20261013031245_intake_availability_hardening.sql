begin;
-- Keep migration history additive; retire the unsafe pre-verification office bucket.
revoke all on function public.intake_allow(text) from service_role;
create function public.intake_precheck() returns boolean language plpgsql security definer set search_path='' as $$
declare minute_count integer; hour_count integer;
begin
 -- Only two coarse ingress buckets; no client-controlled IP/cardinality.
 delete from itcare_private.intake_limits where window_start < now()-interval '2 hours';
 insert into itcare_private.intake_limits values('ingress:hour',date_trunc('hour',now()),1)
 on conflict(bucket) do update set attempts=least(1001,case when intake_limits.window_start=excluded.window_start then intake_limits.attempts+1 else 1 end),window_start=excluded.window_start returning attempts into hour_count;
 insert into itcare_private.intake_limits values('ingress:minute',date_trunc('minute',now()),1)
 on conflict(bucket) do update set attempts=least(121,case when intake_limits.window_start=excluded.window_start then intake_limits.attempts+1 else 1 end),window_start=excluded.window_start returning attempts into minute_count;
 return minute_count<=120 and hour_count<=1000;
end; $$;
revoke all on function public.intake_precheck() from public,anon,authenticated;
grant execute on function public.intake_precheck() to service_role;
create or replace function public.prepare_public_ticket(p_request_id uuid,p_hash text,p_name text,p_department text,p_location text,p_description text,p_files jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tickets; prior itcare_private.intake_requests; f jsonb; idx integer:=0; admitted integer;
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
  -- Admission counts NEW bot-verified reservations, never malformed calls or retries.
  -- This row lock serializes admission across distinct request IDs/Edge instances.
  insert into itcare_private.intake_limits values('verified:hour',date_trunc('hour',now()),1)
  on conflict(bucket) do update set attempts=case when intake_limits.window_start=excluded.window_start then intake_limits.attempts+1 else 1 end,window_start=excluded.window_start returning attempts into admitted;
  if admitted>10 then raise exception 'Intake capacity reached'; end if;
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

-- CREATE OR REPLACE preserves grants; explicitly restate the server-only boundary.
revoke all on function public.prepare_public_ticket(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_public_ticket(uuid,text,text,text,text,text,jsonb) to service_role;
commit;
