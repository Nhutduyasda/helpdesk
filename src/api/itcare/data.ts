import { http, HttpResponse, delay } from 'msw';

export const statuses = [
  'Mới',
  'Đã tiếp nhận',
  'Đang xử lý',
  'Chờ phản hồi',
  'Đã giải quyết',
  'Đã đóng',
] as const;
export type Status = (typeof statuses)[number];
export type Employee = {
  id: string;
  name: string;
  department: string;
  role: 'employee' | 'it';
  active: boolean;
};
export type Incident = {
  id: string;
  employeeId: string;
  description: string;
  photos: string[];
  created: string;
  status: Status;
  method?: string;
  resolution?: string;
  history: { date: string; text: string }[];
  replies: { date: string; author: string; text: string }[];
};
export const employees: Employee[] = [
  { id: 'e1', name: 'Nguyễn Minh Anh', department: 'Kế toán', role: 'employee', active: true },
  {
    id: 'e2',
    name: 'Trần Hoàng Nam',
    department: 'Xuất nhập khẩu',
    role: 'employee',
    active: true,
  },
  { id: 'e3', name: 'Lê Thu Hà', department: 'Kho', role: 'employee', active: true },
  { id: 'e4', name: 'Phạm Quốc Huy', department: 'HSE', role: 'employee', active: true },
  { id: 'it', name: 'Võ Đức Minh', department: 'IT', role: 'it', active: true },
];
const descriptions = [
  'Không đăng nhập được Windows',
  'Máy in không hoạt động',
  'Excel bị lỗi khi mở file',
  'Máy tính không lên nguồn',
  'Không kết nối được mạng Internet',
  'Máy in bị kẹt giấy',
];
let incidents: Incident[] = descriptions.map((description, i) => {
  const created = `2026-10-${String(10 - i).padStart(2, '0')}T08:30:00+07:00`;
  return {
    id: `ITC-100${i + 1}`,
    employeeId: i === 2 ? 'e3' : i % 2 === 0 ? 'e1' : employees[i % 4].id,
    description,
    photos: i === 1 ? ['/images/itcare/printer.svg'] : [],
    created,
    status: statuses[i],
    history: [
      { date: created, text: 'Đã gửi yêu cầu' },
      ...(i ? [{ date: created, text: statuses[i] }] : []),
    ],
    replies:
      i > 1
        ? [
            {
              date: created,
              author: 'Võ Đức Minh · IT',
              text:
                i > 3
                  ? 'Đã kiểm tra và khắc phục. Bạn vui lòng thử lại.'
                  : 'IT đã nhận yêu cầu và sẽ liên hệ để hỗ trợ.',
            },
          ]
        : [],
    ...(i > 3
      ? { method: 'Tại chỗ', resolution: 'Đã kiểm tra kết nối và khởi động lại thiết bị.' }
      : {}),
  };
});
export const itcareHandlers = [
  http.get('/api/itcare/tickets', async () => {
    await delay(350);
    return HttpResponse.json(incidents);
  }),
  http.get('/api/itcare/employees', () => HttpResponse.json(employees)),
  http.post('/api/itcare/tickets', async ({ request }) => {
    await delay(700);
    const input = (await request.json()) as {
      employeeId: string;
      description: string;
      photos: string[];
    };
    if (!input.description?.trim() && !input.photos?.length)
      return HttpResponse.json({ error: 'Thêm ảnh hoặc mô tả sự cố.' }, { status: 400 });
    const created = new Date().toISOString();
    const ticket: Incident = {
      ...input,
      description: input.description.trim() || 'Sự cố được báo bằng ảnh',
      id: `ITC-${Math.max(...incidents.map((t) => Number(t.id.slice(4)))) + 1}`,
      created,
      status: 'Mới',
      history: [{ date: created, text: 'Đã gửi yêu cầu' }],
      replies: [],
    };
    incidents = [ticket, ...incidents];
    return HttpResponse.json(ticket);
  }),
  http.put('/api/itcare/tickets/:id', async ({ params, request }) => {
    await delay(350);
    const input = (await request.json()) as {
      status?: Status;
      method?: string;
      reply?: string;
      author?: string;
      resolution?: string;
    };
    const ticket = incidents.find((t) => t.id === params.id);
    if (!ticket) return new HttpResponse(null, { status: 404 });
    const date = new Date().toISOString();
    if (input.status) {
      ticket.status = input.status;
      ticket.history.push({ date, text: input.status });
    }
    if (input.method) {
      ticket.method = input.method;
      ticket.history.push({ date, text: `Hỗ trợ: ${input.method}` });
    }
    if (input.resolution) ticket.resolution = input.resolution;
    if (input.reply?.trim())
      ticket.replies.push({ date, author: input.author || 'IT', text: input.reply.trim() });
    return HttpResponse.json(ticket);
  }),
  http.put('/api/itcare/employees/:id', async ({ params }) => {
    const employee = employees.find((e) => e.id === params.id);
    if (!employee || employee.role === 'it') return new HttpResponse(null, { status: 400 });
    employee.active = !employee.active;
    return HttpResponse.json(employee);
  }),
];
