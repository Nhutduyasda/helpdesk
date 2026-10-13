import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";
import {
  boundedBody,
  digest,
  MAX_BODY,
  validateFields,
  validImage,
} from "./validation.ts";

export function intakeHandler(
  client: SupabaseClient,
  env: (key: string) => string | undefined,
  verify: typeof fetch = fetch,
) {
  return async (request: Request) => {
    const origin = request.headers.get("origin") || "";
    const allowed = (env("INTAKE_ORIGINS") || "").split("|");
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    };
    const reply = (data: unknown, status = 200) =>
      Response.json(data, {
        status,
        headers: status === 429 ? { ...headers, "Retry-After": "60" } : headers,
      });
    if (!origin || !allowed.includes(origin)) {
      return new Response("Forbidden", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") return reply({ error: "method" }, 405);
    const secret = env("TURNSTILE_SECRET_KEY");
    const departments = (env("INTAKE_DEPARTMENTS") || "").split("|").filter(
      Boolean,
    );
    if (!secret || !departments.length) {
      return reply({ error: "unavailable" }, 503);
    }
    try {
      // Header values cannot define identity or increase any rate allowance.
      if (
        !/^multipart\/form-data;\s*boundary=/i.test(
          request.headers.get("content-type") || "",
        )
      ) return reply({ error: "content_type" }, 415);
      const length = request.headers.get("content-length");
      if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) {
        return reply({ error: "size" }, 413);
      }
      const limit = await client.rpc("intake_precheck");
      if (limit.error || limit.data !== true) {
        return reply(
          { error: limit.error ? "unavailable" : "rate" },
          limit.error ? 503 : 429,
        );
      }
      const raw = await boundedBody(request);
      const form = await new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": request.headers.get("content-type") || "" },
        body: raw,
      }).formData();
      const fields: Record<string, string> = {};
      for (
        const name of [
          "name",
          "department",
          "location",
          "description",
          "requestId",
          "token",
        ]
      ) {
        const values = form.getAll(name);
        if (values.length !== 1 || typeof values[0] !== "string") {
          throw new Error("fields");
        }
        fields[name] = values[0].trim();
      }
      if (
        Array.from(form.keys()).some((k) =>
          ![
            "name",
            "department",
            "location",
            "description",
            "requestId",
            "token",
            "photos",
          ].includes(k)
        )
      ) throw new Error("fields");
      const photos = form.getAll("photos");
      validateFields(fields, departments, photos.length);
      const verification = await verify(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({ secret, response: fields.token }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const bot = await verification.json();
      if (
        !verification.ok || bot.success !== true || bot.action !== "incident-report" ||
        bot.hostname !== new URL(origin).hostname
      ) return reply({ error: "verification" }, 400);
      const blobs: { bytes: Uint8Array; type: string }[] = [];
      const manifest = [];
      for (const photo of photos) {
        if (!(photo instanceof File) || photo.size > 5242880) {
          throw new Error("image");
        }
        const bytes = new Uint8Array(await photo.arrayBuffer());
        if (!validImage(photo.type, bytes)) throw new Error("image");
        blobs.push({ bytes, type: photo.type });
        manifest.push({
          content_type: photo.type,
          file_size: bytes.length,
          sha256: await digest(bytes),
        });
      }
      const hash = await digest(
        new TextEncoder().encode(
          JSON.stringify([
            fields.name,
            fields.department,
            fields.location,
            fields.description,
            manifest,
          ]),
        ),
      );
      const reservation = await client.rpc("prepare_public_ticket", {
        p_request_id: fields.requestId,
        p_hash: hash,
        p_name: fields.name,
        p_department: fields.department,
        p_location: fields.location,
        p_description: fields.description,
        p_files: manifest,
      });
      if (reservation.error?.message === "Intake capacity reached") {
        return reply({ error: "rate" }, 429);
      }
      if (reservation.error) throw new Error("reservation");
      const ticket = reservation.data;
      if (!ticket.submitted) {
        for (const a of ticket.attachments) {
          const blob = blobs[a.position];
          const upload = await client.storage.from("incident-photos").upload(
            a.path,
            blob.bytes,
            { contentType: blob.type, upsert: false },
          );
          if (upload.error) {
            // Never trust a duplicate status alone: verify immutable bytes on retry.
            const existing = await client.storage.from("incident-photos")
              .download(a.path);
            if (
              existing.error || !existing.data ||
              await digest(await existing.data.arrayBuffer()) !==
                manifest[a.position].sha256
            ) throw new Error("upload");
          }
        }
      }
      const receipt = await client.rpc("finalize_public_ticket", {
        p_request_id: fields.requestId,
        p_hash: hash,
      });
      if (receipt.error) throw new Error("finalize");
      return reply({ ticketNumber: receipt.data });
    } catch {
      return reply({ error: "submission_failed" }, 400);
    }
  };
}
