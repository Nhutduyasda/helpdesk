import type { EventRow, ProfileRow, TicketRow } from './service.ts';
export type CareNotification = { id: string; ticketNumber: string; label: string; created: string };
export function notificationItems(events: EventRow[], tickets: TicketRow[], profiles: ProfileRow[], userId: string): CareNotification[] {
  const user = profiles.find(p => p.id === userId && p.active);
  if (!user) return [];
  return events.flatMap(event => {
    const ticket = tickets.find(t => t.id === event.ticket_id && t.submitted_at);
    if (!ticket || event.actor_id === userId) return [];
    let label: string | undefined;
    if (user.role === 'it' && event.event_type === 'submitted') label = 'Có yêu cầu hỗ trợ mới';
    // RLS hides IT profiles from employees. The transactional RPC permits only
    // the owner or IT to create these events; the actor above excludes the owner.
    if (user.role === 'employee' && ticket.employee_id === userId && event.event_type === 'updated') {
      if (event.event_data.changes?.status === 'resolved') label = 'IT đã giải quyết yêu cầu';
      else if (event.event_data.changes?.reply) label = 'IT đã phản hồi yêu cầu';
    }
    return label ? [{ id: event.id, ticketNumber: ticket.ticket_number, label, created: event.created_at }] : [];
  }).sort((a,b) => b.created.localeCompare(a.created)).slice(0,50);
}
