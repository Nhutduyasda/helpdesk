import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedBody,
  MAX_BODY,
  validateFields,
  validImage,
} from "../supabase/functions/public-intake/validation.ts";
const fields = {
  requestId: crypto.randomUUID(),
  name: "Test reporter",
  department: "Synthetic QA",
  location: "",
  description: "Test incident",
  token: "test-token",
};
test("public intake requires identity and description OR an image", () => {
  validateFields(fields, ["Synthetic QA"], 0);
  validateFields({ ...fields, description: "" }, ["Synthetic QA"], 1);
  for (
    const input of [
      { ...fields, name: "" },
      { ...fields, department: "Other" },
      { ...fields, description: "" },
      { ...fields, location: "x".repeat(201) },
    ]
  ) assert.throws(() => validateFields(input, ["Synthetic QA"], 0));
  assert.throws(() => validateFields(fields, ["Synthetic QA"], 4));
});
test("server rejects spoofed MIME, empty and oversized attachments", () => {
  assert(
    validImage("image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
  );
  assert(validImage("image/jpeg", new Uint8Array([255, 216, 255])));
  assert(validImage("image/webp", new TextEncoder().encode("RIFF1234WEBP")));
  assert(!validImage("image/png", new TextEncoder().encode("<script>")));
  assert(!validImage("image/svg+xml", new TextEncoder().encode("<svg/>")));
  assert(!validImage("image/jpeg", new Uint8Array(MAX_BODY)));
  assert(!validImage("image/jpeg", new Uint8Array()));
});
test("streaming body cap applies without Content-Length", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    body: new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(MAX_BODY + 1));
        c.close();
      },
    }),
    duplex: "half",
  });
  await assert.rejects(boundedBody(request), /size/);
});
