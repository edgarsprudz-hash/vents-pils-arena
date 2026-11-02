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
      setItem(data);
      setSignedIn(!!session);
      if(session){
        const {data:registration}=await supabase.from("tournament_registrations").select("id,status").eq("tournament_id",params.id).eq("user_id",session.user.id).maybeSingle();
        if(active)setRegistered(registration?.status==="REGISTERED");
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
    if(!session){setMessage("Please sign in to register.");setBusy(false);router.push("/login");return;}
    const {error}=await supabase.from("tournament_registrations").insert({tournament_id:item.id,user_id:session.user.id});
    if(error){
      if(error.code==="23505"){setRegistered(true);setMessage("You are already registered for this tournament.");}
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

  if(loading)return <main className="event"><p>LOADING TOURNAMENT...</p></main>;
  if(!item)return <main className="event"><Link href="/tournaments">← TOURNAMENTS</Link><h2>NOT FOUND.</h2><p>{message}</p></main>;
  const open=item.status==="REGISTRATION";
  return <main className="event">
    <Link href="/tournaments">← ALL TOURNAMENTS</Link>
    <small>VENTSPILS ARENA / {item.game} / {item.status}</small>
    <h2>{item.title}<em>.</em></h2>
    <p>{item.description||"Official tournament hosted by VENTSPILS ARENA."}</p>
    <p><strong>DATE:</strong> {item.event_date?new Date(item.event_date).toLocaleString():"To be announced"}</p>
    <p><strong>LOCATION:</strong> {item.location}</p>
    <p><strong>FORMAT:</strong> {item.format}</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:26}}>
      {open ? (registered
        ? <button className="button" disabled={busy} onClick={cancel}>{busy?"PLEASE WAIT...":"CANCEL REGISTRATION"}</button>
        : signedIn
          ? <button className="button" disabled={busy} onClick={register}>{busy?"REGISTERING...":"REGISTER FOR TOURNAMENT ↗"}</button>
          : <Link className="button" href="/login">SIGN IN TO REGISTER ↗</Link>)
        : <span className="arena-card-soon">{item.status==="LIVE"?"REGISTRATION CLOSED — EVENT LIVE":"REGISTRATION IS NOT OPEN"}</span>}
    </div>
    {registered&&<p> <strong>STATUS:</strong> REGISTERED</p>}
    {message&&<p role="status">{message}</p>}
  </main>;
}
