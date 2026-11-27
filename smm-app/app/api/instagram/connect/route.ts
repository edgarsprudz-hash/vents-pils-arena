import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Нужно войти в SMM Workspace." }, { status: 401 });
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false } });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Сессия истекла. Войди снова." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Доступ разрешён только SUPER_ADMIN." }, { status: 403 });

    const appId = process.env.META_APP_ID;
    const secret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;
    if (!appId || !secret || !redirectUri) return NextResponse.json({ error: "Добавь META_APP_ID, META_APP_SECRET и META_REDIRECT_URI в Vercel." }, { status: 503 });

    const payload = Buffer.from(JSON.stringify({ uid: user.id, exp: Date.now() + 10 * 60 * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    const state = payload + "." + signature;
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_insights");
    url.searchParams.set("state", state);
    return NextResponse.json({ url: url.toString() });
  } catch {
    return NextResponse.json({ error: "Не удалось начать подключение Instagram." }, { status: 500 });
  }
}
