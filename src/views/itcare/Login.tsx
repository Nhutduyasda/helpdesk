import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCare } from '@/context/itcare';
import { Attribution } from './shared';

export default function Login() {
  const it = useLocation().pathname.startsWith('/it');
  const { login } = useCare();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent px-4">
      <Card className="w-full max-w-md border-none shadow-lg p-6">
        <div className="mx-auto text-xl font-semibold">ITCare</div>
        <div className="text-center">
          <h1 className="text-lg">{it ? 'Đăng nhập IT' : 'Chào mừng bạn'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {it ? 'Tiếp nhận và hỗ trợ sự cố văn phòng' : 'Báo sự cố, theo dõi hỗ trợ dễ dàng'}
          </p>
        </div>
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await login(it ? 'it' : 'employee', name, password);
              navigate(it ? '/it/inbox' : '/employee');
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập / email</Label>
            <Input
              className="min-h-11 text-base"
              id="username"
              autoComplete="username"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              className="min-h-11 text-base"
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full min-h-11" type="submit" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Đăng nhập mẫu: tên bất kỳ · mật khẩu <strong>demo123</strong>.{' '}
          {it ? 'Tài khoản IT Võ Đức Minh.' : 'Tài khoản Nguyễn Minh Anh.'}
        </p>
        <Link className="text-sm underline text-center" to={it ? '/login' : '/it/login'}>
          {it ? 'Dành cho nhân viên' : 'Dành cho IT'}
        </Link>
        <Attribution />
      </Card>
    </div>
  );
}
