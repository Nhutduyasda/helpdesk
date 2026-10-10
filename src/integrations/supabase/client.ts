import { createClient } from '@supabase/supabase-js';
import { validateConfiguration } from './configuration.ts';
export const demoMode = import.meta.env.DEV && import.meta.env.VITE_ITCARE_DEMO === 'true';
export const configurationError = validateConfiguration(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const supabase = configurationError
  ? null
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
