"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthNav from "./components/AuthNav";
import { supabase } from "../lib/supabase";

type Tournament={id:string;title:string;game:string;event_date:string|null;location:string;status:string;format:string|null};
export default function Home(){
  const [events,setEvents]=useState<Tournament[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    async function load(){
      if(!supabase){setLoading(false);return;}
      const {data}=await supabase.from("tournaments").select("id,title,game,event_date,location,status,format").in("status",["REGISTRATION","LIVE"]).order("event_date",{ascending:true}).limit(6);
      if(active)setEvents((data||[]) as Tournament[]);
      if(active)setLoading(false);
    }
    load();return()=>{active=false;};
  },[]);
  return <main>
    <header><b>V <span>VENTSPILS ARENA</span></b><nav><Link href="/tournaments">TOURNAMENTS</Link><Link href="/teams">TEAMS</Link><Link href="/rankings">RANKINGS</Link><Link href="/news">NEWS</Link><Link href="/rules">RULES</Link></nav><AuthNav /></header>
    <section className="hero"><small>● VENTSPILS, LATVIA · EST. 2026</small><h1>THE NEXT<br/><em>ROUND</em><br/>STARTS HERE.</h1><p>A home for competitive Counter-Strike. Find your team, enter the arena and prove yourself.</p><Link className="button" href="/tournaments">EXPLORE TOURNAMENTS ↗</Link><label>COMPETE　•　CONNECT　•　CONQUER</label></section>
    <section className="upcoming-section">
      <div className="upcoming-heading"><div><small>THE COMPETITIVE CALENDAR</small><h2>UPCOMING <em>TOURNAMENTS.</em></h2><p>Find your next match. Choose an event and secure your place.</p></div><Link href="/tournaments">ALL TOURNAMENTS ↗</Link></div>
      {loading?<div className="upcoming-empty">LOADING THE ARENA CALENDAR...</div>:events.length===0?<div className="upcoming-empty"><span>01 / CALENDAR</span><div><h3>NO UPCOMING EVENTS</h3><p>New tournaments will appear here as soon as registration opens.</p></div><Link href="/tournaments">VIEW TOURNAMENTS ↗</Link></div>:
        <div className="upcoming-list">{events.map((event,index)=><Link className="upcoming-card" href={"/tournaments/"+event.id} key={event.id}>
          <div className="upcoming-number">{String(index+1).padStart(2,"0")}</div>
          <div className="upcoming-date"><strong>{event.event_date?new Date(event.event_date).toLocaleDateString("en-GB",{day:"2-digit"}):"TBA"}</strong><span>{event.event_date?new Date(event.event_date).toLocaleDateString("en-GB",{month:"short",year:"numeric"}).toUpperCase():"DATE TBA"}</span></div>
          <div className="upcoming-name"><h3>{event.title}</h3><p>{event.game} <b>·</b> {event.location||"LOCATION TBA"} <b>·</b> {event.format||"FORMAT TBA"}</p></div>
          <span className={"upcoming-status "+(event.status==="LIVE"?"is-live":"")}>{event.status==="LIVE"?"LIVE":"REGISTRATION OPEN"}</span><span className="upcoming-arrow">↗</span>
        </Link>)}</div>}
    </section>
    <section className="community-section">
      <div className="community-copy"><small>STAY IN THE LOOP</small><h2>FOLLOW THE<br/><em>ARENA.</em></h2><p>Tournament announcements, community updates and important event information — all in one place.</p></div>
      <div className="community-links">
        <a className="community-link" href="https://www.instagram.com/ventspilscs/" target="_blank" rel="noopener noreferrer"><span>01 / SOCIAL ↗</span><strong>INSTAGRAM</strong><small>@VENTSPILSCS · OPEN PROFILE</small></a>
        <a className="community-link" href="https://discord.gg/B8AebRKUJJ" target="_blank" rel="noopener noreferrer"><span>02 / COMMUNITY ↗</span><strong>DISCORD</strong><small>JOIN THE SERVER</small></a>
        <div className="community-link"><span>03 / SUPPORT</span><strong>TECHNICAL SUPPORT</strong><small>SUPPORT CHANNEL COMING SOON</small></div>
      </div>
    </section>
    <footer><span>VENTSPILS ARENA　·　© 2026</span><span>COMPETE • CONNECT • CONQUER</span><Link href="/rules">COMMUNITY RULES ↗</Link></footer>
  </main>;
}
