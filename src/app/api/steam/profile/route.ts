import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const steamId = req.nextUrl.searchParams.get("steamId") || "";
  if (!/^[0-9]{17}$/.test(steamId)) {
    return NextResponse.json({ error: "Invalid Steam ID." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
      headers: { "user-agent": "VENTSPILS ARENA profile lookup" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ name: null });
    const xml = await response.text();
    const match = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/i)
      || xml.match(/<steamID>(.*?)<\/steamID>/i);
    const name = match?.[1]?.trim() || null;
    return NextResponse.json({ name }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ name: null });
  }
}
