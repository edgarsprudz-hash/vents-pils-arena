import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { error: NextResponse.json({ error: "SMM service is not configured." }, { status: 503 }) };
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: "Session expired." }, { status: 401 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "SUPER_ADMIN") return { error: NextResponse.json({ error: "SuperAdmin only." }, { status: 403 }) };
  return { user };
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Claude не подключён: добавь ANTHROPIC_API_KEY в Environment Variables проекта Vercel." }, { status: 503 });
  try {
    const body = await request.json();
    const action = body.action === "analyze" ? "analyze" : "draft";
    const source = String(body.text || "").trim();
    if (source.length < 5 || source.length > 5000) return NextResponse.json({ error: "Добавь исходный текст или идею (5–5000 символов)." }, { status: 400 });
    const system = `Ты — SMM-менеджер VENTSPILS ARENA, киберспортивной платформы и организатора турниров в Вентспилсе, Латвия. Бренд: минималистичный, уверенный, современный; матовый чёрный и сдержанный красный. Не используй эмодзи, хештеги и пустые рекламные клише. Пиши на языке исходного текста; если язык неясен — на латышском. Не выдумывай даты, цены, призы, партнёров, статистику и ссылки. Если фактов не хватает, явно укажи, что нужно уточнить. Учитывай, что проект — платформа для турниров разных игр, не только CS2. ${action === "analyze" ? "Проанализируй текст публикации. Дай короткую оценку по ясности, силе первого предложения, CTA, соответствию бренду и конкретные улучшения. Не переписывай без необходимости." : "Подготовь готовый текст публикации для соцсетей. Сохрани проверяемые факты, усили начало и добавь ясный призыв к действию. Верни только текст поста и короткий заголовок."}`;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5", max_tokens: 1200, system, messages: [{ role: "user", content: source }] })
    });
    const result = await response.json();
    if (!response.ok) return NextResponse.json({ error: result?.error?.message || "Claude API request failed." }, { status: 502 });
    const output = Array.isArray(result.content) ? result.content.filter((part: {type:string}) => part.type === "text").map((part: {text:string}) => part.text).join("\\n") : "";
    if (!output) return NextResponse.json({ error: "Claude вернул пустой ответ." }, { status: 502 });
    return NextResponse.json({ text: output, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5" });
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с Claude." }, { status: 502 });
  }
}
