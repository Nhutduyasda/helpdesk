import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCare } from '@/context/itcare';
import type { Incident, Status } from '@/api/itcare/data';
import { cn } from '@/lib/utils';
import StyleAwareWrapper from '@/components/shared/StyleAwareWrapper';
export function CarePage({ children }: { children: React.ReactNode }) {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
      defaultClassName="flex flex-col gap-4"
    >
      {children}
    </StyleAwareWrapper>
  );
}

export const dateText = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(date));
export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      className={cn(
        'whitespace-nowrap',
        status === 'Mới'
          ? 'bg-chart-4/12! text-chart-4!'
          : status === 'Đã giải quyết' || status === 'Đã đóng'
            ? 'bg-chart-2/12! text-chart-2!'
            : 'bg-primary/5! text-primary!',
      )}
    >
      {status}
    </Badge>
  );
}
export function Attribution() {
  return (
    <p className="text-xs text-muted-foreground text-center py-6">
      ITCare · Bản mẫu giao diện ·{' '}
      <a className="underline" href="https://shadcndashboard.dev/">
        Shadcn Dashboard
      </a>
    </p>
  );
}
export function DataState({ children }: { children: React.ReactNode }) {
  const { loading, error, retry } = useCare();
  if (loading)
    return (
      <Card className="ring-1! ring-border! p-6" role="status">
        Đang tải yêu cầu…
      </Card>
    );
  if (error)
    return (
      <Card className="ring-1! ring-border! p-6 space-y-4">
        <p role="alert">Không tải được dữ liệu. Vui lòng thử lại.</p>
        <Button onClick={retry}>Thử lại</Button>
      </Card>
    );
  return <>{children}</>;
}
export function TicketCards({ tickets }: { tickets: Incident[] }) {
  if (!tickets.length)
    return (
      <Card className="ring-1! ring-border! p-6 text-center">
        <h2>Chưa có yêu cầu</h2>
        <p className="text-muted-foreground mt-2">Yêu cầu bạn gửi sẽ xuất hiện ở đây.</p>
      </Card>
    );
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Link key={ticket.id} className="block" to={`/employee/requests/${ticket.id}`}>
          <Card className="ring-1! ring-border! p-4 gap-3 hover:bg-muted/50">
            <div className="flex justify-between gap-2">
              <span className="text-sm text-muted-foreground">{ticket.id}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <h3 className="break-words">{ticket.description}</h3>
            <p className="text-xs text-muted-foreground">{dateText(ticket.created)}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
