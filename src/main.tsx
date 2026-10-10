import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/css/globals.css';
import App from './App.tsx';
import Spinner from './views/spinner/Spinner.tsx';

import { ThemeProvider } from './context/shadcntheme/ThemeContext.tsx';
import { demoMode } from './integrations/supabase/client';

async function deferRender() {
  if (import.meta.env.DEV) {
    if (demoMode) {
      const { worker } = await import('./api/mocks/browser.ts');
      return worker.start({ onUnhandledRequest: 'bypass' });
    }
  }
  const registrations = await navigator.serviceWorker?.getRegistrations().catch(() => []);
  await Promise.all((registrations || []).filter(r => r.active?.scriptURL.endsWith('/mockServiceWorker.js')).map(r => r.unregister().catch(() => false)));
}

deferRender().then(() => {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/itcare-sw.js').catch(() => {
      console.warn('ITCare: chưa đăng ký được service worker. Ứng dụng vẫn có thể dùng khi có mạng.');
    });
  }
  createRoot(document.getElementById('root')!).render(
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Suspense fallback={<Spinner />}>
        <App />
      </Suspense>
    </ThemeProvider>,
  );
});
