"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tournament = { id: string; title: string; game: string; description: string; event_date: string | null; location: string; status: string; format: string };
type Match = { id:string; tournament_id:string; round_number:number; match_number:number; bracket_type?:string; group_number?:number|null; team_a:string|null; team_b:string|null; winner_team:string|null; score_a:number|null; score_b:number|null; next_match_id:string|null; next_slot:"A"|"B"|null; status:string; cybershoke_url?:string|null; map_name?:string|null };
const blank = { title: "", game: "CS2", description: "", event_date: "", location: "Ventspils, Latvia", status: "DRAFT", format: "5v5", platform: "PS5", game_version: "EA SPORTS FC 26", entry_fee_online: "5", entry_fee_onsite: "10", club_selection: "FREE" };

export default function AdminTournamentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Tournament[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [bracketTournament,setBracketTournament]=useState<Tournament|null>(null);
  const [bracketMatches,setBracketMatches]=useState<Match[]>([]);
  const [bracketTeams,setBracketTeams]=useState<{team_name:string}[]>([]);
  const [bracketScores,setBracketScores]=useState<Record<string,{a:string;b:string}>>({});
  const [bracketBusy,setBracketBusy]=useState(false);
  const [bracketMessage,setBracketMessage]=useState("");
  const [bracketFormat,setBracketFormat]=useState("SINGLE_ELIMINATION");
  const [groupCount,setGroupCount]=useState(4);
  const [playersPerGroup,setPlayersPerGroup]=useState(4);
  const [qualifiersPerGroup,setQualifiersPerGroup]=useState(2);
  const [distribution,setDistribution]=useState("RANDOM");
  const [stationCount,setStationCount]=useState(2);

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
  async function openBracket(item:Tournament){
    if(!supabase)return;
    if(bracketTournament?.id!==item.id){setBracketMatches([]);setBracketScores({});setBracketMessage("");setBracketFormat("SINGLE_ELIMINATION");setGroupCount(1);setPlayersPerGroup(4);setQualifiersPerGroup(2);setDistribution("RANDOM");setStationCount(2);}setBracketTournament(item);setBracketBusy(true);
    const [m,t]=await Promise.all([
      supabase.from("tournament_matches").select("*").eq("tournament_id",item.id).order("round_number").order("match_number"),
      supabase.from("tournament_registrations").select("team_name").eq("tournament_id",item.id).eq("status","REGISTERED").order("created_at")
    ]);
    if(m.error)setBracketMessage("Ошибка загрузки матчей: "+m.error.message);
    else setBracketMatches((m.data||[]) as Match[]);
    if(t.error)setBracketMessage("Ошибка загрузки участников: "+t.error.message);
    setBracketTeams((t.data||[]).filter(x=>x.team_name).map(x=>({team_name:x.team_name})));
    setBracketBusy(false);
  }
  async function createBracket(){
    if(!supabase||!bracketTournament||bracketBusy)return;
    setBracketMessage("");
    const names=bracketTeams.map(x=>x.team_name.trim()).filter(Boolean);
    if(bracketFormat==="GROUPS_PLAYOFFS"){
      if(names.length<4||names.length%4!==0){setBracketMessage("Для группового этапа нужно кратное четырём количество участников: 4, 8, 12, 16 и т.д. В каждой группе будет 4 участника, по 3 матча на каждого.");return;}
      if(bracketMatches.length){setBracketMessage("Сетка уже существует. Нажми RESET GRID перед новой генерацией.");return;}
      setBracketBusy(true);
      try{
        const shuffled=[...names];
        if(distribution==="RANDOM")for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
        const groups=Array.from({length:shuffled.length/4},(_,i)=>shuffled.slice(i*4,i*4+4));
        const rows:any[]=[];let matchNo=1;
        groups.forEach((members,g)=>{for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)rows.push({tournament_id:bracketTournament.id,round_number:1,match_number:matchNo++,bracket_type:"GROUP",group_number:g+1,team_a:members[a],team_b:members[b],winner_team:null,score_a:null,score_b:null,next_match_id:null,next_slot:null,status:"SCHEDULED"});});
        const {error}=await supabase.from("tournament_matches").insert(rows);
        if(error)throw error;
        setBracketMessage("Группы созданы. У каждой команды будет по 3 матча. После сохранения всех результатов плей-офф создастся автоматически.");
        await openBracket(bracketTournament);
      }catch(error:any){setBracketMessage("Не удалось создать группы: "+(error?.message||"Неизвестная ошибка"));}
      finally{setBracketBusy(false);}
      return;
    }
    if(bracketFormat!=="SINGLE_ELIMINATION"){setBracketMessage("Double Elimination пока не реализован. Выбери Groups + Playoffs или Single Elimination.");return;}
    if(names.length<2){setBracketMessage(`Для генерации нужно минимум 2 подтверждённых участника. Сейчас найдено: ${names.length}. Проверь регистрации со статусом REGISTERED.`);return;}
    if(bracketMatches.length){setBracketMessage("Сетка уже существует. Нажми RESET GRID перед новой генерацией.");return;}
    setBracketBusy(true);
    try{
      let size=1;while(size<names.length)size*=2;
      const padded:(string|null)[]=[...names,...Array(size-names.length).fill(null)];
      const total=Math.log2(size);
      const rows:any[]=[];
      for(let r=1;r<=total;r++)for(let m=1;m<=size/Math.pow(2,r);m++)rows.push({tournament_id:bracketTournament.id,round_number:r,match_number:m,bracket_type:"MAIN",team_a:r===1?padded[(m-1)*2]:null,team_b:r===1?padded[(m-1)*2+1]:null,winner_team:null,score_a:null,score_b:null,next_match_id:null,next_slot:null,status:"SCHEDULED"});
      const {data,error}=await supabase.from("tournament_matches").insert(rows).select("*");
      if(error)throw error;
      const created=(data||[]) as Match[];
      for(const m of created.filter(x=>x.round_number<total)){
        const next=created.find(x=>x.round_number===m.round_number+1&&x.match_number===Math.ceil(m.match_number/2));
        const {error:linkError}=await supabase.from("tournament_matches").update({next_match_id:next?.id||null,next_slot:m.match_number%2?"A":"B"}).eq("id",m.id);
        if(linkError)throw linkError;
      }
      setBracketMessage("Черновик сетки успешно создан.");
      await openBracket(bracketTournament);
    }catch(error:any){
      setBracketMessage("Не удалось создать сетку: "+(error?.message||"Неизвестная ошибка"));
    }finally{setBracketBusy(false);}
  }
  async function maybeCreateGroupPlayoffs(tournamentId:string){
    if(!supabase)return;
    const {data,error}=await supabase.from("tournament_matches").select("*").eq("tournament_id",tournamentId).eq("bracket_type","GROUP");
    if(error)throw error;
    const games=(data||[]) as Match[];
    if(!games.length||games.some(m=>m.status!=="COMPLETED"))return;
    const {data:existing,error:existingError}=await supabase.from("tournament_matches").select("id").eq("tournament_id",tournamentId).eq("bracket_type","MAIN").limit(1);
    if(existingError)throw existingError;
    if(existing?.length)return;
    const groupNumbers=[...new Set(games.map(m=>m.group_number||1))].sort((a,b)=>a-b);
    const qualifiers:string[]=[];
    for(const groupNo of groupNumbers){
      const names=[...new Set(games.filter(m=>m.group_number===groupNo).flatMap(m=>[m.team_a,m.team_b]).filter(Boolean) as string[])];
      const stats=names.map(name=>({name,points:0,gf:0,ga:0,h2h:0}));
      for(const m of games.filter(x=>x.group_number===groupNo&&x.status==="COMPLETED")){
        const a=stats.find(x=>x.name===m.team_a)!;const b=stats.find(x=>x.name===m.team_b)!;
        const sa=m.score_a??0,sb=m.score_b??0;a.gf+=sa;a.ga+=sb;b.gf+=sb;b.ga+=sa;
        if(sa>sb)a.points+=3;else if(sb>sa)b.points+=3;else{a.points++;b.points++;}
      }
      for(const row of stats){const tied=stats.filter(x=>x.points===row.points);if(tied.length>1)for(const m of games.filter(x=>x.group_number===groupNo&&x.status==="COMPLETED"&&tied.some(t=>t.name===x.team_a)&&tied.some(t=>t.name===x.team_b))){const a=tied.find(t=>t.name===m.team_a)!;const b=tied.find(t=>t.name===m.team_b)!;if((m.score_a??0)>(m.score_b??0))a.h2h+=3;else if((m.score_b??0)>(m.score_a??0))b.h2h+=3;else{a.h2h++;b.h2h++;}}}
      stats.sort((a,b)=>b.points-a.points||b.h2h-a.h2h||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
      qualifiers.push(stats[0].name,stats[1].name);
    }
    let seeds:string[]=[];
    if(groupNumbers.length===1)seeds=qualifiers.slice(0,2);
    else for(let i=0;i<groupNumbers.length;i++)seeds.push(qualifiers[i*2],qualifiers[((groupNumbers.length-1-i)*2)+1]);
    let size=1;while(size<seeds.length)size*=2;
    const padded:(string|null)[]=[...seeds,...Array(size-seeds.length).fill(null)];
    const rounds=Math.log2(size);const rows:any[]=[];
    for(let r=1;r<=rounds;r++)for(let n=1;n<=size/Math.pow(2,r);n++)rows.push({tournament_id:tournamentId,round_number:r,match_number:n,bracket_type:"MAIN",team_a:r===1?padded[(n-1)*2]:null,team_b:r===1?padded[(n-1)*2+1]:null,winner_team:null,score_a:null,score_b:null,next_match_id:null,next_slot:null,status:"SCHEDULED"});
    const {data:created,error:insertError}=await supabase.from("tournament_matches").insert(rows).select("*");
    if(insertError)throw insertError;
    for(const m of (created||[]) as Match[])if(m.round_number<rounds){const next=(created||[]).find((x:any)=>x.round_number===m.round_number+1&&x.match_number===Math.ceil(m.match_number/2));const {error:linkError}=await supabase.from("tournament_matches").update({next_match_id:next?.id||null,next_slot:m.match_number%2?"A":"B"}).eq("id",m.id);if(linkError)throw linkError;}
    setBracketMessage("Групповой этап завершён. Плей-офф автоматически создан по итогам групп.");
  }
  async function updateMatch(match:Match,patch:Record<string,any>){if(!supabase)return;const {error}=await supabase.from("tournament_matches").update({...patch,updated_at:new Date().toISOString()}).eq("id",match.id);if(error){setBracketMessage(error.message);return;}if(patch.winner_team&&match.next_match_id&&match.next_slot){const nextPatch=match.next_slot==="A"?{team_a:patch.winner_team}:{team_b:patch.winner_team};const {error:nextError}=await supabase.from("tournament_matches").update({...nextPatch,status:"SCHEDULED",winner_team:null,score_a:null,score_b:null}).eq("id",match.next_match_id);if(nextError)setBracketMessage(nextError.message);}if(match.bracket_type==="GROUP"&&patch.status==="COMPLETED"){try{await maybeCreateGroupPlayoffs(match.tournament_id);}catch(error:any){setBracketMessage("Результат сохранён, но плей-офф не создан: "+(error?.message||"ошибка"));}}await openBracket(bracketTournament!);}
  async function resetInlineBracket(){if(!supabase||!bracketTournament||!window.confirm("Удалить сетку и результаты? Список участников останется."))return;const {error}=await supabase.from("tournament_matches").delete().eq("tournament_id",bracketTournament.id);if(error){setMessage(error.message);return;}await supabase.from("tournament_results").delete().eq("tournament_id",bracketTournament.id);setBracketMatches([]);setBracketScores({});}
  async function saveInlineScore(m:Match){const v=bracketScores[m.id]||{a:String(m.score_a??""),b:String(m.score_b??"")};const a=Number(v.a),b=Number(v.b);if(v.a===""||v.b===""||!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||(m.bracket_type!=="GROUP"&&a===b)){setBracketMessage("Введите целые неотрицательные счета. Ничья допускается только в группах.");return;}await updateMatch(m,{score_a:a,score_b:b,winner_team:a===b?null:(a>b?m.team_a:m.team_b),status:"COMPLETED"});}
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
    {bracketTournament&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setBracketTournament(null)}} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(3,7,14,.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><section role="dialog" aria-modal="true" style={{width:"min(1050px,100%)",maxHeight:"92vh",overflowY:"auto",background:"linear-gradient(145deg,#121c2c,#0b1422)",border:"1px solid #355078",borderRadius:14,padding:22,color:"#edf3fb",boxShadow:"0 24px 90px rgba(0,0,0,.55)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><small style={{color:"#75aaff",letterSpacing:2}}>VENTSPILS ARENA / MATCH CONTROL</small><h2 style={{margin:"8px 0"}}>{bracketTournament.title}</h2><p style={{color:"#91a3bd",marginTop:0}}>{bracketTournament.game} · {bracketTeams.length} registered participants</p></div><button type="button" onClick={()=>setBracketTournament(null)} style={{background:"#1c293b",border:"1px solid #34465e",color:"white",borderRadius:8,padding:"8px 13px",fontSize:22}}>×</button></div>{bracketBusy?<p>Загрузка / генерация…</p>:<>{bracketMessage&&<div role="status" style={{margin:"12px 0",padding:"12px 14px",border:"1px solid #5276a4",borderRadius:8,background:"#14243a",color:"#d8e8ff",fontSize:13}}>{bracketMessage}</div> }<div style={{margin:"18px 0 16px",padding:18,border:"1px solid #2b4260",borderRadius:12,background:"linear-gradient(135deg,#15243a,#101a2a 65%,#111827)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:15}}><div><small style={{color:"#7db3ff",letterSpacing:2,fontWeight:800}}>01 / COMPETITION FORMAT</small><h3 style={{margin:"5px 0 0",fontSize:19}}>Схема турнира</h3></div><span style={{fontSize:10,color:"#8da6c7"}}>SETUP</span></div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
{[{v:"SINGLE_ELIMINATION",t:"Single Elimination",d:"Проиграл — выбыл"},{v:"GROUPS_PLAYOFFS",t:"Groups + Playoffs",d:"Группы и финальная сетка"},{v:"DOUBLE_ELIMINATION",t:"Double Elimination",d:"Два поражения до вылета"}].map(x=><button key={x.v} type="button" onClick={()=>setBracketFormat(x.v)} style={{textAlign:"left",padding:14,borderRadius:9,border:bracketFormat===x.v?"1px solid #65a7ff":"1px solid #34465d",background:bracketFormat===x.v?"linear-gradient(135deg,#1d4775,#17304f)":"#101a29",color:"#f2f6fc",cursor:"pointer",boxShadow:bracketFormat===x.v?"0 0 0 2px #65a7ff22":"none"}}><b style={{display:"block",fontSize:12}}>{x.t}</b><small style={{display:"block",marginTop:6,color:"#9fb1c9",fontSize:10}}>{x.d}</small></button>)}
</div>
{bracketFormat==="GROUPS_PLAYOFFS"&&<div style={{marginTop:16,paddingTop:15,borderTop:"1px solid #ffffff18"}}><small style={{color:"#7db3ff",letterSpacing:1.5,fontWeight:800}}>02 / GROUP SETTINGS</small><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginTop:12}}>
<label style={{display:"grid",gap:7,fontSize:10,color:"#aebed3"}}>Количество групп<input type="number" min="1" max="16" value={groupCount} onChange={e=>setGroupCount(Math.max(1,Math.min(16,Number(e.target.value)||1)))}/></label>
<label style={{display:"grid",gap:7,fontSize:10,color:"#aebed3"}}>Игроков / команд в группе<input type="number" min="2" max="32" value={playersPerGroup} onChange={e=>setPlayersPerGroup(Math.max(2,Math.min(32,Number(e.target.value)||2)))}/></label>
<label style={{display:"grid",gap:7,fontSize:10,color:"#aebed3"}}>Выходят из группы<input type="number" min="1" max={playersPerGroup} value={qualifiersPerGroup} onChange={e=>setQualifiersPerGroup(Math.max(1,Math.min(playersPerGroup,Number(e.target.value)||1)))}/></label>
<label style={{display:"grid",gap:7,fontSize:10,color:"#aebed3"}}>Распределение участников<select value={distribution} onChange={e=>setDistribution(e.target.value)}><option value="RANDOM">Случайное</option><option value="MANUAL">Вручную</option><option value="SEEDED">По посеву</option></select></label>
</div><p style={{fontSize:10,color:"#8196b2",margin:"12px 0 0"}}>Всего мест по настройкам: {groupCount*playersPerGroup} · В плей-офф: {groupCount*qualifiersPerGroup}</p></div>}
{bracketTournament.game==="EA SPORTS FC"&&<div style={{marginTop:15,paddingTop:14,borderTop:"1px solid #ffffff18"}}><small style={{color:"#7db3ff",letterSpacing:1.5,fontWeight:800}}>MATCH DAY / EA FC</small><label style={{display:"grid",gap:7,maxWidth:260,marginTop:10,fontSize:10,color:"#aebed3"}}>Игровых станций (PS5 + TV)<input type="number" min="1" max="32" value={stationCount} onChange={e=>setStationCount(Math.max(1,Math.min(32,Number(e.target.value)||1)))}/></label></div>}
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:17}}><button type="button" onClick={createBracket} disabled={bracketMatches.length>0||bracketBusy} style={{padding:"12px 18px",border:0,borderRadius:7,background:"#347bd0",color:"white",fontWeight:800,cursor:"pointer"}}>GENERATE DRAFT</button><button type="button" className="admin-secondary" onClick={resetInlineBracket} disabled={!bracketMatches.length}>RESET GRID</button></div>
</div>{!bracketMatches.length?<p style={{color:"#91a3bd"}}>Сетка ещё не создана. Участники сохраняются отдельно.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>{bracketMatches.map(m=><article key={m.id} style={{background:"#0b1320",border:"1px solid #2b3b52",borderRadius:10,padding:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><b>{m.bracket_type==="GROUP"?`GROUP ${m.group_number||1} · MATCH ${m.match_number}`:`MATCH ${m.match_number} · ROUND ${m.round_number}`}</b><span style={{color:m.status==="LIVE"?"#ef5968":"#91a3bd"}}>{m.status}</span></div>{bracketTournament.game!=="EA SPORTS FC"&&<><label style={{display:"block",fontSize:12,color:"#9aabc2"}}>CYBERSHOKE ROOM URL<input defaultValue={m.cybershoke_url||""} placeholder="https://cybershoke.net/..." onBlur={e=>supabase!.from("tournament_matches").update({cybershoke_url:e.target.value||null}).eq("id",m.id)}/></label><label style={{display:"block",fontSize:12,color:"#9aabc2",marginTop:8}}>MAP<input defaultValue={m.map_name||""} placeholder="Map name" onBlur={e=>supabase!.from("tournament_matches").update({map_name:e.target.value||null}).eq("id",m.id)}/></label></>}<div style={{display:"grid",gridTemplateColumns:"1fr 56px 12px 56px 1fr",alignItems:"center",gap:5,marginTop:14}}><b style={{fontSize:12}}>{m.team_a||"TBD"}</b><input aria-label="Score A" type="number" min="0" value={bracketScores[m.id]?.a??String(m.score_a??"")} onChange={e=>setBracketScores(v=>({...v,[m.id]:{a:e.target.value,b:v[m.id]?.b??String(m.score_b??"")}}))}/><span>:</span><input aria-label="Score B" type="number" min="0" value={bracketScores[m.id]?.b??String(m.score_b??"")} onChange={e=>setBracketScores(v=>({...v,[m.id]:{a:v[m.id]?.a??String(m.score_a??""),b:e.target.value}}))}/><b style={{fontSize:12}}>{m.team_b||"TBD"}</b></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button type="button" onClick={()=>updateMatch(m,{status:m.status==="LIVE"?"SCHEDULED":"LIVE"})} disabled={!m.team_a||!m.team_b||m.status==="COMPLETED"}>{m.status==="LIVE"?"END LIVE":"SET LIVE"}</button><button type="button" onClick={()=>saveInlineScore(m)} disabled={!m.team_a||!m.team_b}>SAVE RESULT</button></div></article>)}</div>}</>}</section></div>}
    <div className="admin-footer-actions"><Link href="/admin">← ADMIN CONTROL</Link><Link href="/tournaments">VIEW PUBLIC TOURNAMENTS ↗</Link></div>
  </div></main>;
}
