"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tournament = { id:string; title:string; game:string; description:string; event_date:string|null; location:string; status:string; format:string };
type Player = { nickname:string; steam:string };
type Team = { id:string; team_name:string; captain_name:string; roster:Player[]; created_at:string; status:string };
type PublicMatch = { id:string; round_number:number; match_number:number; bracket_type:string; team_a:string|null; team_b:string|null; winner_team:string|null; status:string };

export default function TournamentDetailsPage(){
  const params=useParams<{id:string}>(); const router=useRouter();
  const [item,setItem]=useState<Tournament|null>(null); const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false); const [registered,setRegistered]=useState(false);
  const [message,setMessage]=useState(""); const [signedIn,setSignedIn]=useState(false);
  const [dbReady,setDbReady]=useState(true); const [showForm,setShowForm]=useState(false);
  const [teamName,setTeamName]=useState(""); const [captain,setCaptain]=useState("");
  const [players,setPlayers]=useState<Player[]>([{nickname:"",steam:""}]);
  const [teams,setTeams]=useState<Team[]>([]);\n  const [bracket,setBracket]=useState<PublicMatch[]>([]);

  async function loadTeams(id:string){
    if(!supabase)return;
    const {data,error}=await supabase.from("tournament_registrations")
      .select("id,team_name,captain_name,roster,created_at,status").eq("tournament_id",id).in("status",["PENDING","REGISTERED"]).order("created_at");
    if(!error)setTeams((data||[]) as Team[]);
  }
  useEffect(()=>{ let active=true; async function load(){
    if(!supabase){setMessage("Registration service is not configured.");setLoading(false);return;}
    const [{data,error},{data:{session}}]=await Promise.all([
      supabase.from("tournaments").select("id,title,game,description,event_date,location,status,format").eq("id",params.id).maybeSingle(),
      supabase.auth.getSession()
    ]);
    if(!active)return;
    if(error||!data){setMessage(error?.message||"Tournament not found.");setLoading(false);return;}
    setItem(data);setSignedIn(!!session);
    if(session){
      const {data:reg,error:regError}=await supabase.from("tournament_registrations").select("id,status").eq("tournament_id",params.id).eq("user_id",session.user.id).in("status",["PENDING","REGISTERED"]).maybeSingle();
      if(!active)return;
      if(regError){setDbReady(false);setMessage("The team registration database migration must be installed.");}
      else setRegistered(!!reg);
    }
    await loadTeams(params.id); if(active)setLoading(false);
  } load(); return()=>{active=false;}; },[params.id]);

  function updatePlayer(i:number,key:keyof Player,value:string){
    setPlayers(old=>old.map((p,n)=>n===i?{...p,[key]:value}:p));
  }
  async function submitRegistration(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!supabase||!item)return;
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){router.push("/login");return;}
    const clean=players.map(p=>({nickname:p.nickname.trim(),steam:p.steam.trim()}));
    if(clean.some(p=>!p.nickname)){setMessage("Enter a nickname for every player.");return;}
    setBusy(true);setMessage("");
    const {error}=await supabase.from("tournament_registrations").insert({
      tournament_id:item.id,user_id:session.user.id,status:"PENDING",
      team_name:teamName.trim(),captain_name:captain.trim(),roster:clean
    });
    if(error){setMessage(error.code==="23505"?"Your account already has a registration for this tournament.":error.message);}
    else{setRegistered(true);setShowForm(false);setMessage("Team registration submitted successfully.");await loadTeams(item.id);}
    setBusy(false);
  }
  async function cancel(){
    if(!supabase||!item)return;setBusy(true);setMessage("");
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){router.push("/login");return;}
    const {error}=await supabase.from("tournament_registrations").update({status:"CANCELLED"}).eq("tournament_id",item.id).eq("user_id",session.user.id);
    if(error)setMessage(error.message);else{setRegistered(false);setMessage("Registration cancelled.");await loadTeams(item.id);}
    setBusy(false);
  }
  if(loading)return <main className="tournament-detail"><div className="tournament-detail-shell"><p className="detail-loading">LOADING TOURNAMENT...</p></div></main>;
  if(!item)return <main className="tournament-detail"><div className="tournament-detail-shell"><Link className="detail-back" href="/tournaments">← ALL TOURNAMENTS</Link><h1>NOT FOUND<span>.</span></h1><p className="detail-message">{message}</p></div></main>;
  const open=item.status==="REGISTRATION";
  const maxPlayers = Math.min(5, Math.max(1, Number.parseInt(item.format, 10) || 5));
  const date=item.event_date?new Date(item.event_date).toLocaleString("en-GB",{dateStyle:"long",timeStyle:"short"}):"TO BE ANNOUNCED";
  return <main className="tournament-detail"><div className="tournament-detail-shell">
    <div className="detail-topline"><Link className="detail-back" href="/tournaments">← ALL TOURNAMENTS</Link><span>VENTSPILS ARENA <b>/</b> TOURNAMENTS</span></div>
    <section className="detail-hero"><div className="detail-copy"><div className="detail-kicker"><i/> {item.game} <b>•</b> {item.status.replace("_"," ")}</div><h1>{item.title}<span>.</span></h1><p>{item.description||"Official tournament hosted by VENTSPILS ARENA. Compete for the title."}</p></div><div className="detail-stamp"><strong>VA</strong><small>OFFICIAL EVENT</small></div></section>
    <section className="detail-content"><div className="detail-info"><div className="detail-section-label">EVENT INFORMATION <i/></div><div className="detail-facts">
      <div><small>DATE & TIME</small><strong>{date}</strong></div><div><small>LOCATION</small><strong>{item.location||"TO BE ANNOUNCED"}</strong></div><div><small>FORMAT</small><strong>{item.format||"TO BE ANNOUNCED"}</strong></div><div><small>GAME</small><strong>{item.game}</strong></div>
    </div></div><aside className="detail-register"><small>YOUR NEXT CHALLENGE</small><h2>{registered?"YOU'RE IN":open?"JOIN THE ARENA":"REGISTRATION CLOSED"}<span>.</span></h2>
      <p>{registered?"Your team registration is awaiting administrator approval.":open?"Register your team and submit your player roster.":"Registration is not currently available for this event."}</p>
      {open&&(registered?<button className="detail-action detail-cancel" disabled={busy||!dbReady} onClick={cancel}>{busy?"PLEASE WAIT...":"CANCEL REGISTRATION"}</button>:signedIn?<button className="detail-action" disabled={busy||!dbReady} onClick={()=>setShowForm(true)}>REGISTER YOUR TEAM ↗</button>:<Link className="detail-action" href="/login">SIGN IN TO REGISTER ↗</Link>)}
      {registered&&<div className="detail-success">◷ AWAITING APPROVAL</div>}{message&&<p className="detail-message" role="status">{message}</p>}
      {!dbReady&&<span className="detail-note">DATABASE SETUP REQUIRED</span>}
    </aside></section>
    <section className="team-roster-section"><div className="detail-section-label">COMPETING TEAMS <i/></div><div className="team-roster-heading"><h2>REGISTERED <em>TEAMS.</em></h2><span>{teams.length.toString().padStart(2,"0")} TEAMS</span></div>
      {teams.length===0?<p className="team-empty">No teams have registered yet. Be the first to join the competition.</p>:<div className="team-grid">{teams.map((team,index)=><article className="team-card" key={team.id}><div className="team-card-top"><span>TEAM / {(index+1).toString().padStart(2,"0")}</span><b>{team.roster?.length||0} PLAYERS</b></div><div className={"team-status-badge "+(team.status==="REGISTERED"?"team-status-approved":"team-status-pending")}>{team.status==="REGISTERED"?"CONFIRMED":"AWAITING APPROVAL"}</div><h3>{team.team_name||"Unnamed team"}</h3><p className="team-captain">CAPTAIN · {team.captain_name||"—"}</p><div className="team-player-list">{(team.roster||[]).map((p,i)=><div key={i}><span>{String(i+1).padStart(2,"0")}</span><strong>{p.nickname}</strong>{p.steam&&<a href={p.steam.startsWith("http")?p.steam:"https://steamcommunity.com/profiles/"+p.steam} target="_blank" rel="noreferrer">STEAM ↗</a>}</div>)}</div></article>)}</div>}
    </section>
    {bracket.length>0&&<section className="public-bracket-section"><div className="detail-section-label">OFFICIAL PLAYOFFS <i/></div><div className="team-roster-heading"><h2>TOURNAMENT <em>BRACKET.</em></h2><span>SINGLE ELIMINATION</span></div><p className="public-bracket-intro">Follow every matchup, see completed results and track which teams advance to the final.</p><div className="public-bracket-board">{Array.from(new Set(bracket.map(m=>m.round_number))).sort((a,b)=>a-b).map(round=><section className="public-bracket-round" key={round}><h3>{round===Math.max(...bracket.map(m=>m.round_number))?"FINAL":round===Math.max(...bracket.map(m=>m.round_number))-1?"SEMI-FINALS":round===Math.max(...bracket.map(m=>m.round_number))-2?"QUARTER-FINALS":"ROUND "+round}</h3>{bracket.filter(m=>m.round_number===round).map(match=><article className="public-bracket-match" key={match.id}><div className="public-bracket-match-top"><span>MATCH {match.match_number}</span><b>{match.status==="COMPLETED"?"COMPLETED":"UPCOMING"}</b></div>{[match.team_a,match.team_b].map((team,index)=><div className={"public-bracket-team "+(team&&match.winner_team===team?"public-bracket-winner":"")} key={index}><span>{team||"WAITING FOR QUALIFIER"}</span>{team&&match.winner_team===team&&<b>WINNER</b>}</div>)}</article>)}</section>)}</div></section>}
    <div className="detail-bottom"><span>VENTSPILS ARENA <b>•</b> COMPETE • CONNECT • CONQUER</span><span>LATVIA / 2026</span></div>
    {showForm&&<div className="team-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false);}}><section className="team-modal" role="dialog" aria-modal="true" aria-labelledby="team-form-title"><button className="team-modal-close" onClick={()=>setShowForm(false)} aria-label="Close">×</button><span className="detail-section-label">VENTSPILS ARENA / ENTRY FORM</span><h2 id="team-form-title">TEAM <em>REGISTRATION.</em></h2><p className="team-modal-intro">This is a {item.format} tournament. You can register up to {maxPlayers} players. Your team will appear here after submission.</p>
      <form onSubmit={submitRegistration} className="team-registration-form"><label>TEAM NAME<input required minLength={2} maxLength={40} value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="Enter team name"/></label><label>CAPTAIN NAME<input required maxLength={40} value={captain} onChange={e=>setCaptain(e.target.value)} placeholder="In-game nickname"/></label><div className="team-form-label">PLAYER ROSTER <span>{players.length}/${maxPlayers}</span></div>
      {players.map((p,i)=><div className="team-player-fields" key={i}><label><span>PLAYER {i+1} NICKNAME</span><input required value={p.nickname} onChange={e=>updatePlayer(i,"nickname",e.target.value)} placeholder="In-game nickname"/></label><label><span>STEAM PROFILE URL / ID</span><input value={p.steam} onChange={e=>updatePlayer(i,"steam",e.target.value)} placeholder="Optional Steam profile"/></label>{players.length>1&&<button type="button" className="remove-player" onClick={()=>setPlayers(old=>old.filter((_,n)=>n!==i))}>REMOVE</button>}</div>)}
      {players.length<maxPlayers&&<button type="button" className="add-player" onClick={()=>setPlayers(old=>old.length<maxPlayers?[...old,{nickname:"",steam:""}]:old)}>+ ADD PLAYER</button>}
      {message&&<p className="detail-message" role="status">{message}</p>}<button className="detail-action" type="submit" disabled={busy}>{busy?"SUBMITTING...":"SUBMIT TEAM REGISTRATION ↗"}</button></form>
    </section></div>}
  </div></main>;
}
