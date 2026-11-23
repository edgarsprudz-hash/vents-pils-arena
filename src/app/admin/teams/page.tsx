"use client";
import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tournament = { id: string; title: string; game: string; format: string };
type Team = { id: string; tournament_id: string; team_name: string; captain_name: string; roster: any[]; status: string; created_at: string; tournaments?: { title: string } | null };

export default function TeamsAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState<Team[]>([]);
  const [events, setEvents] = useState<Tournament[]>([]);
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [captain, setCaptain] = useState("");
  const [players, setPlayers] = useState("");

  async function load() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    if (profile?.role !== "SUPER_ADMIN") { setMsg("ACCESS RESTRICTED"); return; }
    setOk(true);
    const [{ data: teams, error }, { data: tournaments }] = await Promise.all([
      supabase.from("tournament_registrations").select("id,tournament_id,team_name,captain_name,roster,status,created_at,tournaments(title)").order("created_at", { ascending: false }),
      supabase.from("tournaments").select("id,title,game,format").order("event_date", { ascending: false })
    ]);
    if (error) setMsg(error.message);
    else setRows((teams || []) as any);
    setEvents((tournaments || []) as Tournament[]);
    if (!eventId && tournaments?.length) setEventId(tournaments[0].id);
  }

  useEffect(() => { load(); }, []);

  async function addTeam(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !eventId) return;
    const roster = players.split("\n").map(x => x.trim()).filter(Boolean).map(nickname => ({ nickname }));
    setSaving(true); setMsg("");
    const { error } = await supabase.from("tournament_registrations").insert({
      tournament_id: eventId,
      user_id: null,
      team_name: teamName.trim(),
      captain_name: captain.trim(),
      roster,
      status: "REGISTERED"
    });
    if (error) setMsg(error.message);
    else {
      setMsg("TEAM ADDED TO TOURNAMENT.");
      setTeamName(""); setCaptain(""); setPlayers("");
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm("Delete this team entry permanently?")) return;
    const { error } = await supabase.from("tournament_registrations").delete().eq("id", id);
    setMsg(error?.message || "TEAM DELETED.");
    if (!error) await load();
  }

  return <main className="admin-page"><div className="admin-shell">
    <div className="admin-crumb"><Link href="/admin">ADMIN</Link> / TEAMS & PLAYERS</div>
    <div className="admin-heading"><div><span className="admin-eyebrow">COMMUNITY DATABASE / SUPER ADMIN</span><h1>TEAMS &<br/><em>PLAYERS.</em></h1><p>Create and manage tournament teams. No fixed team-count limit.</p></div></div>
    {!ok ? <p>{msg || "LOADING..."}</p> : <>
      <section className="admin-editor">
        <div className="admin-section-title"><div><span>MANUAL TEAM ENTRY</span><h2>ADD A TEAM</h2></div><small>SUPER ADMIN ONLY</small></div>
        <form className="admin-form" onSubmit={addTeam}>
          <label>TOURNAMENT<select required value={eventId} onChange={e => setEventId(e.target.value)}><option value="" disabled>SELECT TOURNAMENT</option>{events.map(t => <option key={t.id} value={t.id}>{t.title} — {t.game} / {t.format}</option>)}</select></label>
          <div className="admin-form-grid"><label>TEAM NAME<input required minLength={2} maxLength={40} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="TEAM NAME"/></label><label>CAPTAIN NAME<input required value={captain} onChange={e => setCaptain(e.target.value)} placeholder="CAPTAIN"/></label></div>
          <label>ROSTER / ONE PLAYER PER LINE<textarea rows={5} value={players} onChange={e => setPlayers(e.target.value)} placeholder={"Player 1\nPlayer 2\nPlayer 3"}/></label>
          <div className="admin-form-actions"><button disabled={saving || !events.length}>{saving ? "ADDING TEAM..." : "ADD TEAM ↗"}</button></div>
        </form>
      </section>
      <div className="admin-section-title"><div><span>TEAM DATABASE</span><h2>ALL TOURNAMENT TEAMS</h2></div><small>{rows.length} TEAMS</small></div>
      <div className="admin-list">{rows.map(r => <article className="admin-list-row" key={r.id}><div><small>{r.tournaments?.title || "TOURNAMENT"} / {r.status}</small><h3>{r.team_name}</h3><p>Captain: {r.captain_name} · {(r.roster || []).map((p: any) => p.nickname).join(", ")}</p></div><div className="admin-row-actions"><button className="admin-delete" onClick={() => remove(r.id)}>DELETE</button></div></article>)}{!rows.length && <div className="admin-empty">No teams yet.</div>}</div>
    </>}
    {msg && <p className="admin-feedback">{msg}</p>}
    <div className="admin-footer-actions"><Link href="/admin">← ADMIN CONTROL</Link><Link href="/teams">PUBLIC TEAMS ↗</Link></div>
  </div></main>;
}
