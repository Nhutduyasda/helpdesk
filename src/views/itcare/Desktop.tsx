import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCare } from '@/context/itcare';
import { statuses, type Status } from '@/api/itcare/domain';
import { CarePage, DataState, StatusBadge, dateText } from './shared';
import StyleDivider from '@/components/shared/StyleDivider';
import { cn } from '@/lib/utils';
import DataTable from '@/components/tables/data-table/DataTable';
import Spinner from '@/views/spinner/Spinner';

export function Filter({
  label,
  value,
  values,
  change,
}: {
  label: string;
  value: string;
  values: readonly string[];
  change: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => change(v || 'Tous')}>
      <SelectTrigger aria-label={label} className="min-h-11">
        <SelectValue>{value === 'Tous' ? label : value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Tous">{label}</SelectItem>
        {values.map((v) => (
          <SelectItem value={v} key={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Inbox() {
  const { tickets, employees } = useCare();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Tous');
  const [department, setDepartment] = useState('Tous');
  const history = useLocation().pathname.endsWith('history');
  const visible = tickets.filter((t) => {
    const employee = employees.find((e) => e.id === t.employeeId);
    return (
      (status === 'Tous' || t.status === status) &&
      (department === 'Tous' || employee?.department === department) &&
      `${t.id} ${t.description} ${employee?.name}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    );
  });
  return (
    <CarePage>
      <Card className="py-5 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl">{history ? 'Lịch sử yêu cầu' : 'Hộp thư yêu cầu'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ITCare / {history ? 'Lịch sử' : 'Yêu cầu hỗ trợ'}
          </p>
        </div>
      </Card>
      <StyleDivider />
      <DataState>
        <Card className="p-6">
          {!history && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Tất cả yêu cầu',
                  count: tickets.length,
                  value: 'Tous',
                  color: 'bg-primary/5 border-primary/20',
                },
                {
                  title: 'Yêu cầu mới',
                  count: tickets.filter((t) => t.status === 'Mới').length,
                  value: 'Mới',
                  color: 'bg-chart-4/12 border-chart-4/20',
                },
                {
                  title: 'Đang xử lý',
                  count: tickets.filter((t) => t.status === 'Đang xử lý').length,
                  value: 'Đang xử lý',
                  color: 'bg-chart-2/12 border-chart-2/20',
                },
                {
                  title: 'Đã giải quyết',
                  count: tickets.filter((t) => t.status === 'Đã giải quyết').length,
                  value: 'Đã giải quyết',
                  color: 'bg-destructive/12 border-destructive/20',
                },
              ].map((item) => (
                <button
                  aria-pressed={status === item.value}
                  onClick={() => setStatus(item.value)}
                  key={item.title}
                  className={cn(
                    'p-6 md:p-8 border text-center rounded-lg cursor-pointer focus-visible:outline-2',
                    item.color,
                  )}
                >
                  <span className="block text-2xl font-semibold">{item.count}</span>
                  <span className="block mt-1">{item.title}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between flex-wrap items-center gap-3 my-4">
            <Input
              className="max-w-sm min-h-11"
              aria-label="Tìm yêu cầu"
              placeholder="Tìm mã, nội dung, nhân viên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Filter
                label="Tất cả trạng thái"
                value={status}
                values={statuses}
                change={setStatus}
              />
              <Filter
                label="Tất cả phòng ban"
                value={department}
                values={['Kế toán', 'Xuất nhập khẩu', 'Kho', 'HSE']}
                change={setDepartment}
              />
            </div>
          </div>
          {history ? (
            <>
              <DataTable
                localized
                showActions={false}
                data={visible.map((t) => ({
                  'Mã yêu cầu': t.id,
                  'Nội dung': t.description,
                  'Nhân viên': employees.find((e) => e.id === t.employeeId)?.name,
                  'Ngày sự cố': dateText(t.created),
                  'Trạng thái': t.status,
                  'Kết quả': t.resolution || 'Chưa giải quyết',
                }))}
              />
              <div className="flex flex-wrap gap-2 mt-4">
                {visible.map((t) => (
                  <Button key={t.id} variant="outline" nativeButton={false} render={<Link to={`/it/tickets/${t.id}`} />}>
                    Xem {t.id}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      'Mã',
                      'Yêu cầu',
                      'Nhân viên',
                      'Phòng ban',
                      'Trạng thái',
                      'Ngày gửi',
                      'Thao tác',
                    ].map((h) => (
                      <TableHead key={h} className="text-base font-semibold whitespace-nowrap py-3">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((t) => {
                    const employee = employees.find((e) => e.id === t.employeeId);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>{t.id}</TableCell>
                        <TableCell className="min-w-48 max-w-64">
                          <h2 className="text-base break-words">{t.description}</h2>
                          <p className="text-sm text-muted-foreground">
                            {t.photos.length
                              ? `${t.photos.length} ảnh đính kèm`
                              : 'Yêu cầu hỗ trợ IT'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-3 items-center whitespace-nowrap">
                            <Avatar>
                              <AvatarFallback>{employee?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {employee?.name}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{employee?.department}</TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {dateText(t.created)}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" nativeButton={false} render={<Link to={`/it/tickets/${t.id}`} />}>
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!visible.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        Không có yêu cầu phù hợp. Hãy đổi bộ lọc.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </DataState>
    </CarePage>
  );
}
export function Details() {
  const { id } = useParams();
  const { tickets, employees, user, update, loading, error: dataError, demo } = useCare();
  const [reply, setReply] = useState('');
  const operation = useRef<{ payload: string; id: string } | null>(null);
  const actionLock = useRef(false);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const it = user?.role === 'it';
  const ticket = tickets.find((t) => t.id === id && (it || t.employeeId === user?.id));
  const employee = employees.find((e) => e.id === ticket?.employeeId);
  async function action(input: {
    status?: Status;
    method?: string;
    reply?: string;
    resolution?: string;
  }) {
    if (!ticket || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    try {
      const payload = JSON.stringify([ticket.id, input]);
      if (operation.current?.payload !== payload) operation.current = { payload, id: crypto.randomUUID() };
      await update(ticket.id, input, operation.current.id);
      operation.current = null;
      if (input.reply) setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thay đổi. Vui lòng thử lại.');
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  if (!loading && !dataError && !ticket)
    return (
      <Card className="ring-1! ring-border! p-6">
        <h1>Không tìm thấy yêu cầu</h1>
        <Link className="underline" to={it ? '/it/inbox' : '/employee/requests'}>
          Quay lại danh sách
        </Link>
      </Card>
    );
  return (
    <DataState>
      {ticket && (
        <>
          <Link className="underline text-sm" to={it ? '/it/inbox' : '/employee/requests'}>
            ← Quay lại danh sách
          </Link>
          <div className="flex flex-wrap justify-between gap-3 my-4">
            <div>
              <h1 className="text-2xl">{ticket.id}</h1>
              <p className="text-sm text-muted-foreground">{dateText(ticket.created)}</p>
            </div>
            <StatusBadge status={ticket.status} />
          </div>
          <div className={cn('grid gap-6', it && 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
            <div className="space-y-6">
              <Card className="ring-1! ring-border! p-6">
                <h2 className="text-lg">Thông tin sự cố</h2>
                <p className="text-sm text-muted-foreground">
                  {employee?.name} · {employee?.department}
                </p>
                <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
                {ticket.photos.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ticket.photos.map((photo, i) => (
                      <a key={photo} href={photo} target="_blank" rel="noreferrer">
                        <img
                          className="w-full max-h-80 object-contain border"
                          alt={`Ảnh sự cố ${i + 1}`}
                          src={photo}
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Không có ảnh đính kèm.</p>
                )}
                {ticket.method && (
                  <p className="text-sm">
                    Hình thức hỗ trợ: <strong>{ticket.method}</strong>
                  </p>
                )}
                {ticket.resolution && (
                  <div className="bg-muted p-4">
                    <h3>Kết quả xử lý</h3>
                    <p className="text-sm mt-2">{ticket.resolution}</p>
                  </div>
                )}
              </Card>
              <Card className="ring-1! ring-border! p-6">
                <h2 className="text-lg">Trao đổi với {it ? 'nhân viên' : 'IT'}</h2>
                {ticket.replies.length ? (
                  ticket.replies.map((r, i) => (
                    <div className="border-b pb-4" key={i}>
                      <div className="flex flex-wrap gap-2 justify-between text-xs text-muted-foreground">
                        <strong>{r.author}</strong>
                        <span>{dateText(r.date)}</span>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap break-words">{r.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có phản hồi. IT sẽ liên hệ khi tiếp nhận.
                  </p>
                )}
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reply.trim()) void action({ reply });
                  }}
                >
                  <Label htmlFor="reply">Thêm phản hồi</Label>
                  <Textarea
                    id="reply"
                    className="min-h-24 text-base"
                    value={reply}
                    maxLength={2000}
                    onChange={(e) => setReply(e.target.value)}
                    required
                    disabled={busy || (!demo && ticket.status === 'Đã đóng')}
                  />
                  <Button type="submit" className="min-h-11" disabled={busy || !reply.trim() || (!demo && ticket.status === 'Đã đóng')}>
                    {busy ? 'Đang lưu…' : 'Gửi phản hồi'}
                  </Button>
                </form>
              </Card>
            </div>
            <div className="space-y-6">
              {it && (
                <Card className="ring-1! ring-border! p-6">
                  <h2 className="text-lg">Xử lý yêu cầu</h2>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Tiếp nhận yêu cầu', status: 'Đã tiếp nhận' },
                      { label: 'Bắt đầu xử lý', status: 'Đang xử lý' },
                      { label: 'Chờ nhân viên phản hồi', status: 'Chờ phản hồi' },
                      { label: 'Đóng yêu cầu', status: 'Đã đóng' },
                    ].map((a) => (
                      <Button
                        key={a.label}
                        variant="outline"
                        className="min-h-11"
                        disabled={busy || a.status === ticket.status || (!demo && (ticket.status === 'Đã đóng' || (a.status === 'Đã đóng' && ticket.status !== 'Đã giải quyết')))}
                        onClick={() => void action({ status: a.status as Status })}
                      >
                        {a.label}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy || (!demo && ticket.status === 'Đã đóng')}
                      onClick={() => void action({ method: 'Từ xa', status: 'Đang xử lý' })}
                    >
                      Yêu cầu hỗ trợ từ xa
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy || (!demo && ticket.status === 'Đã đóng')}
                      onClick={() => void action({ method: 'Tại chỗ', status: 'Đang xử lý' })}
                    >
                      Ghi nhận hỗ trợ tại chỗ
                    </Button>
                  </div>
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (resolution.trim()) void action({ status: 'Đã giải quyết', resolution });
                    }}
                  >
                    <Label htmlFor="resolution">Kết quả xử lý</Label>
                    <Textarea
                      id="resolution"
                      required
                      value={resolution}
                      maxLength={2000}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Mô tả cách khắc phục…"
                    />
                    <Button
                      type="submit"
                      disabled={busy || !resolution.trim() || (!demo && ticket.status === 'Đã đóng')}
                      className="min-h-11 w-full"
                    >
                      Đánh dấu đã giải quyết
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ từ xa là ghi nhận hình thức hỗ trợ. IT sẽ liên hệ trước khi kết nối.
                  </p>
                </Card>
              )}
              <Card className="ring-1! ring-border! p-6">
                <h2 className="text-lg">Lịch sử trạng thái</h2>
                <ol className="space-y-4 border-l pl-4">
                  {ticket.history.map((event, i) => (
                    <li key={i}>
                      <p className="text-sm">{event.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{dateText(event.date)}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>
          {error && (
            <p className="text-destructive mt-4" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </DataState>
  );
}
export function Staff() {
  const { employees, toggleEmployee, demo } = useCare();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <CarePage>
      <Card className="py-5 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl">Nhân viên</h1>
          <p className="text-sm text-muted-foreground">{demo ? 'Danh sách tổng hợp · tài khoản mẫu' : 'Danh sách nhân viên được cấp quyền'}</p>
        </div>
      </Card>
      <StyleDivider />
      <DataState>
        <Card className="p-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {['Họ tên', 'Phòng ban', 'Vai trò', 'Tài khoản', 'Thao tác'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{e.name}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{e.role === 'it' ? 'IT' : 'Nhân viên'}</TableCell>
                  <TableCell>{e.active ? 'Hoạt động' : 'Tạm khóa'}</TableCell>
                  <TableCell>
                    {e.role !== 'it' && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError('');
                          try {
                            await toggleEmployee(e.id);
                          } catch {
                            setError('Không cập nhật được tài khoản. Vui lòng thử lại.');
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {demo ? (e.active ? 'Tạm khóa mẫu' : 'Kích hoạt mẫu') : (e.active ? 'Tạm khóa' : 'Kích hoạt')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </Card>
      </DataState>
    </CarePage>
  );
}
export function ItGate({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useCare();
  if (authLoading) return <Spinner />;
  return user?.role === 'it' ? <>{children}</> : <Navigate to="/it/login" replace />;
}
export default Inbox;
