import { useRef, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate, useParams } from 'react-router';
import { Camera, Plus, House, List, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCare } from '@/context/itcare';
import LightDark from '@/layouts/full/vertical/header/Light-Dark';
import { Attribution, DataState, TicketCards, StatusBadge, dateText } from './shared';
import Spinner from '@/views/spinner/Spinner';

export function EmployeeLayout() {
  const { user, logout, authLoading } = useCare();
  const [logoutError, setLogoutError] = useState('');
  if (authLoading) return <Spinner />;
  if (!user || user.role !== 'employee') return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-xl mx-auto p-4 flex justify-between items-center">
          <Link className="font-semibold text-lg" to="/employee">
            ITCare
          </Link>
          <div className="flex items-center gap-2">
            <LightDark />
            <Button
              className="min-h-11 min-w-11"
              variant="ghost"
              aria-label="Đăng xuất"
              onClick={() => { void logout().catch(() => setLogoutError('Đăng xuất chưa thành công. Vui lòng thử lại.')); }}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto p-4 pb-24 space-y-6">
        {logoutError && <p role="alert" className="text-destructive">{logoutError}</p>}
        <Outlet />
        <Attribution />
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-10 flex justify-center gap-2 p-2">
        <Button className="min-h-11" variant="ghost" nativeButton={false} render={<Link to="/employee" />}>
          <House />
          Trang chủ
        </Button>
        <Button className="min-h-11" variant="ghost" nativeButton={false} render={<Link to="/employee/requests" />}>
          <List />
          Yêu cầu của tôi
        </Button>
      </nav>
    </div>
  );
}
export function Home() {
  const { user, tickets } = useCare();
  return (
    <>
      <div>
        <p className="text-sm text-muted-foreground">Xin chào, {user?.name}</p>
        <h1 className="text-2xl mt-1">Bạn cần IT hỗ trợ?</h1>
      </div>
      <Card className="ring-1! ring-border! p-6">
        <h2>Báo sự cố chỉ trong vài bước</h2>
        <p className="text-sm text-muted-foreground">Chụp ảnh hoặc mô tả ngắn. IT sẽ hỗ trợ bạn.</p>
        <Button className="min-h-14 w-full text-base" nativeButton={false} render={<Link to="/employee/report" />}>
          <Plus />
          Báo sự cố
        </Button>
      </Card>
      <div className="flex justify-between">
        <h2>Yêu cầu gần đây</h2>
        <Link className="underline text-sm" to="/employee/requests">
          Xem tất cả
        </Link>
      </div>
      <DataState>
        <TicketCards tickets={tickets.filter((t) => t.employeeId === user?.id).slice(0, 3)} />
      </DataState>
      <Card className="ring-1! ring-border! p-4">
        <h2>Sự cố khẩn cấp?</h2>
        <p className="text-sm text-muted-foreground">
          Liên hệ trực tiếp nhân viên IT tại văn phòng để được hỗ trợ ngay.
        </p>
        <Button variant="outline" className="min-h-11" nativeButton={false} render={<Link to="/employee/contact" />}>
          Thông tin liên hệ IT
        </Button>
      </Card>
    </>
  );
}
export function Contact() {
  const { demo } = useCare();
  return (
    <Card className="ring-1! ring-border! p-6">
      <h1>Liên hệ IT</h1>
      <p>{demo ? 'Võ Đức Minh · Nhân viên IT (tài khoản mẫu)' : 'Nhân viên IT tại văn phòng'}</p>
      <p className="text-sm text-muted-foreground">
        Với sự cố khẩn cấp, liên hệ trực tiếp IT tại văn phòng. Số điện thoại nội bộ sẽ được cấu
        hình trước giai đoạn thử nghiệm.
      </p>
      <Button className="min-h-11" nativeButton={false} render={<Link to="/employee/report" />}>
        Gửi yêu cầu hỗ trợ
      </Button>
    </Card>
  );
}
export function Requests() {
  const { user, tickets } = useCare();
  return (
    <>
      <h1 className="text-2xl">Yêu cầu của tôi</h1>
      <DataState>
        <TicketCards tickets={tickets.filter((t) => t.employeeId === user?.id)} />
      </DataState>
    </>
  );
}
export function Report() {
  const requestId = useRef(crypto.randomUUID());
  const submissionLock = useRef(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const { user, create } = useCare();
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  async function select(files: FileList | null) {
    if (!files) return;
    setError('');
    const picked = Array.from(files);
    if (
      picked.length + photos.length > 3 ||
      picked.some(
        (f) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024,
      )
    ) {
      setError('Chọn tối đa 3 ảnh JPG, PNG hoặc WebP; mỗi ảnh không quá 5 MB.');
      return;
    }
    setReading(true);
    try {
      const images = await Promise.all(
        picked.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      requestId.current = crypto.randomUUID();
      setPhotos((previous) => [...previous, ...images]);
    } catch {
      setError('Không đọc được ảnh. Vui lòng chọn lại.');
    } finally {
      setReading(false);
    }
  }
  return (
    <>
      <div>
        <h1 className="text-2xl">Báo sự cố</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Thêm ảnh hoặc viết vài dòng về vấn đề bạn gặp.
        </p>
      </div>
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (submissionLock.current) return;
          if (!description.trim() && !photos.length) {
            setError('Vui lòng thêm ảnh hoặc mô tả sự cố.');
            return;
          }
          submissionLock.current = true;
          setBusy(true);
          setError('');
          try {
            const ticket = await create(description, photos, requestId.current);
            navigate(`/employee/submitted/${ticket.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Chưa gửi được yêu cầu. Nội dung vẫn được giữ lại, vui lòng thử lại.');
          } finally {
            setBusy(false);
            submissionLock.current = false;
          }
        }}
      >
        <Card className="ring-1! ring-border! p-4">
          <Label htmlFor="photos">Ảnh sự cố</Label>
          <p className="text-sm text-muted-foreground">Tối đa 3 ảnh · JPG, PNG, WebP · 5 MB/ảnh</p>
          <div className="border border-dashed p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                disabled={busy || reading}
                onClick={() => camera.current?.click()}
              >
                <Camera />
                Chụp ảnh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                disabled={busy || reading}
                onClick={() => gallery.current?.click()}
              >
                Chọn ảnh
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ảnh lỗi hoặc thiết bị sẽ giúp IT hiểu vấn đề.
            </p>
            <input
              ref={camera}
              aria-label="Chụp ảnh sự cố"
              id="camera"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={busy || reading}
              onChange={(e) => {
                void select(e.target.files);
                e.target.value = '';
              }}
              className="sr-only"
            />
            <input
              ref={gallery}
              aria-label="Chọn ảnh có sẵn"
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy || reading}
              onChange={(e) => {
                void select(e.target.files);
                e.target.value = '';
              }}
              className="sr-only"
            />
          </div>
          {reading && <p role="status">Đang đọc ảnh…</p>}
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, i) => (
              <div key={photo} className="space-y-2">
                <img
                  className="w-full h-32 object-contain border"
                  src={photo}
                  alt={`Ảnh sự cố ${i + 1}`}
                />
                <Button
                  type="button"
                  disabled={busy}
                  variant="outline"
                  className="min-h-11"
                  onClick={() => { requestId.current = crypto.randomUUID(); setPhotos(photos.filter((_, j) => i !== j)); }}
                >
                  Xóa ảnh {i + 1}
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-2">
          <Label htmlFor="description">Mô tả (không bắt buộc nếu có ảnh)</Label>
          <Textarea
            id="description"
            className="min-h-32 text-base"
            maxLength={2000}
            placeholder="Ví dụ: Máy in không in được từ sáng nay…"
            value={description}
            onChange={(e) => { requestId.current = crypto.randomUUID(); setDescription(e.target.value); }}
            disabled={busy}
          />
        </div>
        <Card className="ring-1! ring-border! p-4">
          <p className="font-medium">Người gửi: {user?.name}</p>
          <p className="text-sm text-muted-foreground">
            {user?.department} · IT sẽ liên hệ với bạn
          </p>
        </Card>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || reading} className="w-full min-h-12">
          {busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu'}
        </Button>
      </form>
    </>
  );
}
export function Submitted() {
  const { id } = useParams();
  const { tickets, user } = useCare();
  const ticket = tickets.find((t) => t.id === id && t.employeeId === user?.id);
  return (
    <DataState>
      {ticket ? (
        <Card className="ring-1! ring-border! p-6 text-center">
          <h1 className="text-2xl">Đã gửi yêu cầu</h1>
          <p>IT sẽ tiếp nhận và liên hệ với bạn.</p>
          <strong>{ticket.id}</strong>
          <p className="text-sm text-muted-foreground">{dateText(ticket.created)}</p>
          <div>
            <StatusBadge status={ticket.status} />
          </div>
          <Button className="min-h-11" nativeButton={false} render={<Link to={`/employee/requests/${ticket.id}`} />}>
            Xem chi tiết yêu cầu
          </Button>
          <Button variant="outline" className="min-h-11" nativeButton={false} render={<Link to="/employee" />}>
            Về trang chủ
          </Button>
        </Card>
      ) : (
        <p>Không tìm thấy yêu cầu đã gửi.</p>
      )}
    </DataState>
  );
}
export default EmployeeLayout;
