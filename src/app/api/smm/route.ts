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
  if (error || !user) return { error: NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "SUPER_ADMIN") return { error: NextResponse.json({ error: "SuperAdmin access only." }, { status: 403 }) };
  return { db, user };
}

export async function GET(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  const { data, error } = await access.db.from("smm_posts")
    .select("id,created_at,format,language,topic,objective,title,caption,hashtags,visual_brief,recommended_time,status,approved_at,published_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Could not load content queue." }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const action = body.action;
    if (!id || !["APPROVE", "REJECT", "REQUEST_APPROVAL"].includes(action)) {
      return NextResponse.json({ error: "Invalid content action." }, { status: 400 });
    }
    const { data: post, error: readError } = await access.db.from("smm_posts").select("id,status").eq("id", id).maybeSingle();
    if (readError || !post) return NextResponse.json({ error: "Content item not found." }, { status: 404 });
    if (action === "APPROVE") {
      const { error } = await access.db.from("smm_posts").update({ status: "APPROVED", approved_by: access.user.id, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) return NextResponse.json({ error: "Could not approve this item." }, { status: 500 });
      return NextResponse.json({ success: true, status: "APPROVED", note: "Approved and ready for publishing integration. It has not been posted to Instagram." });
    }
    const status = action === "REJECT" ? "REJECTED" : "PENDING_APPROVAL";
    const { error } = await access.db.from("smm_posts").update({ status, approved_by: null, approved_at: null }).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not update this item." }, { status: 500 });
    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
