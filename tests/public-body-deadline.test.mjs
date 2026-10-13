import test from "node:test";
import assert from "node:assert/strict";
import { boundedBody } from "../supabase/functions/public-intake/validation.ts";
test("stalled intake stream is cancelled when its server deadline expires", async () => {
  let cancelled = false;
  const controller = new AbortController();
  const request = new Request("https://office.test", {
    method: "POST",
    body: new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    duplex: "half",
  });
  const reading = boundedBody(request, controller.signal);
  controller.abort();
  await assert.rejects(reading, /body timeout/);
  assert.equal(cancelled, true);
});
