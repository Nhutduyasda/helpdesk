import { useEffect, useRef, useState, type ReactNode } from 'react';
import useSWR, { SWRConfig } from 'swr';
import type { Employee, Incident } from '@/api/itcare/domain';
import { supabase, configurationError } from '@/integrations/supabase/client';
import { supabaseGateway } from '@/integrations/supabase/gateway';
import { createCareService, mapProfile, type ProfileRow } from '@/services/itcare/service';
import { CareContext } from './context';

const gateway = supabase ? supabaseGateway(supabase) : null;
const service = gateway ? createCareService(gateway) : null;
async function profile(id: string): Promise<Employee> {
  if (!supabase) throw new Error(configurationError || 'Chưa cấu hình Supabase.');
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,department,role,active')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Chưa có hồ sơ được cấp quyền. Liên hệ quản trị IT.');
  const account = mapProfile(data as ProfileRow);
  if (!account.active) throw new Error('Tài khoản đã bị tạm khóa. Liên hệ quản trị IT.');
  return account;
}
export default function RealProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [authError, setAuthError] = useState<string | null>(null);
  const generation = useRef(0);
  const loadedIdentity = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    if (!supabase) return;
    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const current = ++generation.current;
      if (!session) {
        loadedIdentity.current = null;
        setUser(null);
        setAuthLoading(false);
        return;
      }
      // Keep SDK calls outside the synchronous Auth callback/lock.
      // Token refresh/focus events must not unmount an in-progress report form.
      if (loadedIdentity.current !== session.user.id) setAuthLoading(true);
      setTimeout(() => {
        void profile(session.user.id)
          .then((account) => {
            if (mounted.current && current === generation.current) {
              loadedIdentity.current = account.id;
              setUser(account);
              setAuthError(null);
            }
          })
          .catch(() => {
            if (mounted.current && current === generation.current) {
              loadedIdentity.current = null;
              setUser(null);
              setAuthError(
                'Phiên đăng nhập không còn quyền truy cập. Vui lòng đăng nhập lại hoặc liên hệ IT.',
              );
            }
          })
          .finally(() => {
            if (mounted.current && current === generation.current) setAuthLoading(false);
          });
      }, 0);
    });
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);
  async function login(role: 'employee' | 'it', email: string, password: string) {
    if (!supabase) throw new Error(configurationError || 'Chưa cấu hình Supabase.');
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) throw new Error('Email hoặc mật khẩu không đúng.');
    try {
      const account = await profile(data.user.id);
      if (role === 'it' && account.role !== 'it') throw new Error('Tài khoản không có quyền IT.');
      loadedIdentity.current = account.id;
      setUser(account);
      return account;
    } catch (err) {
      await supabase.auth.signOut({ scope: 'local' });
      throw err;
    }
  }
  async function logout() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error('Đăng xuất chưa thành công. Vui lòng thử lại.');
    }
    generation.current++;
    loadedIdentity.current = null;
    setUser(null);
    setAuthError(null);
  }
  return (
    <SWRConfig key={user?.id || 'signed-out'} value={{ provider: () => new Map() }}>
      <RealData
        user={user}
        authLoading={authLoading}
        authError={authError}
        login={login}
        logout={logout}
        invalidate={() => {
          generation.current++;
          loadedIdentity.current = null;
          setUser(null);
          setAuthError('Phiên đăng nhập hết hạn hoặc tài khoản bị tạm khóa.');
        }}
      >
        {children}
      </RealData>
    </SWRConfig>
  );
}
function RealData({
  children,
  user,
  authLoading,
  authError,
  login,
  logout,
  invalidate,
}: {
  children: ReactNode;
  user: Employee | null;
  authLoading: boolean;
  authError: string | null;
  login: (role: 'employee' | 'it', email: string, password: string) => Promise<Employee>;
  logout: () => Promise<void>;
  invalidate: () => void;
}) {
  const options = { refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true };
  const staff = useSWR(
    user ? ['itcare-profiles', user.id] : null,
    async () => {
      if (!gateway) return [];
      const profiles = (await gateway.profiles()).map(mapProfile);
      if (!profiles.find((p) => p.id === user?.id && p.active)) {
        invalidate();
        throw new Error('Tài khoản không còn quyền truy cập.');
      }
      return profiles;
    },
    options,
  );
  const tickets = useSWR(user ? ['itcare-tickets', user.id] : null, () => service!.list(), options);
  const creating = useRef(false);
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null);
  const value: React.ContextType<typeof CareContext> = {
    user,
    authLoading,
    authError,
    configurationError,
    demo: false,
    submissionProgress,
    employees: user ? staff.data || [] : [],
    tickets: user ? tickets.data || [] : [],
    loading: authLoading || (user !== null && (tickets.isLoading || staff.isLoading)),
    error: tickets.error || staff.error,
    retry: () => {
      void tickets.mutate();
      void staff.mutate();
    },
    login,
    logout,
    create: async (description, photos, requestId = crypto.randomUUID()) => {
      if (!service || !user) throw new Error('Đăng nhập để gửi yêu cầu.');
      if (creating.current) throw new Error('Yêu cầu đang được gửi.');
      creating.current = true;
      try {
        const created = await service.create(description, photos, requestId, setSubmissionProgress);
        const result: Incident = {
          id: created.ticket_number,
          databaseId: created.id,
          employeeId: created.employee_id || user.id,
          description: created.description || 'Sự cố được báo bằng ảnh',
          photos: [],
          created: created.created_at,
          status: 'Mới',
          history: [],
          replies: [],
        };
        await tickets.mutate(
          (current) => [result, ...(current || []).filter((t) => t.id !== result.id)],
          { revalidate: false },
        );
        void tickets.mutate();
        return result;
      } finally {
        creating.current = false;
        setSubmissionProgress(null);
      }
    },
    update: async (id, input, operationId = crypto.randomUUID()) => {
      const ticket = tickets.data?.find((t) => t.id === id);
      if (!ticket || !service) throw new Error('Không tìm thấy yêu cầu.');
      await service.update(ticket, input, operationId);
      await tickets.mutate();
    },
    toggleEmployee: async (id) => {
      const employee = staff.data?.find((e) => e.id === id);
      if (!employee || !gateway) throw new Error('Không tìm thấy nhân viên.');
      await gateway.setActive(id, !employee.active);
      await staff.mutate();
    },
  };
  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}
