"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import { supabase } from "../../lib/supabase";
import styles from "./matches.module.css";

type Tournament = { id:string; title:string; game:string; event_date:string|null; location:string; format:string; status:string };
type Match = { id:string; tournament_id:string; round_number:number; match_number:number; team_a:string|null; team_b:string|null; winner_team:string|null; status:string; score_a:number|null; score_b:number|null; cybershoke_url:string|null; map_name:string|null };
type Registration = { tournament_id:string; user_id:string; team_name:string; status:string; roster:{nickname?:string;steam?:string}[]|null };

function steamIdFrom(value:string){
 const match=value.match(/(?:^|\\D)(\\d{17})(?:\\D|$)/);
 return match?.[1]||value.trim();
}

export default function MyMatches(){
 const {language}=useLanguage();
 const ru=language==="ru",lv=language==="lv";
 const t=ru?{
  area:"КАБИНЕТ ИГРОКА",myTournaments:"МОИ",tournaments:"ТУРНИРЫ.",joined:"КОМАНД",loadingRegs:"ЗАГРУЗКА РЕГИСТРАЦИЙ...",noRegs:"НЕТ АКТИВНЫХ РЕГИСТРАЦИЙ",noRegsText:"Ты ещё не зарегистрировался ни на один турнир.",explore:"СМОТРЕТЬ ТУРНИРЫ ↗",date:"ДАТА",dateTbd:"ДАТА УТОЧНЯЕТСЯ",location:"МЕСТО",locationTbd:"Не указано",active:"ЗАЯВКА ПОДАНА",view:"ОТКРЫТЬ ТУРНИР ↗",myMatches:"МОИ",matches:"МАТЧИ.",loadingMatches:"ЗАГРУЗКА МАТЧЕЙ...",noMatches:"Для твоей команды пока не создано матчей.",round:"РАУНД",match:"МАТЧ",open:"ВОЙТИ В CYBERSHOKE ↗",vs:"ПРОТИВ",map:"КАРТА",roomMissing:"КОМНАТА ЕЩЁ НЕ СОЗДАНА",live:"ИДЁТ МАТЧ",upcoming:"ОЖИДАЕТСЯ",done:"ЗАВЕРШЁН",score:"СЧЁТ",team:"ТВОЯ КОМАНДА"
 }:lv?{
  area:"SPĒLĒTĀJA ZONA",myTournaments:"MANI",tournaments:"TURNĪRI.",joined:"KOMANDAS",loadingRegs:"IELĀDĒ PIETEIKUMUS...",noRegs:"NAV AKTĪVU PIETEIKUMU",noRegsText:"Tu vēl neesi reģistrējies nevienam turnīram.",explore:"APSKATĪT TURNĪRUS ↗",date:"DATUMS",dateTbd:"DATUMS TIKS PAZIŅOTS",location:"VIETA",locationTbd:"Nav norādīts",active:"PIETEIKUMS IESNIEGTS",view:"SKATĪT TURNĪRU ↗",myMatches:"MANAS",matches:"SPĒLES.",loadingMatches:"IELĀDĒ SPĒLES...",noMatches:"Tavai komandai vēl nav izveidotas spēles.",round:"KĀRTA",match:"SPĒLE",open:"ATVĒRT CYBERSHOKE ↗",vs:"PRET",map:"KARTE",roomMissing:"ISTABA VĒL NAV IZVEIDOTA",live:"SPĒLE NOTIEK",upcoming:"GAIDĀMA",done:"PABEIGTA",score:"REZULTĀTS",team:"TAVA KOMANDA"
 }:{
  area:"PLAYER AREA",myTournaments:"MY",tournaments:"TOURNAMENTS.",joined:"TEAMS",loadingRegs:"LOADING YOUR REGISTRATIONS...",noRegs:"NO ACTIVE REGISTRATIONS",noRegsText:"You have not registered for a tournament yet.",explore:"EXPLORE TOURNAMENTS ↗",date:"DATE",dateTbd:"DATE TO BE ANNOUNCED",location:"LOCATION",locationTbd:"Not specified",active:"REGISTRATION SUBMITTED",view:"VIEW TOURNAMENT ↗",myMatches:"MY",matches:"MATCHES.",loadingMatches:"LOADING MATCHES...",noMatches:"No matches have been created for your team yet.",round:"ROUND",match:"MATCH",open:"JOIN CYBERSHOKE ↗",vs:"VS",map:"MAP",roomMissing:"ROOM NOT CREATED YET",live:"LIVE NOW",upcoming:"UPCOMING",done:"COMPLETED",score:"SCORE",team:"YOUR TEAM"
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
   const [{data:profile},{data:registrations}] = await Promise.all([
    supabase.from("profiles").select("steam_id").eq("id",session.user.id).maybeSingle(),
    supabase.from("tournament_registrations").select("tournament_id,user_id,team_name,status,roster").eq("status","REGISTERED")
   ]);
   const steam=profile?.steam_id?steamIdFrom(profile.steam_id):"";
   const mine=((registrations||[]) as Registration[]).filter(reg=>
    reg.user_id===session.user.id ||
    (!!steam && (reg.roster||[]).some(player=>typeof player.steam==="string" && steamIdFrom(player.steam)===steam))
   );
   const teamNamesByTournament=new Map<string,Set<string>>();
   for(const reg of mine){
    if(!reg.team_name)continue;
    if(!teamNamesByTournament.has(reg.tournament_id))teamNamesByTournament.set(reg.tournament_id,new Set());
    teamNamesByTournament.get(reg.tournament_id)!.add(reg.team_name);
   }
   const tournamentIds=[...teamNamesByTournament.keys()];
   if(tournamentIds.length){
    const [{data:tourneys},{data:allMatches}] = await Promise.all([
     supabase.from("tournaments").select("id,title,game,event_date,location,format,status").in("id",tournamentIds).order("event_date",{ascending:true,nullsFirst:false}),
     supabase.from("tournament_matches").select("id,tournament_id,round_number,match_number,team_a,team_b,winner_team,status,score_a,score_b,cybershoke_url,map_name").in("tournament_id",tournamentIds).order("round_number").order("match_number")
    ]);
    if(active){
     setTournaments((tourneys||[]) as Tournament[]);
     const teamMatches=((allMatches||[]) as Match[]).filter(match=>{
      const names=teamNamesByTournament.get(match.tournament_id);
      return !!names && (names.has(match.team_a||"") || names.has(match.team_b||""));
     });
     setItems(teamMatches);
    }
   }
   if(active)setBusy(false);
  }
  load();
  return()=>{active=false;};
 },[]);
 const dateLabel=(value:string|null)=>value?new Intl.DateTimeFormat(ru?"ru-RU":lv?"lv-LV":"en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value)):t.dateTbd;
 const statusLabel=(status:string)=>status==="LIVE"?t.live:status==="COMPLETED"?t.done:t.upcoming;
 return <>
  <section className={styles.section}>
   <div className={styles.kicker}>{t.area} <i/></div>
   <div className={styles.headingRow}><h2>{t.myTournaments} <em>{t.tournaments}</em></h2><span className={styles.count}>{tournaments.length.toString().padStart(2,"0")} {t.joined}</span></div>
   {busy?<p className={styles.empty}>{t.loadingRegs}</p>:tournaments.length===0?<div className={styles.emptyCard}><span className={styles.emptyMark}>VA</span><div><strong>{t.noRegs}</strong><p>{t.noRegsText}</p></div><Link href="/tournaments">{t.explore}</Link></div>:<div className={styles.grid}>{tournaments.map(item=><article className={styles.card} key={item.id}><div className={styles.cardTop}><span>{item.game} / {item.format||"TOURNAMENT"}</span><b>{item.status.replaceAll("_"," ")}</b></div><h3>{item.title}</h3><div className={styles.meta}><span><i>{t.date}</i>{dateLabel(item.event_date)}</span><span><i>{t.location}</i>{item.location||(ru?"Не указано":lv?"Nav norādīts":t.locationTbd)}</span></div><div className={styles.cardBottom}><span><i/> {t.active}</span><Link href={"/tournaments/"+item.id}>{t.view}</Link></div></article>)}</div>}
  </section>
  <section className={styles.section}>
   <div className={styles.kicker}>{t.area} <i/></div>
   <div className={styles.headingRow}><h2>{t.myMatches} <em>{t.matches}</em></h2></div>
   {busy?<p className={styles.empty}>{t.loadingMatches}</p>:items.length===0?<p className={styles.empty}>{t.noMatches}</p>:<div className={styles.grid}>{items.map(item=>{
    const ownTeam=item.team_a&&tournaments.length?item.team_a:item.team_b||item.team_a||"—";
    const isA=ownTeam===item.team_a;
    return <article className={styles.matchCard} key={item.id}>
     <div className={styles.matchTop}><small>{t.round} {item.round_number} / {t.match} {item.match_number}</small><b className={item.status==="LIVE"?styles.liveStatus:""}>{statusLabel(item.status)}</b></div>
     <strong>{item.team_a||"TBD"} <i>{t.vs}</i> {item.team_b||"TBD"}</strong>
     <div className={styles.matchMeta}><span><i>{t.team}</i>{ownTeam}</span><span><i>{t.map}</i>{item.map_name||"—"}</span>{item.score_a!==null&&item.score_b!==null&&<span><i>{t.score}</i>{item.score_a} : {item.score_b}</span>}</div>
     {item.cybershoke_url?<a className={styles.roomButton} href={item.cybershoke_url} target="_blank" rel="noopener noreferrer">{t.open}</a>:<span className={styles.roomMissing}>{t.roomMissing}</span>}
    </article>;
   })}</div>}
  </section>
 </>;
}
