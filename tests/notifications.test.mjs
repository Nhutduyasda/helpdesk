import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationItems} from '../src/services/itcare/notifications.ts';
const profiles=[{id:'a',role:'employee',active:true},{id:'b',role:'employee',active:true},{id:'it',role:'it',active:true}];
const tickets=[{id:'t',ticket_number:'ITC-TEST',employee_id:'a',submitted_at:'2026-10-10'}];
const events=[
 {id:'1',ticket_id:'t',actor_id:'a',event_type:'submitted',event_data:{},created_at:'1'},
 {id:'2',ticket_id:'t',actor_id:'it',event_type:'updated',event_data:{changes:{reply:'PRIVATE REPLY'}},created_at:'2'},
 {id:'3',ticket_id:'t',actor_id:'it',event_type:'updated',event_data:{changes:{status:'resolved',reply:'PRIVATE REPLY'}},created_at:'3'},
 {id:'4',ticket_id:'t',actor_id:'it',event_type:'updated',event_data:{changes:{support_method:'remote'}},created_at:'4'},
];
test('notification recipient matrix: IT receives new ticket, A receives IT reply/resolution, B receives none',()=>{
 assert.deepEqual(notificationItems(events,tickets,profiles,'it').map(x=>x.id),['1']);
 assert.deepEqual(notificationItems(events,tickets,profiles,'a').map(x=>x.id),['3','2']);
 assert.deepEqual(notificationItems(events,tickets,profiles,'b'),[]);
 assert(!JSON.stringify(notificationItems(events,tickets,profiles,'a')).includes('PRIVATE REPLY'));
});
test('inactive recipients and draft tickets receive no notifications',()=>{
 assert.deepEqual(notificationItems(events,tickets,profiles.map(p=>({...p,active:false})),'it'),[]);
 assert.deepEqual(notificationItems(events,tickets.map(t=>({...t,submitted_at:null})),profiles,'it'),[]);
});
