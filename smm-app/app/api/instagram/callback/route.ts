import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";

export const runtime = "nodejs";

function encrypt(value: string, secret: string) {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ventspils-arena-smm.vercel.app";
  const finish = (status: string) => NextResponse.redirect(new URL("/?instagram=" + encodeURIComponent(status), appUrl));
  try {
    const p = req.nextUrl.searchParams;
    if (p.get("error")) return finish("cancelled");
    const code = p.get("code");
    const state = p.get("state") || "";
    const secret = process.env.META_APP_SECRET || "";
    const redirectUri = process.env.META_REDIRECT_URI || "";
    const appId = process.env.META_APP_ID || "";
    if (!code || !state || !secret || !redirectUri || !appId) return finish("config_error");
    const [payload, signature] = state.split(".");
    const expected = createHmac("sha256", secret).update(payload || "").digest("base64url");
    if (!payload || !signature || signature.length !== expected.length || !Buffer.from(signature).equals(Buffer.from(expected))) return finish("invalid_state");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.uid || decoded.exp < Date.now()) return finish("expired_state");

    const form = new URLSearchParams({ client_id: appId, client_secret: secret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
    const exchange = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const shortToken = await exchange.json();
    if (!exchange.ok || !shortToken.access_token) return finish("token_exchange_failed");
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", secret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longRes = await fetch(longUrl);
    const longData = await longRes.json();
    if (!longRes.ok || !longData.access_token) return finish("long_token_failed");

    const meUrl = new URL("https://graph.instagram.com/v27.0/me");
    meUrl.searchParams.set("fields", "user_id,username");
    meUrl.searchParams.set("access_token", longData.access_token);
    const meRes = await fetch(meUrl);
    const me = await meRes.json();
    if (!meRes.ok || !me.user_id) return finish("profile_fetch_failed");

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false } });
    const { error } = await db.from("ig_connections").upsert({
      user_id: decoded.uid, ig_user_id: String(me.user_id), username: me.username || null,
      access_token_encrypted: encrypt(longData.access_token, secret),
      token_expires_at: new Date(Date.now() + Number(longData.expires_in || 5184000) * 1000).toISOString(),
      connected_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) return finish("database_error");
    return finish("connected");
  } catch {
    return finish("callback_error");
  }
}
