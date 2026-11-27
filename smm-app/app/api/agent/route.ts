import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const systemPrompt = `Ты — внутренний AI-агент VENTSPILS ARENA, esports-платформы из Вентспилса, Латвия.
Твоя задача: помогать руководителю проекта с SMM, коммуникацией, контент-стратегией, публикациями и продвижением турниров.
Контекст бренда: минималистичный визуальный стиль, матовый чёрный и красный, чистая композиция, без визуального шума. Публикации официального аккаунта в первую очередь на латышском; также поддерживай русский и английский.
Пиши конкретно и профессионально. Не выдумывай даты, цены, партнёров, результаты, статистику, места проведения или правила турниров. Если фактов не хватает — задай короткий уточняющий вопрос или пометь неизвестное. Не добавляй хэштеги и эмодзи без запроса. Не публикуй ничего самостоятельно и не утверждай, что публикация отправлена. Все материалы требуют подтверждения руководителя.
Учитывай, что проект — платформа для турниров разных игр, а не только CS2.`;

async function authorize(req: NextRequest) {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !url || !serviceKey) throw new Error("Не настроена авторизация Supabase.");
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new Error("Сессия истекла. Войди снова.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "SUPER_ADMIN") throw new Error("Доступ разрешён только SUPER_ADMIN.");
}

export async function POST(req: NextRequest) {
  try {
    await authorize(req);
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    const model = process.env.AI_GATEWAY_MODEL;
    if (!gatewayKey || !model) {
      return NextResponse.json({ error: "AI-модель ещё не подключена. Следующий шаг — настроить AI Gateway и выбрать модель." }, { status: 503 });
    }
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
      return NextResponse.json({ error: "Некорректная история диалога." }, { status: 400 });
    }
    const messages = body.messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 8000)
    }));
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + gatewayKey },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.6 })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "AI Gateway request failed." }, { status: 502 });
    const text = data.choices?.[0]?.message?.content;
    if (!text) return NextResponse.json({ error: "Модель вернула пустой ответ." }, { status: 502 });
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Ошибка агента." }, { status: 403 });
  }
}
