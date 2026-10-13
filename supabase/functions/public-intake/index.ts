import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { intakeHandler } from "./handler.ts";
const client = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
Deno.serve(intakeHandler(client, (key) => Deno.env.get(key)));
