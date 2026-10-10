import { createContext, useContext } from 'react';
import type { Employee, Incident, TicketChange } from '@/api/itcare/domain';
export type CareContext = {
  tickets: Incident[];
  employees: Employee[];
  loading: boolean;
  error: unknown;
  retry: () => void;
  user: Employee | null;
  authLoading: boolean;
  authError: string | null;
  configurationError: string | null;
  demo: boolean;
  login: (role: 'employee' | 'it', email: string, password: string) => Promise<Employee>;
  logout: () => Promise<void>;
  create: (description: string, photos: string[], requestId?: string) => Promise<Incident>;
  update: (id: string, input: TicketChange, operationId?: string) => Promise<void>;
  toggleEmployee: (id: string) => Promise<void>;
};
export const CareContext = createContext<CareContext | null>(null);
export function useCare() {
  const value = useContext(CareContext);
  if (!value) throw new Error('CareProvider missing');
  return value;
}
