import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function resultPage(title: string, message: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;background:#090909;color:#f5f5f5;font:16px system-ui;display:grid;min-height:100vh;place-items:center"><main style="max-width:560px;padding:32px;border:1px solid #333;border-radius:16px"><h1>${title}</h1><p>${message}</p><p>You can close this window and return to VENTSPILS ARENA SMM.</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("va_instagram_oauth_state")?.value;
  const redirectUri =
    process.env.META_REDIRECT_URI ??
    "https://ventspilsarena.lat/api/instagram/callback";
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = (page: NextResponse) => {
    page.cookies.set("va_instagram_oauth_state", "", {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/api/instagram/callback", maxAge: 0,
    });
    return page;
  };

  if (params.get("error")) {
    return response(resultPage("Instagram connection cancelled", params.get("error_description") ?? "Instagram authorization was not completed.", 400));
  }
  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
    return response(resultPage("Instagram connection failed", "OAuth state validation failed. Start the connection again from the SMM admin panel.", 400));
  }
  if (!appId || !appSecret || !supabaseUrl || !serviceKey) {
    return response(resultPage("Server configuration incomplete", "Add the required Meta and Supabase server environment variables in Vercel, then redeploy.", 500));
  }

  try {
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
    const shortData = await shortResponse.json();
    if (!shortResponse.ok || !shortData.access_token || !shortData.user_id) {
      throw new Error(shortData.error_message ?? shortData.error?.message ?? "Instagram token exchange failed.");
    }

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortData.access_token);
    const longResponse = await fetch(longUrl, { cache: "no-store" });
    const longData = await longResponse.json();
    if (!longResponse.ok || !longData.access_token) {
      throw new Error(longData.error?.message ?? "Could not exchange the Instagram token for a long-lived token.");
    }

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "id,user_id,username,account_type,media_count");
    profileUrl.searchParams.set("access_token", longData.access_token);
    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.id) {
      throw new Error(profile.error?.message ?? "Could not read the Instagram professional account profile.");
    }

    const instagramUserId = String(profile.user_id ?? profile.id ?? shortData.user_id);
    const expiresAt = new Date(Date.now() + Number(longData.expires_in ?? 5184000) * 1000).toISOString();
    const dbResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/instagram_accounts?on_conflict=instagram_user_id`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "content-type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          instagram_user_id: instagramUserId,
          username: profile.username ?? null,
          access_token: longData.access_token,
          token_expires_at: expiresAt,
          account_type: profile.account_type ?? "BUSINESS",
          is_active: true,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );
    if (!dbResponse.ok) {
      const detail = await dbResponse.text();
      throw new Error(`Supabase save failed (${dbResponse.status}): ${detail.slice(0, 400)}`);
    }

    return response(resultPage("Instagram connected", `Successfully connected @${profile.username ?? "Instagram account"}. The account token has been saved securely on the server.`));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Instagram connection error.";
    return response(resultPage("Instagram connection failed", message, 500));
  }
}
