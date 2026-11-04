"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import { supabase } from "../../lib/supabase";
import styles from "./matches.module.css";

type Tournament = { id:string; title:string; game:string; event_date:string|null; location:string; format:string; status:string };
type Match = { id:string; tournament_id:string; round_number:number; match_number:number; team_a:string|null; team_b:string|null; winner_team:string|null; status:string };
type Registration = { tournament_id:string; user_id:string; status:string; roster:{nickname?:string;steam?:string}[]|null };

function steamIdFrom(value:string){const match=value.match(/(?:^|\\D)(\\d{17})(?:\\D|$)/);return match?.[1]||value.trim();}

export default function MyMatches(){
 const {language}=useLanguage();
 const ru=language==="ru",lv=language==="lv";
 const t=ru?{
  area:"КАБИНЕТ ИГРОКА",myTournaments:"МОИ",tournaments:"ТУРНИРЫ.",joined:"УЧАСТВУЮ",loadingRegs:"ЗАГРУЗКА РЕГИСТРАЦИЙ...",noRegs:"НЕТ АКТИВНЫХ РЕГИСТРАЦИЙ",noRegsText:"Ты ещё не зарегистрировался ни на один турнир.",explore:"СМОТРЕТЬ ТУРНИРЫ ↗",date:"ДАТА",dateTbd:"ДАТА УТОЧНЯЕТСЯ",location:"МЕСТО",locationTbd:"Будет объявлено",active:"РЕГИСТРАЦИЯ АКТИВНА",view:"ОТКРЫТЬ ТУРНИР ↗",myMatches:"МОИ",matches:"МАТЧИ.",loadingMatches:"ЗАГРУЗКА МАТЧЕЙ...",noMatches:"Для твоего аккаунта пока не запланировано матчей.",round:"РАУНД",match:"МАТЧ",open:"ОТКРЫТЬ КОМНАТУ МАТЧА ↗",vs:"ПРОТИВ"
 }:lv?{
  area:"SPĒLĒTĀJA ZONA",myTournaments:"MANI",tournaments:"TURNĪRI.",joined:"PIETEIKTS",loadingRegs:"IELĀDĒ PIETEIKUMUS...",noRegs:"NAV AKTĪVU PIETEIKUMU",noRegsText:"Tu vēl neesi reģistrējies nevienam turnīram.",explore:"APSKATĪT TURNĪRUS ↗",date:"DATUMS",dateTbd:"DATUMS TIKS PAZIŅOTS",location:"VIETA",locationTbd:"Tiks paziņots",active:"REĢISTRĀCIJA AKTĪVA",view:"SKATĪT TURNĪRU ↗",myMatches:"MANAS",matches:"SPĒLES.",loadingMatches:"IELĀDĒ SPĒLES...",noMatches:"Tavam kontam vēl nav ieplānotu turnīra spēļu.",round:"KĀRTA",match:"SPĒLE",open:"ATVĒRT SPĒLES TELPU ↗",vs:"PRET"
 }:{
  area:"PLAYER AREA",myTournaments:"MY",tournaments:"TOURNAMENTS.",joined:"JOINED",loadingRegs:"LOADING YOUR REGISTRATIONS...",noRegs:"NO ACTIVE REGISTRATIONS",noRegsText:"You have not registered for a tournament yet.",explore:"EXPLORE TOURNAMENTS ↗",date:"DATE",dateTbd:"DATE TO BE ANNOUNCED",location:"LOCATION",locationTbd:"To be announced",active:"REGISTRATION ACTIVE",view:"VIEW TOURNAMENT ↗",myMatches:"MY",matches:"MATCHES.",loadingMatches:"LOADING MATCHES...",noMatches:"No tournament matches have been scheduled for your account yet.",round:"ROUND",match:"MATCH",open:"OPEN MATCH ROOM ↗",vs:"VS"
 };
 const [tournaments,setTournaments]=useState<Tournament[]>([]);
 const [items,setItems]=useState<Match[]>([]);
 const [busy,setBusy]=useState(true);
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!supabase){setBusy(false);return;}
   const {data:{session}}=await supabase.auth.getSession();
   if(!session){setBusy(false);return;}
   const [{data:profile},{data:ownRegistrations},{data:publicRegistrations}]=await Promise.all([
    supabase.from("profiles").select("steam_id").eq("id",session.user.id).maybeSingle(),
    supabase.from("tournament_registrations").select("tournament_id,user_id,status,roster").eq("user_id",session.user.id).in("status",["PENDING","REGISTERED"]),
    supabase.from("tournament_registrations").select("tournament_id,user_id,status,roster").eq("status","REGISTERED")
   ]);
   const mySteamId=profile?.steam_id?steamIdFrom(profile.steam_id):"";
   const combined=[...(ownRegistrations||[]),...(publicRegistrations||[])] as Registration[];
   const matching=combined.filter(registration=>registration.user_id===session.user.id||!!mySteamId&&(registration.roster||[]).some(player=>typeof player.steam==="string"&&steamIdFrom(player.steam)===mySteamId));
   const tournamentIds=[...new Set(matching.map(r=>r.tournament_id))];
   if(tournamentIds.length){
    const {data}=await supabase.from("tournaments").select("id,title,game,event_date,location,format,status").in("id",tournamentIds).order("event_date",{ascending:true,nullsFirst:false});
    if(active)setTournaments((data||[]) as Tournament[]);
   }
   const {data:members}=await supabase.from("tournament_players").select("tournament_id").eq("user_id",session.user.id);
   const matchIds=[...new Set((members||[]).map(m=>m.tournament_id))];
   if(matchIds.length){
    const {data:matches}=await supabase.from("tournament_matches").select("id,tournament_id,round_number,match_number,team_a,team_b,winner_team,status").in("tournament_id",matchIds).order("round_number").order("match_number");
    if(active)setItems((matches||[]) as Match[]);
   }
   if(active)setBusy(false);
  }
  load();
  return()=>{active=false;};
 },[]);
 const dateLabel=(value:string|null)=>value?new Intl.DateTimeFormat(ru?"ru-RU":lv?"lv-LV":"en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value)):t.dateTbd;
 return <>
  <section className={styles.section}>
   <div className={styles.kicker}>{t.area} <i/></div>
   <div className={styles.headingRow}><h2>{t.myTournaments} <em>{t.tournaments}</em></h2><span className={styles.count}>{tournaments.length.toString().padStart(2,"0")} {t.joined}</span></div>
   {busy?<p className={styles.empty}>{t.loadingRegs}</p>:tournaments.length===0?<div className={styles.emptyCard}><span className={styles.emptyMark}>VA</span><div><strong>{t.noRegs}</strong><p>{t.noRegsText}</p></div><Link href="/tournaments">{t.explore}</Link></div>:<div className={styles.grid}>{tournaments.map(item=><article className={styles.card} key={item.id}><div className={styles.cardTop}><span>{item.game} / {item.format||"TOURNAMENT"}</span><b>{item.status.replaceAll("_"," ")}</b></div><h3>{item.title}</h3><div className={styles.meta}><span><i>{t.date}</i>{dateLabel(item.event_date)}</span><span><i>{t.location}</i>{item.location||(ru?"Не указано":lv?"Nav norādīts":t.locationTbd)}</span></div><div className={styles.cardBottom}><span><i/> {t.active}</span><Link href={"/tournaments/"+item.id}>{t.view}</Link></div></article>)}</div>}
  </section>
  <section className={styles.section}>
   <div className={styles.kicker}>{t.area} <i/></div>
   <div className={styles.headingRow}><h2>{t.myMatches} <em>{t.matches}</em></h2></div>
   {busy?<p className={styles.empty}>{t.loadingMatches}</p>:items.length===0?<p className={styles.empty}>{t.noMatches}</p>:<div className={styles.grid}>{items.map(item=><Link href={"/account/matches/"+item.id} className={styles.matchCard} key={item.id}><small>{t.round} {item.round_number} / {t.match} {item.match_number}</small><strong>{item.team_a||"TBD"} <i>{t.vs}</i> {item.team_b||"TBD"}</strong><span>{t.open}</span></Link>)}</div>}
  </section>
 </>;
}
