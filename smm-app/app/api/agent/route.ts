import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const systemPrompt = `Ты — VENTSPILS ARENA AI, собственный SMM- и аналитический агент турнирной платформы из Вентспилса, Латвия.
Твоя роль: работать как опытный SMM-стратег и аналитик. Помогай руководителю с Instagram, контент-стратегией, публикациями, коммуникацией, продвижением турниров, анализом статистики и планированием.
Контекст бренда: минималистичный визуальный стиль, матовый чёрный и красный, чистая композиция, без визуального шума. Официальный язык публикаций — латышский; также свободно поддерживай русский и английский.
Проект — платформа для турниров разных игр, не только CS2. Не выдумывай даты, цены, партнёров, результаты, статистику, места проведения или правила турниров. Отличай реальные данные от предположений. Если пользователь прислал метрики, анализируй только их; показывай формулы и ограничения, если рассчитываешь показатели. Давай конкретные, приоритизированные рекомендации, а не общие советы.
Не добавляй хэштеги и эмодзи без запроса. Не публикуй ничего самостоятельно, не отправляй сообщения и не утверждай, что что-либо опубликовано. Все материалы требуют подтверждения руководителя. Отвечай на языке последнего сообщения пользователя.`;

async function authorize(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
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

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    if (!apiKey) {
      return NextResponse.json({
        error: "Не добавлен GEMINI_API_KEY. Создай бесплатный ключ в Google AI Studio и добавь его в Vercel → Project → Settings → Environment Variables (Preview и Production)."
      }, { status: 503 });
    }

    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
      return NextResponse.json({ error: "Некорректная история диалога." }, { status: 400 });
    }

    const contents = body.messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 8000) }]
    })).filter((m: any) => m.parts[0].text.trim().length > 0);

    if (!contents.length || contents[contents.length - 1].role !== "user") {
      return NextResponse.json({ error: "Последнее сообщение должно быть от пользователя." }, { status: 400 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 1800,
          topP: 0.9
        }
      }),
      signal: AbortSignal.timeout(25000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error?.message || "Gemini API request failed.";
      const status = response.status === 429 ? 429 : response.status === 400 ? 400 : 502;
      return NextResponse.json({ error: message }, { status });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "Модель не вернула текст. Попробуй переформулировать запрос." }, { status: 502 });
    }

    return NextResponse.json({ text, model });
  } catch (e: any) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return NextResponse.json({ error: "Превышено время ожидания ответа ИИ. Попробуй ещё раз." }, { status: 504 });
    }
    return NextResponse.json({ error: e.message || "Ошибка агента." }, { status: 403 });
  }
}
