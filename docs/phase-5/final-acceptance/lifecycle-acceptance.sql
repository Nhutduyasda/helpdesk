begin;
-- Rollback-only server/database acceptance: no HTTP/Turnstile proof.
select set_config('qa.active_it',(select id::text from public.profiles where role='it' and active limit 1),true);
insert into itcare_private.intake_limits(bucket,window_start,attempts)
values('verified:hour',date_trunc('hour',now()),9)
on conflict(bucket) do update set window_start=excluded.window_start,attempts=excluded.attempts;
set local role service_role;
do $qa$
declare first_result jsonb; retry_result jsonb; ref text; second_ref text;
begin
 first_result:=public.prepare_public_ticket('f5000000-0000-4000-8000-000000000003',repeat('a',64),'Synthetic database QA','Synthetic QA','','Rollback-only acceptance','[]');
 retry_result:=public.prepare_public_ticket('f5000000-0000-4000-8000-000000000003',repeat('a',64),'Synthetic database QA','Synthetic QA','','Rollback-only acceptance','[]');
 if first_result->>'id'<>retry_result->>'id' then raise exception 'Retry duplicated reservation'; end if;
 perform set_config('qa.ticket_id',first_result->>'id',true);
 begin
  perform public.prepare_public_ticket('f5000000-0000-4000-8000-000000000004',repeat('b',64),'Synthetic database QA','Synthetic QA','','Rollback-only overflow','[]');
  raise exception 'Capacity unexpectedly exceeded';
 exception when raise_exception then
  if SQLERRM<>'Intake capacity reached' then raise; end if;
 end;
 ref:=public.finalize_public_ticket('f5000000-0000-4000-8000-000000000003',repeat('a',64));
 second_ref:=public.finalize_public_ticket('f5000000-0000-4000-8000-000000000003',repeat('a',64));
 if ref<>second_ref then raise exception 'Finalization not idempotent'; end if;
end $qa$;
reset role;
do $qa$
begin
 if (select attempts from itcare_private.intake_limits where bucket='verified:hour')<>10 then raise exception 'Retry/denial changed allowance'; end if;
 if (select count(*) from itcare_private.intake_requests where request_id='f5000000-0000-4000-8000-000000000003')<>1 then raise exception 'Duplicate reservation'; end if;
 if (select count(*) from public.ticket_events where ticket_id=current_setting('qa.ticket_id')::uuid and event_type='submitted')<>1 then raise exception 'Duplicate submitted event'; end if;
end $qa$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.active_it'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.active_it'),'role','authenticated')::text,true);
do $qa$
declare t uuid:=current_setting('qa.ticket_id')::uuid;
begin
 if not exists(select 1 from public.tickets where id=t) then raise exception 'Active IT cannot read finalized public report'; end if;
 perform public.update_ticket(t,gen_random_uuid(),'{"status":"acknowledged"}');
 perform public.update_ticket(t,gen_random_uuid(),'{"status":"in_progress","support_method":"remote"}');
 perform public.update_ticket(t,gen_random_uuid(),'{"reply":"Synthetic internal database QA"}');
 perform public.update_ticket(t,gen_random_uuid(),'{"status":"waiting_for_user"}');
 perform public.update_ticket(t,gen_random_uuid(),'{"status":"resolved","resolution":"Synthetic rollback-only resolution"}');
 perform public.update_ticket(t,gen_random_uuid(),'{"status":"closed"}');
 if not exists(select 1 from public.tickets where id=t and status='closed') then raise exception 'Lifecycle not saved'; end if;
 begin
  perform public.update_ticket(t,gen_random_uuid(),'{"reply":"Must fail after closure"}');
  raise exception 'Closed mutation unexpectedly allowed';
 exception when raise_exception then
  if SQLERRM<>'Closed tickets are read-only' then raise; end if;
 end;
end $qa$;
reset role;
select jsonb_build_object('passed',true,'project','praluwpaundvwmifaije','scope','live database transaction, sequential at simulated last admission slot; not simultaneous HTTP or Turnstile','retry_at_capacity_deduplicated',true,'different_request_at_capacity_denied',true,'counter_after_retry_and_denial',10,'finalization_idempotent',true,'active_it_lifecycle',true,'cleanup','rollback; ticket-number sequence may advance by one') as acceptance;
rollback;
