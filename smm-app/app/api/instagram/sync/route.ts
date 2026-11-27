import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, createHash } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

function decrypt(value: string, secret: string) {
  const [iv, tag, data] = value.split(".");
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

async function graph(path: string, token: string) {
  const url = new URL("https://graph.instagram.com/v27.0/" + path);
  url.searchParams.set("access_token", token);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Instagram API error");
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!bearer) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false } });
    const { data: { user } } = await db.auth.getUser(bearer);
    if (!user) return NextResponse.json({ error: "Сессия истекла." }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Только SUPER_ADMIN." }, { status: 403 });
    const { data: connection, error } = await db.from("ig_connections").select("*").eq("user_id", user.id).maybeSingle();
    if (error || !connection) return NextResponse.json({ error: "Instagram ещё не подключён." }, { status: 404 });
    const token = decrypt(connection.access_token_encrypted, process.env.META_APP_SECRET || "");
    const profileData = await graph("me?fields=user_id,username,account_type,media.limit(50){id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count}", token);
    const media = profileData.media?.data || [];
    const records = [];
    for (const item of media) {
      let insights: any = {};
      const metricSet = item.media_product_type === "REELS"
        ? "views,reach,likes,comments,saved,shares,total_interactions"
        : "reach,likes,comments,saved,shares,total_interactions";
      try {
        const result = await graph(item.id + "/insights?metric=" + metricSet, token);
        for (const metric of result.data || []) insights[metric.name] = metric.values?.[0]?.value ?? metric.value ?? null;
      } catch { /* Metrics vary by media type and API access; retain media metadata. */ }
      records.push({
        user_id: user.id, media_id: item.id, caption: item.caption || null,
        media_type: item.media_type || null, media_product_type: item.media_product_type || null,
        permalink: item.permalink || null, published_at: item.timestamp || null,
        like_count: item.like_count ?? null, comments_count: item.comments_count ?? null,
        insights, synced_at: new Date().toISOString()
      });
    }
    if (records.length) {
      const { error: saveError } = await db.from("ig_media_insights").upsert(records, { onConflict: "user_id,media_id" });
      if (saveError) throw new Error("Не удалось сохранить статистику. Проверь SQL-таблицы Supabase.");
    }
    await db.from("ig_connections").update({ username: profileData.username || connection.username, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", user.id);
    return NextResponse.json({ username: profileData.username, synced: records.length, media: records });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Ошибка синхронизации Instagram." }, { status: 502 });
  }
}
