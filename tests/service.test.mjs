import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareService, imageBlob } from '../src/services/itcare/service.ts';
import { validateConfiguration } from '../src/integrations/supabase/configuration.ts';

const photo =
  'data:image/png;base64,' + Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
const row = {
  id: 'uuid',
  ticket_number: 'ITC-1001',
  employee_id: 'employee',
  description: 'Printer',
  status: 'new',
  created_at: '2026-10-10',
  submitted_at: null,
};
test('upload failure never finalizes, retry reuses reservation and only metadata reaches database', async () => {
  let fail = true,
    finalized = 0;
  const requests = [],
    uploads = [];
  const gateway = {
    prepare: async (...args) => {
      requests.push(args);
      return row;
    },
    attachments: async () => [
      { ticket_id: 'uuid', storage_path: 'employee/uuid/random.png', position: 0 },
    ],
    upload: async (path, blob) => {
      uploads.push([path, blob]);
      if (fail) throw Error('network');
    },
    finalize: async () => {
      finalized++;
      return { ...row, submitted_at: 'now' };
    },
  };
  const service = createCareService(gateway);
  await assert.rejects(service.create(' Printer ', [photo], 'stable-request'), /network/);
  assert.equal(finalized, 0);
  fail = false;
  await service.create(' Printer ', [photo], 'stable-request');
  assert.equal(finalized, 1);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0][2][0].sha256.length, 64);
  assert.equal(requests[0][2][0].file_size, 9);
  assert.ok(!JSON.stringify(requests).includes('base64'));
  assert.ok(uploads[0][1] instanceof Blob);
});
test('already submitted retry skips uploads and finalization', async () => {
  const service = createCareService({ prepare: async () => ({ ...row, submitted_at: 'now' }) });
  assert.equal((await service.create('Printer', [], 'same')).ticket_number, 'ITC-1001');
});
test('file count, spoofed image bytes and invalid formats rejected before writes', async () => {
  let writes = 0;
  const service = createCareService({
    prepare: async () => {
      writes++;
      return row;
    },
  });
  await assert.rejects(service.create('', [], 'x'));
  await assert.rejects(service.create('x', Array(4).fill(photo), 'x'));
  await assert.rejects(imageBlob('data:image/png;base64,YWJj'), /Nội dung/);
  await assert.rejects(imageBlob('data:image/svg+xml;base64,YWJj'), /Định dạng/);
  assert.equal(writes, 0);
});
test('update uses database identity and stable internal status codes, never a browser actor', async () => {
  const calls = [];
  const service = createCareService({ change: async (...args) => calls.push(args) });
  await service.update(
    { databaseId: 'uuid', id: 'ITC-1001' },
    { status: 'Đang xử lý', method: 'Tại chỗ', reply: ' yes ' },
    'operation',
  );
  assert.deepEqual(calls, [
    ['uuid', 'operation', { status: 'in_progress', support_method: 'onsite', reply: 'yes' }],
  ]);
});
test('configuration rejects placeholders, insecure remote URLs and privileged JWTs', () => {
  assert.ok(validateConfiguration('', ''));
  assert.ok(
    validateConfiguration('https://YOUR_TEST_PROJECT.supabase.co', 'sb_publishable_REPLACE'),
  );
  assert.ok(validateConfiguration('http://remote.example', 'sb_publishable_safe'));
  const token =
    'e30.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.sig';
  assert.ok(validateConfiguration('https://example.supabase.co', token));
  assert.equal(validateConfiguration('https://example.supabase.co', 'sb_publishable_safe'), null);
});
