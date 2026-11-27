import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedRoles = new Set(["SUPER_ADMIN", "ORGANIZER"]);

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { error: NextResponse.json({ error: "Organizer service is not configured." }, { status: 503 }) };
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return { error: NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || !profile || !allowedRoles.has(profile.role)) {
    return { error: NextResponse.json({ error: "Organizer access only." }, { status: 403 }) };
  }
  return { db, user, role: profile.role };
}

export async function GET(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  const { data: tournaments, error: tournamentError } = await access.db
    .from("tournaments")
    .select("id,title,game,status,event_date,location")
    .not("status", "in", '("CANCELLED","DRAFT")')
    .order("event_date", { ascending: true, nullsFirst: false });
  if (tournamentError) return NextResponse.json({ error: tournamentError.message }, { status: 500 });
  if (!tournamentId) return NextResponse.json({ tournaments: tournaments || [], matches: [] });
  const { data: matches, error: matchError } = await access.db
    .from("tournament_matches")
    .select("id,tournament_id,round_number,match_number,bracket_type,group_number,team_a,team_b,winner_team,score_a,score_b,next_match_id,next_slot,status,map_name,scheduled_at")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });
  return NextResponse.json({ tournaments: tournaments || [], matches: matches || [] });
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if ("error" in access) return access.error;
  try {
    const body = await request.json();
    const matchId = typeof body.matchId === "string" ? body.matchId : "";
    const status = body.status;
    if (!matchId || !["SCHEDULED", "LIVE", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid match update." }, { status: 400 });
    }
    const { data: match, error: readError } = await access.db
      .from("tournament_matches")
      .select("id,tournament_id,bracket_type,team_a,team_b,winner_team,score_a,score_b,next_match_id,next_slot,status")
      .eq("id", matchId)
      .maybeSingle();
    if (readError || !match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
    if (!match.team_a || !match.team_b) return NextResponse.json({ error: "Both participants must be assigned on the website before the match can be started." }, { status: 409 });

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    let winner: string | null = match.winner_team;
    if (status === "COMPLETED") {
      const a = body.scoreA;
      const b = body.scoreB;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
        return NextResponse.json({ error: "Enter two whole, non-negative scores." }, { status: 400 });
      }
      if (match.bracket_type !== "GROUP" && a === b) {
        return NextResponse.json({ error: "A knockout match cannot finish in a draw." }, { status: 400 });
      }
      patch.score_a = a;
      patch.score_b = b;
      winner = a === b ? null : a > b ? match.team_a : match.team_b;
      patch.winner_team = winner;
    }
    const { error: updateError } = await access.db.from("tournament_matches").update(patch).eq("id", matchId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (status === "COMPLETED" && winner && match.next_match_id && match.next_slot) {
      const nextPatch = match.next_slot === "A" ? { team_a: winner } : { team_b: winner };
      const { error: nextError } = await access.db.from("tournament_matches")
        .update({ ...nextPatch, status: "SCHEDULED", winner_team: null, score_a: null, score_b: null, updated_at: new Date().toISOString() })
        .eq("id", match.next_match_id);
      if (nextError) return NextResponse.json({ error: "Result saved, but the next match could not be updated: " + nextError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, matchId, status, winner });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
