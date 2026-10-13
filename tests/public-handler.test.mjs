import test from "node:test";
import assert from "node:assert/strict";
import { intakeHandler } from "../supabase/functions/public-intake/handler.ts";
const envValues = {
  INTAKE_ORIGINS: "https://office.test",
  INTAKE_DEPARTMENTS: "Synthetic QA",
  TURNSTILE_SECRET_KEY: "synthetic-secret",
};
const env = (k) => envValues[k];
function request(overrides = {}, images = []) {
  const body = new FormData();
  for (
    const [k, v] of Object.entries({
      name: "Test Reporter",
      department: "Synthetic QA",
      location: "Desk QA",
      description: "Test incident",
      requestId: crypto.randomUUID(),
      token: "test-token",
      ...overrides,
    })
  ) body.append(k, v);
  for (const image of images) body.append("photos", image, "incident.png");
  return new Request("https://api.test/public-intake", {
    method: "POST",
    headers: { origin: "https://office.test" },
    body,
  });
}
function gateway() {
  const calls = [], objects = new Map();
  let submitted = false;
  return {
    calls,
    objects,
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "intake_precheck") return { data: true };
      if (name === "prepare_public_ticket") {
        return {
          data: {
            id: "test",
            submitted,
            attachments: args.p_files.map((_, position) => ({
              path: `public/test/${position}`,
              position,
            })),
          },
        };
      }
      if (name === "finalize_public_ticket") {
        submitted = true;
        return { data: "ITC-QA" };
      }
    },
    storage: {
      from: () => ({
        upload: async (path, bytes) => {
          if (objects.has(path)) return { error: { message: "duplicate" } };
          objects.set(path, new Blob([bytes]));
          return {};
        },
        download: async (path) => ({ data: objects.get(path) }),
      }),
    },
  };
}
const verify = async () =>
  Response.json({
    success: true,
    hostname: "office.test",
    action: "incident-report",
  });
test("handler returns only reference, private immutable images survive response-loss retries", async () => {
  const client = gateway(),
    handler = intakeHandler(client, env, verify),
    id = crypto.randomUUID();
  const image = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
    type: "image/png",
  });
  const first = await handler(
    request({ description: "", requestId: id }, [image]),
  );
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ticketNumber: "ITC-QA" });
  const retry = await handler(
    request({ description: "", requestId: id }, [image]),
  );
  assert.equal(retry.status, 200);
  assert.equal(
    client.calls.filter((c) => c.name === "prepare_public_ticket")[0].args
      .p_hash,
    client.calls.filter((c) => c.name === "prepare_public_ticket")[1].args
      .p_hash,
  );
  assert.equal(client.objects.size, 1);
});
test("bot failure, mismatched hostname/action and invalid fields create no reservation", async () => {
  for (
    const bot of [{ success: false }, {success:'true',hostname:'office.test',action:'incident-report'}, {
      success: true,
      hostname: "attacker.test",
      action: "incident-report",
    }, { success: true, hostname: "office.test", action: "other" }]
  ) {
    const client = gateway();
    const result = await intakeHandler(
      client,
      env,
      async () => Response.json(bot),
    )(request());
    assert.equal(result.status, 400);
    assert(!client.calls.some((c) => c.name === "prepare_public_ticket"));
  }
  const client = gateway();
  const result = await intakeHandler(client, env, verify)(
    request({ name: "" }),
  );
  assert.equal(result.status, 400);
  assert(!client.calls.some((c) => c.name === "prepare_public_ticket"));
});
test("rate and storage failures fail closed, unapproved origins are forbidden", async () => {
  const client = gateway();
  client.rpc = async () => ({ data: false });
  assert.equal(
    (await intakeHandler(client, env, verify)(request())).status,
    429,
  );
  const other = gateway();
  other.storage.from = () => ({
    upload: async () => ({ error: {} }),
    download: async () => ({ error: {} }),
  });
  const image = new Blob([new Uint8Array([255, 216, 255])], {
    type: "image/jpeg",
  });
  assert.equal(
    (await intakeHandler(other, env, verify)(request({}, [image]))).status,
    400,
  );
  assert(!other.calls.some((c) => c.name === "finalize_public_ticket"));
  assert.equal(
    (await intakeHandler(gateway(), env, verify)(
      new Request("https://api.test", {
        headers: { origin: "https://attacker.test" },
      }),
    )).status,
    403,
  );
});

test("malformed/bot/spoofed requests do not use verified office allowance", async () => {
  const client = gateway();
  let verifiedReservations = 0;
  const original = client.rpc;
  client.rpc = async (name, args) => {
    if (name === "prepare_public_ticket") verifiedReservations++;
    return original(name, args);
  };
  const rejectBot = async () => Response.json({ success: false });
  for (let i = 0; i < 20; i++) {
    const bad = request(i % 2 ? { token: "spoofed" } : { name: "" });
    bad.headers.set("x-forwarded-for", `192.0.2.${i}`);
    bad.headers.set("cf-connecting-ip", `198.51.100.${i}`);
    assert.equal(
      (await intakeHandler(client, env, rejectBot)(bad)).status,
      400,
    );
  }
  assert.equal(verifiedReservations, 0);
  assert.equal(
    (await intakeHandler(client, env, verify)(request())).status,
    200,
  );
  assert.equal(verifiedReservations, 1);
  assert(
    client.calls.filter((c) => c.name === "intake_precheck").every((c) =>
      c.args === undefined
    ),
  );
});
test("invalid images and failed verifier do not reserve; limiter errors fail closed", async () => {
  for (
    const verifier of [verify, async () => {
      throw new Error("verification offline");
    }]
  ) {
    const client = gateway();
    const result = await intakeHandler(client, env, verifier)(
      request({}, [new Blob(["spoofed"], { type: "image/png" })]),
    );
    assert.equal(result.status, 400);
    assert(!client.calls.some((c) => c.name === "prepare_public_ticket"));
  }
  const client = gateway();
  client.rpc = async () => ({ error: { message: "offline" } });
  assert.equal(
    (await intakeHandler(client, env, verify)(request())).status,
    503,
  );
});
test("cheap server checks precede body/DB work and capacity rejection reports retry", async () => {
  const client = gateway(), handler = intakeHandler(client, env, verify);
  assert.equal(
    (await handler(
      new Request("https://api.test", {
        method: "POST",
        headers: {
          origin: "https://office.test",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    )).status,
    415,
  );
  const huge = request();
  huge.headers.set("content-length", String(17 * 1024 * 1024));
  assert.equal((await handler(huge)).status, 413);
  assert.equal(client.calls.length, 0);
  const original = client.rpc;
  client.rpc = async (name, args) =>
    name === "prepare_public_ticket"
      ? { error: { message: "Intake capacity reached" } }
      : original(name, args);
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert(!client.calls.some((c) => c.name === "finalize_public_ticket"));
});
