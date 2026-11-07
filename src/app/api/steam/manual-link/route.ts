import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveSteamProfile } from "../../../../lib/steam";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let body: { profileUrl?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const resolved = await resolveSteamProfile(body.profileUrl || "");
  if (!resolved) return NextResponse.json({ error: "Steam profile not found. Use a public steamcommunity.com/id/... or /profiles/... link." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });
  const auth = createClient(url, anon);
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const db = createClient(url, service);
  const { data: existing, error: lookupError } = await db.from("profiles").select("id").eq("steam_id", resolved.steamId64).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not verify Steam account ownership." }, { status: 500 });
  if (existing && existing.id !== user.id) return NextResponse.json({ error: "This Steam account is already linked to another player." }, { status: 409 });
  const { error: updateError } = await db.from("profiles").update({ steam_id: resolved.steamId64, steam_linked_at: new Date().toISOString() }).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "Could not save Steam account. Check the profiles table migration." }, { status: 500 });
  return NextResponse.json({ steamId64: resolved.steamId64, name: resolved.name, profileUrl: resolved.profileUrl });
}
