import { NextRequest, NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.SMM_ADMIN_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.META_APP_ID;
  const redirectUri =
    process.env.META_REDIRECT_URI ??
    "https://ventspilsarena.lat/api/instagram/callback";

  if (!appId || !process.env.META_APP_SECRET || !(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SMM_ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Missing server configuration. Check META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const state = randomBytes(32).toString("hex");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_insights");
  url.searchParams.set("state", state);
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");

  const response = NextResponse.json({ authorization_url: url.toString() });
  response.cookies.set("va_instagram_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/instagram/callback",
    maxAge: 10 * 60,
  });
  return response;
}
