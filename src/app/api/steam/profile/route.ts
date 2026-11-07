import { NextRequest, NextResponse } from "next/server";
import { resolveSteamProfile } from "../../../../lib/steam";

export async function GET(req: NextRequest) {
  const profileUrl = req.nextUrl.searchParams.get("profileUrl");
  if (profileUrl) {
    const resolved = await resolveSteamProfile(profileUrl);
    if (!resolved) return NextResponse.json({ error: "Steam profile could not be resolved." }, { status: 404 });
    return NextResponse.json(resolved, { headers: { "Cache-Control": "no-store" } });
  }
  const steamId = req.nextUrl.searchParams.get("steamId") || "";
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "Invalid Steam ID." }, { status: 400 });
  const resolved = await resolveSteamProfile(`https://steamcommunity.com/profiles/${steamId}/`);
  return NextResponse.json(resolved || { steamId64: steamId, name: null, profileUrl: `https://steamcommunity.com/profiles/${steamId}/` }, { headers: { "Cache-Control": "no-store" } });
}
