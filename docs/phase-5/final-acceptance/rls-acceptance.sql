begin;
-- Approved synthetic identities are transaction-only, passwordless, and never persisted.
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('f5000000-0000-4000-8000-000000000001','authenticated','authenticated','phase5-inactive@example.invalid','{}','{"name":"Synthetic inactive QA"}',now(),now()),
('f5000000-0000-4000-8000-000000000002','authenticated','authenticated','phase5-nonit@example.invalid','{}','{"name":"Synthetic non-IT QA"}',now(),now());
update public.profiles set role='it',active=false where id='f5000000-0000-4000-8000-000000000001';
update public.profiles set role='employee',active=true where id='f5000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','f5000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $qa$
begin
 if exists(select 1 from public.tickets) or exists(select 1 from public.ticket_comments) or exists(select 1 from public.ticket_events) or exists(select 1 from public.ticket_attachments) then raise exception 'Inactive identity read private business data'; end if;
 begin perform public.update_ticket('5efa67ab-e5a3-48ca-b768-99a691ef07a4',gen_random_uuid(),'{"reply":"Synthetic denial probe"}'); raise exception 'Inactive mutation unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.set_employee_active('f5000000-0000-4000-8000-000000000002',false); raise exception 'Inactive admin mutation unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $qa$;
select set_config('request.jwt.claim.sub','f5000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $qa$
begin
 if exists(select 1 from public.tickets) or exists(select 1 from public.ticket_comments) or exists(select 1 from public.ticket_events) or exists(select 1 from public.ticket_attachments) then raise exception 'Non-IT identity read private public reports'; end if;
 if exists(select 1 from public.profiles where id<>'f5000000-0000-4000-8000-000000000002') then raise exception 'Non-IT identity read Admin profile list'; end if;
 begin perform public.update_ticket('5efa67ab-e5a3-48ca-b768-99a691ef07a4',gen_random_uuid(),'{"status":"resolved","resolution":"Synthetic denial probe"}'); raise exception 'Non-IT mutation unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.set_employee_active('f5000000-0000-4000-8000-000000000001',true); raise exception 'Non-IT admin mutation unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $qa$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $qa$
begin
 begin perform 1 from public.tickets; raise exception 'Anon tickets unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.update_ticket('5efa67ab-e5a3-48ca-b768-99a691ef07a4',gen_random_uuid(),'{"reply":"Synthetic denial probe"}'); raise exception 'Anon IT RPC unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $qa$;
reset role;
select jsonb_build_object('passed',true,'scope','live PostgreSQL roles and JWT claim emulation; not Auth sessions or browser identities','inactive_private_reads_denied',true,'non_it_admin_reads_denied',true,'it_mutations_denied',true,'anon_table_rpc_denied',true,'synthetic_fixtures','transaction rollback; no persistent identities') as acceptance;
rollback;
