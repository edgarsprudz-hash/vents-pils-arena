"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tournament = { id:string; title:string; game:string; description:string; event_date:string|null; location:string; status:string; format:string };
export default function TournamentDetailsPage(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const [item,setItem]=useState<Tournament|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [registered,setRegistered]=useState(false);
  const [message,setMessage]=useState("");
  const [signedIn,setSignedIn]=useState(false);
  const [dbReady,setDbReady]=useState(true);

  useEffect(()=>{
    let active=true;
    async function load(){
      if(!supabase){setMessage("Registration service is not configured.");setLoading(false);return;}
      const [{data,error},{data:{session}}]=await Promise.all([
        supabase.from("tournaments").select("id,title,game,description,event_date,location,status,format").eq("id",params.id).maybeSingle(),
        supabase.auth.getSession()
      ]);
      if(!active)return;
      if(error){setMessage(error.message);setLoading(false);return;}
      if(!data){setMessage("Tournament not found.");setLoading(false);return;}
      setItem(data);setSignedIn(!!session);
      if(session){
        const {data:registration,error:registrationError}=await supabase.from("tournament_registrations").select("id,status").eq("tournament_id",params.id).eq("user_id",session.user.id).maybeSingle();
        if(!active)return;
        if(registrationError){setDbReady(false);setMessage("The registration database is not installed yet. Please contact the tournament administrator.");}
        else setRegistered(registration?.status==="REGISTERED");
      }
      if(active)setLoading(false);
    }
    load();
    return ()=>{active=false;};
  },[params.id]);

  async function register(){
    if(!supabase||!item)return;
    setBusy(true);setMessage("");
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setBusy(false);router.push("/login");return;}
    const {error}=await supabase.from("tournament_registrations").insert({tournament_id:item.id,user_id:session.user.id});
    if(error){
      if(error.code==="23505"){setRegistered(true);setMessage("You are already registered for this tournament.");}
      else if(error.code==="42P01"||error.code==="PGRST205"){setDbReady(false);setMessage("Registration database is not installed. The administrator must run the tournament registration SQL migration.");}
      else setMessage(error.message);
    }else{setRegistered(true);setMessage("Registration successful. Your place has been recorded.");}
    setBusy(false);
  }
  async function cancel(){
    if(!supabase||!item)return;
    setBusy(true);setMessage("");
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setBusy(false);router.push("/login");return;}
    const {error}=await supabase.from("tournament_registrations").update({status:"CANCELLED"}).eq("tournament_id",item.id).eq("user_id",session.user.id);
    if(error)setMessage(error.message);else{setRegistered(false);setMessage("Your registration has been cancelled.");}
    setBusy(false);
  }

  if(loading)return <main className="tournament-detail"><div className="tournament-detail-shell"><p className="detail-loading">LOADING TOURNAMENT...</p></div></main>;
  if(!item)return <main className="tournament-detail"><div className="tournament-detail-shell"><Link className="detail-back" href="/tournaments">← ALL TOURNAMENTS</Link><h1>NOT FOUND<span>.</span></h1><p className="detail-message">{message}</p></div></main>;
  const open=item.status==="REGISTRATION";
  const date=item.event_date?new Date(item.event_date).toLocaleString("en-GB",{dateStyle:"long",timeStyle:"short"}):"TO BE ANNOUNCED";
  return <main className="tournament-detail">
    <div className="tournament-detail-shell">
      <div className="detail-topline"><Link className="detail-back" href="/tournaments">← ALL TOURNAMENTS</Link><span>VENTSPILS ARENA <b>/</b> TOURNAMENTS</span></div>
      <section className="detail-hero">
        <div className="detail-copy">
          <div className="detail-kicker"><i/> {item.game} <b>•</b> {item.status.replace("_"," ")}</div>
          <h1>{item.title}<span>.</span></h1>
          <p>{item.description||"Official tournament hosted by VENTSPILS ARENA. Compete for the title."}</p>
        </div>
        <div className="detail-stamp"><strong>VA</strong><small>OFFICIAL EVENT</small></div>
      </section>
      <section className="detail-content">
        <div className="detail-info">
          <div className="detail-section-label">EVENT INFORMATION <i/></div>
          <div className="detail-facts">
            <div><small>DATE & TIME</small><strong>{date}</strong></div>
            <div><small>LOCATION</small><strong>{item.location||"TO BE ANNOUNCED"}</strong></div>
            <div><small>FORMAT</small><strong>{item.format||"TO BE ANNOUNCED"}</strong></div>
            <div><small>GAME</small><strong>{item.game}</strong></div>
          </div>
        </div>
        <aside className="detail-register">
          <small>YOUR NEXT CHALLENGE</small>
          <h2>{registered?"YOU'RE IN":open?"JOIN THE ARENA":"REGISTRATION CLOSED"}<span>.</span></h2>
          <p>{registered?"Your place has been recorded. Get ready to compete.":open?"Secure your place and compete with the best players.":item.status==="LIVE"?"This tournament is already in progress.":"Registration is not currently available for this event."}</p>
          {open&&(registered
            ? <button className="detail-action detail-cancel" disabled={busy||!dbReady} onClick={cancel}>{busy?"PLEASE WAIT...":"CANCEL REGISTRATION"}</button>
            : signedIn
              ? <button className="detail-action" disabled={busy||!dbReady} onClick={register}>{busy?"REGISTERING...":"REGISTER FOR TOURNAMENT ↗"}</button>
              : <Link className="detail-action" href="/login">SIGN IN TO REGISTER ↗</Link>)}
          {registered&&<div className="detail-success">✓ REGISTRATION CONFIRMED</div>}
          {message&&<p className="detail-message" role="status">{message}</p>}
          {!dbReady&&<span className="detail-note">DATABASE SETUP REQUIRED</span>}
        </aside>
      </section>
      <div className="detail-bottom"><span>VENTSPILS ARENA <b>•</b> COMPETE • CONNECT • CONQUER</span><span>LATVIA / 2026</span></div>
    </div>
  </main>;
}
