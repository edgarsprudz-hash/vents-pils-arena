import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.SMM_ADMIN_SECRET ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return !!expected && a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase server environment variables are missing." }, { status: 500 });

  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/instagram_accounts?select=instagram_user_id,username,account_type,is_active,token_expires_at,last_sync_at&order=created_at.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Could not read Instagram connection status." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ connected: rows.length > 0 && rows[0].is_active, account: rows[0] ?? null });
}
