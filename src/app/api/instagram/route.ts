import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH_VERSION = "v24.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type GraphError = { message?: string; type?: string; code?: number };

async function graphGet(path: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.error) {
    const error = (data.error || {}) as GraphError;
    throw new Error(error.message || `Instagram API request failed (${response.status})`);
  }
  return data;
}

/**
 * Read-only Instagram connection check.
 * The access token stays server-side and is never returned to the browser.
 */
export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { connected: false, error: "INSTAGRAM_ACCESS_TOKEN is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const profile = await graphGet("me?fields=id,username", token);
    const media = await graphGet(
      `${encodeURIComponent(String(profile.id))}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url&limit=12`,
      token,
    );

    return NextResponse.json({
      connected: true,
      profile: {
        id: profile.id,
        username: profile.username,
      },
      media: media.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Instagram API request failed.",
      },
      { status: 502 },
    );
  }
}
