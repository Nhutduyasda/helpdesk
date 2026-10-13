export const MAX_BODY = 16 * 1024 * 1024;
export function validateFields(
  fields: Record<string, string>,
  departments: string[],
  count: number,
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(fields.requestId || "")
  ) throw new Error("request");
  if (
    !fields.name?.trim() || fields.name.trim().length > 120 ||
    !departments.includes(fields.department)
  ) throw new Error("identity");
  if (
    fields.location.length > 200 || fields.description.length > 2000 ||
    count > 3 || (!fields.description.trim() && !count) || !fields.token ||
    fields.token.length > 2048
  ) throw new Error("content");
}
export function validImage(type: string, b: Uint8Array) {
  if (!b.length || b.length > 5242880) return false;
  return type === "image/jpeg"
    ? b[0] === 255 && b[1] === 216 && b[2] === 255
    : type === "image/png"
    ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)
    : type === "image/webp" &&
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP";
}
export async function digest(bytes: BufferSource) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ).map((v) => v.toString(16).padStart(2, "0")).join("");
}
export async function boundedBody(
  request: Request,
  signal = AbortSignal.timeout(30000),
) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try {
    while (true) {
      if (signal.aborted) throw new Error("body timeout");
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error("body timeout");
      if (done) break;
      size += value.length;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new Error("size");
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}
