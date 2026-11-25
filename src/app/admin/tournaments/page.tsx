"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tournament = { id: string; title: string; game: string; description: string; event_date: string | null; location: string; status: string; format: string };\ntype Match = { id:string; tournament_id:string; round_number:number; match_number:number; team_a:string|null; team_b:string|null; winner_team:string|null; score_a:number|null; score_b:number|null; next_match_id:string|null; next_slot:"A"|"B"|null; status:string; cybershoke_url?:string|null; map_name?:string|null };
const blank = { title: "", game: "CS2", description: "", event_date: "", location: "Ventspils, Latvia", status: "DRAFT", format: "5v5", platform: "PS5", game_version: "EA SPORTS FC 26", entry_fee_online: "5", entry_fee_onsite: "10", club_selection: "FREE" };

export default function AdminTournamentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Tournament[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);\n  const [bracketTournament,setBracketTournament]=useState<Tournament|null>(null);\n  const [bracketMatches,setBracketMatches]=useState<Match[]>([]);\n  const [bracketTeams,setBracketTeams]=useState<{team_name:string}[]>([]);\n  const [bracketScores,setBracketScores]=useState<Record<string,{a:string;b:string}>>({});\n  const [bracketBusy,setBracketBusy]=useState(false);

  async function load() {
    if (!supabase) { setMessage("Supabase is not configured."); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    if (profile?.role !== "SUPER_ADMIN") { setLoading(false); setAllowed(false); return; }
    setAllowed(true);
    const { data, error } = await supabase.from("tournaments").select("*").order("event_date", { ascending: true });
    if (error) setMessage("Database setup required: run the migration SQL from the project repository in Supabase SQL Editor.");
    else setItems(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function edit(item: Tournament) {
    setEditing(item.id);
    setForm({ ...blank, title: item.title, game: item.game, description: item.description, event_date: item.event_date ? item.event_date.slice(0,16) : "", location: item.location, status: item.status, format: item.format, platform: (item as any).platform || "PS5", game_version: (item as any).game_version || "EA SPORTS FC 26", entry_fee_online: String((item as any).entry_fee_online ?? 5), entry_fee_onsite: String((item as any).entry_fee_onsite ?? 10), club_selection: (item as any).club_selection || "FREE" });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setEditing(null); setForm(blank); }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true); setMessage("");
    const payload = { ...form, format: form.game === "EA SPORTS FC" ? "1v1" : form.format, entry_fee_online: form.game === "EA SPORTS FC" ? Number(form.entry_fee_online) : null, entry_fee_onsite: form.game === "EA SPORTS FC" ? Number(form.entry_fee_onsite) : null, platform: form.game === "EA SPORTS FC" ? form.platform : null, game_version: form.game === "EA SPORTS FC" ? form.game_version : null, club_selection: form.game === "EA SPORTS FC" ? form.club_selection : null, event_date: form.event_date ? new Date(form.event_date).toISOString() : null, updated_at: new Date().toISOString() };
    const result = editing
      ? await supabase.from("tournaments").update(payload).eq("id", editing)
      : await supabase.from("tournaments").insert(payload);
    if (result.error) setMessage(result.error.message);
    else { setMessage(editing ? "Tournament updated." : "Tournament created."); reset(); await load(); }
    setSaving(false);
  }
  async function openBracket(item:Tournament){setBracketTournament(item);setBracketMatches([]);setBracketScores({});setBracketBusy(true);const [m,t]=await Promise.all([supabase!.from("tournament_matches").select("*").eq("tournament_id",item.id).order("round_number").order("match_number"),supabase!.from("tournament_registrations").select("team_name").eq("tournament_id",item.id).eq("status","REGISTERED").order("created_at")]);if(m.error)setMessage(m.error.message);else setBracketMatches((m.data||[]) as Match[]);setBracketTeams(t.data||[]);setBracketBusy(false);}
  async function createBracket(){if(!supabase||!bracketTournament)return;const names=bracketTeams.map(x=>x.team_name).filter(Boolean);if(names.length<2){setMessage("At least two registered participants are required.");return;}if(bracketMatches.length){setMessage("A bracket already exists. Reset it first.");return;}let size=1;while(size<names.length)size*=2;const padded=[...names,...Array(size-names.length).fill(null)];const total=Math.log2(size);const rows:any[]=[];for(let r=1;r<=total;r++)for(let m=1;m<=size/Math.pow(2,r);m++)rows.push({tournament_id:bracketTournament.id,round_number:r,match_number:m,bracket_type:"MAIN",team_a:r===1?padded[(m-1)*2]:null,team_b:r===1?padded[(m-1)*2+1]:null,winner_team:null,score_a:null,score_b:null,next_match_id:null,next_slot:null,status:"SCHEDULED"});const {data,error}=await supabase.from("tournament_matches").insert(rows).select("*");if(error){setMessage(error.message);return;}const created=(data||[]) as Match[];for(const m of created.filter(x=>x.round_number<total)){const next=created.find(x=>x.round_number===m.round_number+1&&x.match_number===Math.ceil(m.match_number/2));await supabase.from("tournament_matches").update({next_match_id:next?.id||null,next_slot:m.match_number%2?"A":"B"}).eq("id",m.id);}await openBracket(bracketTournament);}
  async function updateMatch(match:Match,patch:Record<string,any>){if(!supabase)return;const {error}=await supabase.from("tournament_matches").update({...patch,updated_at:new Date().toISOString()}).eq("id",match.id);if(error){setMessage(error.message);return;}if(patch.winner_team&&match.next_match_id&&match.next_slot){const nextPatch=match.next_slot==="A"?{team_a:patch.winner_team}:{team_b:patch.winner_team};await supabase.from("tournament_matches").update({...nextPatch,status:"SCHEDULED",winner_team:null,score_a:null,score_b:null}).eq("id",match.next_match_id);}await openBracket(bracketTournament!);}
  async function resetInlineBracket(){if(!supabase||!bracketTournament||!window.confirm("Удалить сетку и результаты? Список участников останется."))return;const {error}=await supabase.from("tournament_matches").delete().eq("tournament_id",bracketTournament.id);if(error){setMessage(error.message);return;}await supabase.from("tournament_results").delete().eq("tournament_id",bracketTournament.id);setBracketMatches([]);setBracketScores({});}
  async function saveInlineScore(m:Match){const v=bracketScores[m.id]||{a:String(m.score_a??""),b:String(m.score_b??"")};const a=Number(v.a),b=Number(v.b);if(v.a===""||v.b===""||!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b){setMessage("Введите целые неотрицательные счета. Ничья в плей-офф не допускается.");return;}await updateMatch(m,{score_a:a,score_b:b,winner_team:a>b?m.team_a:m.team_b,status:"COMPLETED"});}
  async function remove(id: string) {
    if (!supabase || !window.confirm("Delete this tournament permanently?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    setMessage(error ? error.message : "Tournament deleted.");
    if (!error) await load();
  }

  if (loading) return <main className="admin-page"><div className="admin-loading">LOADING TOURNAMENT CONTROL...</div></main>;
  if (!allowed) return <main className="admin-page"><div className="admin-denied"><h1>ACCESS RESTRICTED.</h1><Link href="/account">BACK TO ACCOUNT ↗</Link></div></main>;

  return <main className="admin-page"><div className="admin-shell">
    <div className="admin-crumb"><Link href="/">HOME</Link><b>/</b><Link href="/admin">ADMIN</Link><b>/</b> TOURNAMENTS</div>
    <div className="admin-heading"><div><span className="admin-eyebrow">VENTSPILS ARENA / MANAGEMENT</span><h1>TOURNAMENT<br/><em>CONTROL.</em></h1><p>Create, edit and manage competition events.</p></div><div className="admin-emblem"><span>VA</span><small>EVENTS</small></div></div>
    <section className="admin-editor">
      <div className="admin-section-title"><div><span>{editing ? "EDIT EVENT" : "NEW EVENT"}</span><h2>{editing ? "UPDATE TOURNAMENT" : "CREATE TOURNAMENT"}</h2></div><small>DATABASE / SUPABASE</small></div>
      <form className="admin-form" onSubmit={submit}>
        <label>TOURNAMENT NAME<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. VENTSPILS ARENA WINTER CUP"/></label>
        <div className="admin-form-grid">
          <label>GAME<select required value={form.game} onChange={e=>setForm({...form,game:e.target.value,format:e.target.value==="CS2"?"5v5":"1v1"})}><option value="CS2">COUNTER-STRIKE 2</option><option value="Clash Royale">CLASH ROYALE</option><option value="EA SPORTS FC">EA SPORTS FC / FIFA</option></select></label>
          <label>FORMAT<select required disabled={form.game!=="CS2"} value={form.game==="CS2"?form.format:"1v1"} onChange={e=>setForm({...form,format:e.target.value})}>{form.game==="CS2"?<><option value="2v2">2 vs 2 — 2 players</option><option value="3v3">3 vs 3 — 3 players</option><option value="5v5">5 vs 5 — 5 players</option></>:<option value="1v1">1 vs 1 — individual player</option>}</select></label>
          <label>DATE & TIME<input type="datetime-local" value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/></label>
          <label>STATUS<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="DRAFT">DRAFT</option><option value="REGISTRATION">REGISTRATION</option><option value="LIVE">LIVE</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></label>
        </div>
        <label>LOCATION<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
        {form.game === "EA SPORTS FC" && <><div className="admin-form-grid"><label>PLATFORM<select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}><option value="PS5">PlayStation 5</option><option value="PS4">PlayStation 4</option><option value="Xbox">Xbox</option><option value="PC">PC</option></select></label><label>GAME VERSION<input value={form.game_version} onChange={e=>setForm({...form,game_version:e.target.value})}/></label><label>ONLINE ENTRY FEE (€)<input type="number" min="0" step="0.50" value={form.entry_fee_online} onChange={e=>setForm({...form,entry_fee_online:e.target.value})}/></label><label>ON-SITE ENTRY FEE (€)<input type="number" min="0" step="0.50" value={form.entry_fee_onsite} onChange={e=>setForm({...form,entry_fee_onsite:e.target.value})}/></label></div><label>CLUB SELECTION<select value={form.club_selection} onChange={e=>setForm({...form,club_selection:e.target.value})}><option value="FREE">Free club choice (no duplicate club in one match)</option><option value="MIRRORED">Both players use the same club</option><option value="FIXED">Organizer sets clubs</option></select></label></>}
        <label>DESCRIPTION<textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <div className="admin-form-actions"><button disabled={saving}>{saving ? "SAVING..." : editing ? "SAVE CHANGES ↗" : "CREATE TOURNAMENT ↗"}</button>{editing && <button type="button" className="admin-secondary" onClick={reset}>CANCEL</button>}</div>
      </form>
      {message && <p className="admin-feedback">{message}</p>}
    </section>
    <div className="admin-section-title"><div><span>EVENT DATABASE</span><h2>ALL TOURNAMENTS</h2></div><small>{items.length} RECORDS</small></div>
    <div className="admin-list">{items.map(item=><article className="admin-list-row" key={item.id}><div><small>{item.game} / {item.status}</small><h3>{item.title}</h3><p>{item.event_date ? new Date(item.event_date).toLocaleString() : "Date not set"} · {item.location} · {item.format}</p></div><div className="admin-row-actions"><button type="button" onClick={()=>openBracket(item)}>BRACKET</button><button onClick={()=>edit(item)}>EDIT</button><button className="admin-delete" onClick={()=>remove(item.id)}>DELETE</button></div></article>)}{!items.length && <div className="admin-empty">No tournaments yet. Create the first event above.</div>}</div>
    {bracketTournament&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setBracketTournament(null)}} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(3,7,14,.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><section role="dialog" aria-modal="true" style={{width:"min(1050px,100%)",maxHeight:"92vh",overflowY:"auto",background:"linear-gradient(145deg,#121c2c,#0b1422)",border:"1px solid #355078",borderRadius:14,padding:22,color:"#edf3fb",boxShadow:"0 24px 90px rgba(0,0,0,.55)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><small style={{color:"#75aaff",letterSpacing:2}}>VENTSPILS ARENA / MATCH CONTROL</small><h2 style={{margin:"8px 0"}}>{bracketTournament.title}</h2><p style={{color:"#91a3bd",marginTop:0}}>{bracketTournament.game} · {bracketTeams.length} registered participants</p></div><button type="button" onClick={()=>setBracketTournament(null)} style={{background:"#1c293b",border:"1px solid #34465e",color:"white",borderRadius:8,padding:"8px 13px",fontSize:22}}>×</button></div>{bracketBusy?<p>Loading matches…</p>:<><div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}><button type="button" onClick={createBracket}>GENERATE BRACKET</button><button type="button" className="admin-secondary" onClick={resetInlineBracket} disabled={!bracketMatches.length}>RESET GRID</button></div>{!bracketMatches.length?<p style={{color:"#91a3bd"}}>Сетка ещё не создана. Участники сохраняются отдельно.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>{bracketMatches.map(m=><article key={m.id} style={{background:"#0b1320",border:"1px solid #2b3b52",borderRadius:10,padding:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><b>MATCH {m.match_number} · ROUND {m.round_number}</b><span style={{color:m.status==="LIVE"?"#ef5968":"#91a3bd"}}>{m.status}</span></div>{bracketTournament.game!=="EA SPORTS FC"&&<><label style={{display:"block",fontSize:12,color:"#9aabc2"}}>CYBERSHOKE ROOM URL<input defaultValue={m.cybershoke_url||""} placeholder="https://cybershoke.net/..." onBlur={e=>supabase!.from("tournament_matches").update({cybershoke_url:e.target.value||null}).eq("id",m.id)}/></label><label style={{display:"block",fontSize:12,color:"#9aabc2",marginTop:8}}>MAP<input defaultValue={m.map_name||""} placeholder="Map name" onBlur={e=>supabase!.from("tournament_matches").update({map_name:e.target.value||null}).eq("id",m.id)}/></label></>}<div style={{display:"grid",gridTemplateColumns:"1fr 56px 12px 56px 1fr",alignItems:"center",gap:5,marginTop:14}}><b style={{fontSize:12}}>{m.team_a||"TBD"}</b><input aria-label="Score A" type="number" min="0" value={bracketScores[m.id]?.a??String(m.score_a??"")} onChange={e=>setBracketScores(v=>({...v,[m.id]:{a:e.target.value,b:v[m.id]?.b??String(m.score_b??"")}}))}/><span>:</span><input aria-label="Score B" type="number" min="0" value={bracketScores[m.id]?.b??String(m.score_b??"")} onChange={e=>setBracketScores(v=>({...v,[m.id]:{a:v[m.id]?.a??String(m.score_a??""),b:e.target.value}}))}/><b style={{fontSize:12}}>{m.team_b||"TBD"}</b></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button type="button" onClick={()=>updateMatch(m,{status:m.status==="LIVE"?"SCHEDULED":"LIVE"})} disabled={!m.team_a||!m.team_b||m.status==="COMPLETED"}>{m.status==="LIVE"?"END LIVE":"SET LIVE"}</button><button type="button" onClick={()=>saveInlineScore(m)} disabled={!m.team_a||!m.team_b}>SAVE RESULT</button></div></article>)}</div>}</>}</section></div>}
    <div className="admin-footer-actions"><Link href="/admin">← ADMIN CONTROL</Link><Link href="/tournaments">VIEW PUBLIC TOURNAMENTS ↗</Link></div>
  </div></main>;
}
