export async function resolveSteamProfile(raw: string): Promise<{ steamId64: string; name: string | null; profileUrl: string } | null> {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (url.protocol !== "https:" || !["steamcommunity.com", "www.steamcommunity.com"].includes(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !["id", "profiles"].includes(parts[0].toLowerCase())) return null;
  const kind = parts[0].toLowerCase();
  const value = parts[1];
  if (kind === "profiles" && !/^\d{17}$/.test(value)) return null;
  if (kind === "id" && !/^[a-zA-Z0-9_-]{2,64}$/.test(value)) return null;
  try {
    const xmlUrl = kind === "profiles"
      ? `https://steamcommunity.com/profiles/${value}/?xml=1`
      : `https://steamcommunity.com/id/${encodeURIComponent(value)}/?xml=1`;
    const response = await fetch(xmlUrl, { headers: { "user-agent": "VENTSPILS ARENA Steam profile verification" }, cache: "no-store" });
    if (!response.ok) return null;
    const xml = await response.text();
    const idMatch = xml.match(/<steamID64>(\d{17})<\/steamID64>/i);
    if (!idMatch) return null;
    const nameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/i) || xml.match(/<steamID>(.*?)<\/steamID>/i);
    const steamId64 = idMatch[1];
    return { steamId64, name: nameMatch?.[1]?.trim() || null, profileUrl: `https://steamcommunity.com/profiles/${steamId64}/` };
  } catch { return null; }
}
