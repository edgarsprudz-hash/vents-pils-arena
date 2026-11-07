import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });

  const auth = createClient(url, anon);
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const db = createClient(url, service);
  const { error } = await db.from("profiles")
    .update({ steam_id: null, steam_linked_at: null })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not unlink Steam account. Please try again." }, { status: 500 });

  return NextResponse.json({ success: true });
}
