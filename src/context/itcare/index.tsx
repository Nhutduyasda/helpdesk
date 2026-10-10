import { lazy, Suspense, type ReactNode } from 'react';
import { demoMode } from '@/integrations/supabase/client';
import RealProvider from './RealProvider';
import Spinner from '@/views/spinner/Spinner';
const Provider =
  import.meta.env.DEV && demoMode ? lazy(() => import('./DemoProvider')) : RealProvider;
export { useCare } from './context';
export function CareProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Spinner />}>
      <Provider>{children}</Provider>
    </Suspense>
  );
}
