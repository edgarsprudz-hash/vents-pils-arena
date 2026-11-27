import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { error: NextResponse.json({ error: "SMM service is not configured." }, { status: 503 }) };
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return { error: NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "SUPER_ADMIN") return { error: NextResponse.json({ error: "SuperAdmin access only." }, { status: 403 }) };
  return {};
}

export async function GET(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return NextResponse.json({
    connected: false,
    setupRequired: true,
    error: "Instagram connection is not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID to Vercel."
  }, { status: 503 });

  const version = (process.env.INSTAGRAM_GRAPH_VERSION || "v27.0").replace(/^v?/, "v");
  const base = `https://graph.instagram.com/${version}/`;
  async function get(path: string, params: Record<string, string>) {
    const url = new URL(base + path);
    Object.entries({ ...params, access_token: token as string }).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || "Instagram API request failed.");
    return data;
  }

  try {
    const [accountResult, insightsResult, mediaResult] = await Promise.allSettled([
      get(userId, { fields: "id,username,account_type,media_count,followers_count,follows_count" }),
      get(userId + "/insights", { metric: "reach,views,accounts_engaged,total_interactions,follower_count", period: "day" }),
      get(userId + "/media", { fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count", limit: "12" })
    ]);
    if (accountResult.status === "rejected") throw accountResult.reason;
    const account = accountResult.value;
    const insights = insightsResult.status === "fulfilled" ? insightsResult.value.data || [] : [];
    const media = mediaResult.status === "fulfilled" ? mediaResult.value.data || [] : [];
    const metricErrors = [
      ...(insightsResult.status === "rejected" ? [`Insights: ${insightsResult.reason instanceof Error ? insightsResult.reason.message : "unavailable"}`] : []),
      ...(mediaResult.status === "rejected" ? [`Media: ${mediaResult.reason instanceof Error ? mediaResult.reason.message : "unavailable"}`] : [])
    ];
    return NextResponse.json({
      connected: true,
      account: { username: account.username, accountType: account.account_type, followers: account.followers_count, following: account.follows_count, mediaCount: account.media_count },
      insights: insights.map((metric: any) => ({ name: metric.name, title: metric.title, period: metric.period, values: metric.values })),
      media,
      metricErrors,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram API request failed.";
    console.error("Instagram SMM integration failed:", message);
    return NextResponse.json({ connected: false, error: "Instagram connection failed. Check the token, account ID and Meta permissions." }, { status: 502 });
  }
}
