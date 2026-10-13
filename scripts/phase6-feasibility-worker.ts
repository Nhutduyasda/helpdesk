// Local-only probe. Never deploy: all dependencies below are synthetic.
import { intakeHandler } from '../supabase/functions/public-intake/handler.ts';

export default {
  async fetch(request: Request) {
    const calls: string[] = [];
    let files: { content_type: string; file_size: number; sha256: string }[] = [];
    const objects = new Map<string, number>();
    const client = {
      async rpc(name: string, args?: { p_files?: typeof files }) {
        calls.push(name);
        if (name === 'intake_precheck') return { data: true };
        if (name === 'prepare_public_ticket') {
          files = args?.p_files || [];
          return { data: { submitted: false, attachments: files.map((_, position) => ({ position, path: `synthetic/${position}` })) } };
        }
        return { data: 'ITC-LOCAL' };
      },
      storage: { from: () => ({
        async upload(path: string, bytes: Uint8Array) { objects.set(path, bytes.length); return {}; },
        async download() { return { error: { message: 'Synthetic download unavailable' } }; },
      }) },
    };
    const values: Record<string, string> = { INTAKE_ORIGINS: 'https://office.test', INTAKE_DEPARTMENTS: 'Synthetic QA', TURNSTILE_SECRET_KEY: 'synthetic-only' };
    const env = (key: string) => values[key];
    // Bundle erases the existing Supabase-only type; runtime surface is mocked.
    const handler = intakeHandler(client as never, env, async () => Response.json({ success: true, action: 'incident-report', hostname: 'office.test' }));
    const response = await handler(request);
    return Response.json({ status: response.status, receipt: await response.json(), calls, uploads: objects.size });
  },
};
