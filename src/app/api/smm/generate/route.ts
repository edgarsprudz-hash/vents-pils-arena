import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { error: NextResponse.json({ error: "SMM service is not configured." }, { status: 503 }) };
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "SUPER_ADMIN") return { error: NextResponse.json({ error: "SuperAdmin access only." }, { status: 403 }) };
  return { db, user };
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add ANTHROPIC_API_KEY to Vercel Environment Variables to enable Claude." }, { status: 503 });
  try {
    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 500) : "";
    const objective = typeof body.objective === "string" ? body.objective.trim().slice(0, 500) : "";
    const format = ["POST", "STORY", "REEL"].includes(body.format) ? body.format : "POST";
    const language = ["lv", "ru", "en"].includes(body.language) ? body.language : "lv";
    if (topic.length < 3) return NextResponse.json({ error: "Enter a topic or campaign." }, { status: 400 });
    const langName = language === "lv" ? "Latvian" : language === "ru" ? "Russian" : "English";
    const prompt = [
      "You are CLAUDE SMM, the social media manager for VENTSPILS ARENA, an esports tournament platform in Ventspils, Latvia.",
      "Brand voice: confident, minimal, modern, precise. Avoid emojis, hashtags in the caption, exaggerated claims, generic AI phrasing and clutter.",
      "Write for Instagram. The requested language is " + langName + ".",
      "Never invent dates, prizes, partners, prices, registration links, tournament details, statistics or claims. If details are missing, use neutral wording and list missing facts in visual_brief.",
      "Return ONLY valid JSON with keys: title, caption, hashtags, visual_brief, recommended_time.",
      "hashtags should be a space-separated string, max 5 relevant tags. Caption should be ready to review, not claim publication.",
      "Format: " + format + ". Topic: " + topic + ". Objective: " + (objective || "Increase relevant awareness and engagement.") + ".",
      "Keep VENTSPILS ARENA's dark, restrained black-and-red visual identity in mind. No CS-only positioning; describe it as a tournament platform."
    ].join("\\n");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", max_tokens: 1100, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(30000)
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Claude SMM generation failed:", result?.error?.type || response.status);
      return NextResponse.json({ error: "Claude could not generate content. Check the Anthropic API key and model setting." }, { status: 502 });
    }
    const raw = Array.isArray(result.content) ? result.content.filter((x: any) => x.type === "text").map((x: any) => x.text).join("\\n") : "";
    const cleaned = raw.replace(/^```json\\s*/i, "").replace(/^```\\s*/i, "").replace(/\\s*```$/, "").trim();
    let draft: any;
    try { draft = JSON.parse(cleaned); } catch { return NextResponse.json({ error: "Claude returned an invalid draft. Please try again." }, { status: 502 }); }
    const fields = ["title", "caption", "hashtags", "visual_brief", "recommended_time"];
    if (fields.some(k => typeof draft[k] !== "string")) return NextResponse.json({ error: "Claude returned an incomplete draft." }, { status: 502 });
    const { data, error } = await access.db.from("smm_posts").insert({
      created_by: access.user.id, format, language, topic, objective,
      title: draft.title.slice(0, 180), caption: draft.caption.slice(0, 5000),
      hashtags: draft.hashtags.slice(0, 500), visual_brief: draft.visual_brief.slice(0, 2000),
      recommended_time: draft.recommended_time.slice(0, 160), status: "DRAFT"
    }).select("id,created_at,format,language,topic,objective,title,caption,hashtags,visual_brief,recommended_time,status").single();
    if (error || !data) {
      console.error("SMM draft save failed:", error?.message || "No row returned");
      return NextResponse.json({ error: "Draft generated but could not be saved." }, { status: 500 });
    }
    return NextResponse.json({ post: data });
  } catch {
    return NextResponse.json({ error: "Claude SMM request failed. Please try again." }, { status: 500 });
  }
}
