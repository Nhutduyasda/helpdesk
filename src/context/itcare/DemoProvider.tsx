import { useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { getFetcher, postFetcher, putFetcher } from '@/api/global-fetcher';
import type { Employee, Incident } from '@/api/itcare/domain';

import { CareContext } from './context';
export default function DemoProvider({ children }: { children: ReactNode }) {
  const tickets = useSWR<Incident[]>('/api/itcare/tickets', getFetcher);
  const staff = useSWR<Employee[]>('/api/itcare/employees', getFetcher);
  const [user, setUser] = useState<Employee | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('itcare-session') || 'null');
    } catch {
      return null;
    }
  });
  const value: React.ContextType<typeof CareContext> = {
    demo: true,
    authLoading: false,
    authError: null,
    configurationError: null,
    tickets: tickets.data || [],
    employees: staff.data || [],
    loading: tickets.isLoading || staff.isLoading,
    error: tickets.error || staff.error,
    retry: () => {
      void tickets.mutate();
      void staff.mutate();
    },
    user,
    login: async (role, name, password) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!name.trim() || password !== 'demo123')
        throw new Error('Nhập tên đăng nhập và mật khẩu demo123.');
      const account = staff.data?.find((e) => e.role === role && e.active);
      if (!account) throw new Error('Chưa tải được tài khoản mẫu. Vui lòng thử lại.');
      setUser(account);
      sessionStorage.setItem('itcare-session', JSON.stringify(account));
      return account;
    },
    logout: async () => {
      setUser(null);
      sessionStorage.removeItem('itcare-session');
    },
    create: async (description, photos) => {
      const ticket = await postFetcher('/api/itcare/tickets', {
        description,
        photos,
        employeeId: user?.id,
      });
      await tickets.mutate();
      return ticket;
    },
    update: async (id, input) => {
      await putFetcher(`/api/itcare/tickets/${id}`, { ...input, author: user?.name });
      await tickets.mutate();
    },
    toggleEmployee: async (id) => {
      await putFetcher(`/api/itcare/employees/${id}`, {});
      await staff.mutate();
    },
  };
  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}
