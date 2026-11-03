import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

export async function GET(req: NextRequest) {
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL("/account?steam_error=" + encodeURIComponent(reason), req.url));
    response.cookies.delete("va_steam_state");
    return response;
  };

  const secret = process.env.STEAM_OPENID_SECRET;
  const raw = req.cookies.get("va_steam_state")?.value;
  if (!secret || !raw) return fail("Steam verification expired. Please try again.");

  const [payload, sig] = raw.split(".");
  const expected = createHmac("sha256", secret).update(payload || "").digest("base64url");
  if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return fail("Steam security check failed. Please try again.");
  }

  let state: { uid: string; exp: number };
  try { state = JSON.parse(Buffer.from(payload, "base64url").toString()); }
  catch { return fail("Invalid Steam verification state."); }
  if (!state.uid || state.exp < Date.now()) return fail("Steam verification expired. Please try again.");

  const callback = new URL("/api/steam/callback", req.url);
  const returnedTo = req.nextUrl.searchParams.get("openid.return_to") || "";
  let returnedUrl: URL;
  try { returnedUrl = new URL(returnedTo); } catch { return fail("Steam returned an invalid callback URL."); }
  if (returnedUrl.origin !== callback.origin || returnedUrl.pathname !== callback.pathname) {
    return fail("Steam callback address mismatch. Check the site's domain configuration.");
  }

  const claimed = req.nextUrl.searchParams.get("openid.claimed_id") || "";
  const identity = req.nextUrl.searchParams.get("openid.identity") || "";
  const match = claimed.match(/^https:\/\/steamcommunity\.com\/openid\/id\/([0-9]{17})\/?$/);
  if (!match || identity !== claimed) return fail("Steam did not return a valid account identity.");

  const params = new URLSearchParams(req.nextUrl.searchParams);
  params.set("openid.mode", "check_authentication");
  let verification: Response;
  try {
    verification = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });
  } catch {
    return fail("Could not contact Steam to verify your account. Try again.");
  }
  const verificationText = await verification.text();
  if (!verification.ok || !/is_valid:true/i.test(verificationText)) {
    return fail("Steam could not verify this login. Please retry the connection.");
  }

  const steamId = match[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return fail("Account storage is not configured.");

  const db = createClient(supabaseUrl, serviceKey);
  const { data: existing, error: lookupError } = await db
    .from("profiles").select("id").eq("steam_id", steamId).maybeSingle();
  if (lookupError) return fail("Could not check whether this Steam account is already linked.");
  if (existing && existing.id !== state.uid) return fail("This Steam account is already linked to another player.");

  const { data: updated, error: updateError } = await db
    .from("profiles")
    .update({ steam_id: steamId, steam_linked_at: new Date().toISOString() })
    .eq("id", state.uid)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) return fail("Could not save Steam account. Check the profiles table migration.");

  const response = NextResponse.redirect(new URL("/account?steam=linked", req.url));
  response.cookies.delete("va_steam_state");
  return response;
}
