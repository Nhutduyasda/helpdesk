export const statuses = [
  'Mới',
  'Đã tiếp nhận',
  'Đang xử lý',
  'Chờ phản hồi',
  'Đã giải quyết',
  'Đã đóng',
] as const;
export type Status = (typeof statuses)[number];
export const statusCodes = [
  'new',
  'acknowledged',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed',
] as const;
export type StatusCode = (typeof statusCodes)[number];
export type Employee = {
  id: string;
  name: string;
  department: string;
  role: 'employee' | 'it';
  active: boolean;
};
export type Incident = {
  id: string;
  databaseId?: string;
  employeeId: string;
  reporter?: { name: string; department: string };
  location?: string;
  description: string;
  photos: string[];
  created: string;
  status: Status;
  method?: string;
  resolution?: string;
  history: { date: string; text: string }[];
  replies: { date: string; author: string; text: string }[];
};
export type TicketChange = {
  status?: Status;
  method?: string;
  reply?: string;
  resolution?: string;
};
export const toStatusCode = (status: Status): StatusCode => statusCodes[statuses.indexOf(status)];
export const statusLabel = (status: StatusCode): Status => statuses[statusCodes.indexOf(status)];
