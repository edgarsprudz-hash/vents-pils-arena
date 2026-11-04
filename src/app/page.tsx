"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthNav from "./components/AuthNav";
import { supabase } from "../lib/supabase";
import { useLanguage, translations } from "./components/LanguageProvider";

type Tournament={id:string;title:string;game:string;event_date:string|null;location:string;status:string;format:string|null};
export default function Home(){
  const {language}=useLanguage(); const t=translations[language];
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
    <header><b>V <span>VENTSPILS ARENA</span></b><nav>{t.nav.map((label,i)=><Link key={label} href={["/tournaments","/teams","/rankings","/news","/rules","/complaints"][i]}>{label}</Link>)}</nav><AuthNav /></header>
    <section className="hero"><small>{t.heroEyebrow}</small><h1>{t.heroTitle[0]}<br/><em>{t.heroTitle[1]}</em><br/>{t.heroTitle[2]}</h1><p>{t.heroText}</p><Link className="button" href="/tournaments">{t.explore}</Link><label>COMPETE　•　CONNECT　•　CONQUER</label></section>
    <section className="upcoming-section">
      <div className="upcoming-heading"><div><small>{t.calendar}</small><h2>{t.upcoming} <em>{t.tournaments}</em></h2><p>{t.calendarText}</p></div><Link href="/tournaments">{t.all}</Link></div>
      {loading?<div className="upcoming-empty">{t.loading}</div>:events.length===0?<div className="upcoming-empty"><span>01 / CALENDAR</span><div><h3>{t.none}</h3><p>{t.newEvents}</p></div><Link href="/tournaments">{t.view}</Link></div>:
        <div className="upcoming-list">{events.map((event,index)=><Link className="upcoming-card" href={"/tournaments/"+event.id} key={event.id}>
          <div className="upcoming-number">{String(index+1).padStart(2,"0")}</div>
          <div className="upcoming-date"><strong>{event.event_date?new Date(event.event_date).toLocaleDateString(language==="ru"?"ru-RU":language==="lv"?"lv-LV":"en-GB",{day:"2-digit"}):"TBA"}</strong><span>{event.event_date?new Date(event.event_date).toLocaleDateString(language==="ru"?"ru-RU":language==="lv"?"lv-LV":"en-GB",{month:"short",year:"numeric"}).toUpperCase():"DATE TBA"}</span></div>
          <div className="upcoming-name"><h3>{event.title}</h3><p>{event.game} <b>·</b> {event.location||"LOCATION TBA"} <b>·</b> {event.format||"FORMAT TBA"}</p></div>
          <span className={"upcoming-status "+(event.status==="LIVE"?"is-live":"")}>{event.status==="LIVE"?"LIVE":language==="ru"?"РЕГИСТРАЦИЯ ОТКРЫТА":language==="lv"?"REĢISTRĀCIJA ATVĒRTA":"REGISTRATION OPEN"}</span><span className="upcoming-arrow">↗</span>
        </Link>)}</div>}
    </section>
    <section className="community-section">
      <div className="community-copy"><small>{t.stay}</small><h2>{t.follow}<br/><em>{t.arena}</em></h2><p>{t.communityText}</p></div>
      <div className="community-links">
        <a className="community-link" href="https://www.instagram.com/ventspilscs/" target="_blank" rel="noopener noreferrer"><span>01 / {t.social}</span><strong>INSTAGRAM</strong><small>@VENTSPILSCS · {t.openProfile}</small></a>
        <a className="community-link" href="https://discord.gg/B8AebRKUJJ" target="_blank" rel="noopener noreferrer"><span>02 / {t.community}</span><strong>DISCORD</strong><small>{t.join}</small></a>
        <Link className="community-link" href="/support"><span>03 / SUPPORT ↗</span><strong>{t.support}</strong><small>{t.openSupport}</small></Link><Link className="community-link" href="/complaints"><span>04 / PLAYER SERVICES ↗</span><strong>{t.complaint}</strong><small>{t.track}</small></Link>
      </div>
    </section>
    <footer><span>VENTSPILS ARENA　·　© 2026</span><span>COMPETE • CONNECT • CONQUER</span><Link href="/rules">{t.rules}</Link></footer>
  </main>;
}
