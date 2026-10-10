import { Ticket, History, Users } from 'lucide-react';
import type { MenuItem } from './sidebaritems';
const items: MenuItem[] = [
  {
    heading: 'ITCARE',
    items: [
      { id: 'inbox', name: 'Hộp thư yêu cầu', icon: Ticket, url: '/it/inbox' },
      { id: 'history', name: 'Lịch sử yêu cầu', icon: History, url: '/it/history' },
      { id: 'employees', name: 'Nhân viên', icon: Users, url: '/it/employees' },
    ],
  },
];
export default items;
