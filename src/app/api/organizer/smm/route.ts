import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { error: NextResponse.json({ error: "SMM service is not configured." }, { status: 503 }) };
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "CLAUDE SMM is available to SuperAdmin only." }, { status: 403 }) };
  }
  return { db, user };
}

export async function GET(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  const { data, error } = await access.db.from("smm_posts").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "Could not load SMM posts. Run the SMM database migration first." }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const caption = String(body.caption || "").trim();
    const platform = String(body.platform || "INSTAGRAM");
    const notes = String(body.notes || "").trim();
    if (title.length < 2 || title.length > 140 || caption.length > 5000 || notes.length > 2000) {
      return NextResponse.json({ error: "Check title, caption and notes lengths." }, { status: 400 });
    }
    if (!["INSTAGRAM", "FACEBOOK", "TIKTOK", "OTHER"].includes(platform)) return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
    const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;
    if (body.scheduled_at && Number.isNaN(scheduledAt?.getTime())) return NextResponse.json({ error: "Invalid schedule date." }, { status: 400 });
    const { data, error } = await access.db.from("smm_posts").insert({
      title, caption, platform, notes, scheduled_at: scheduledAt?.toISOString() || null,
      status: "DRAFT", created_by: access.user.id
    }).select("*").single();
    if (error) return NextResponse.json({ error: "Could not save post." }, { status: 500 });
    return NextResponse.json({ post: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const status = String(body.status || "");
    if (!id || !["DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid post update." }, { status: 400 });
    }
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "APPROVED") patch.approved_by = access.user.id;
    if (status === "PUBLISHED") patch.published_at = new Date().toISOString();
    if (typeof body.metrics === "object" && body.metrics !== null) {
      const metrics = body.metrics;
      patch.metrics = {
        reach: Math.max(0, Math.min(100000000, Number(metrics.reach) || 0)),
        likes: Math.max(0, Math.min(100000000, Number(metrics.likes) || 0)),
        comments: Math.max(0, Math.min(100000000, Number(metrics.comments) || 0)),
        shares: Math.max(0, Math.min(100000000, Number(metrics.shares) || 0))
      };
    }
    const { data, error } = await access.db.from("smm_posts").update(patch).eq("id", id).select("*").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Could not update post." }, { status: 500 });
    return NextResponse.json({ post: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
