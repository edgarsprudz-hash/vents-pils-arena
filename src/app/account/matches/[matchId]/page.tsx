"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useLanguage} from "../../../components/LanguageProvider";
import {supabase} from "../../../../lib/supabase";
import styles from "./room.module.css";

type Match={id:string;tournament_id:string;round_number:number;match_number:number;team_a:string|null;team_b:string|null;winner_team:string|null;status:string;score_a:number|null;score_b:number|null;cybershoke_url:string|null;map_name:string|null};
type Player={nickname?:string;steam?:string};
type Team={team_name:string;captain_name:string;roster:Player[];status:string};
type Tournament={title:string;game:string;event_date:string|null};

export default function MatchRoomPage(){
 const {matchId}=useParams<{matchId:string}>();
 const {language}=useLanguage();
 const ru=language==="ru",lv=language==="lv";
 const [match,setMatch]=useState<Match|null>(null);
 const [tournament,setTournament]=useState<Tournament|null>(null);
 const [teams,setTeams]=useState<Team[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const labels=ru?{back:"НАЗАД В МОИ МАТЧИ",room:"КОМНАТА МАТЧА",round:"РАУНД",match:"МАТЧ",live:"МАТЧ ИДЁТ",upcoming:"ОЖИДАЕТСЯ",done:"ЗАВЕРШЁН",your:"ВАША КОМАНДА",opponent:"СОПЕРНИК",captain:"КАПИТАН",players:"ИГРОКИ",map:"КАРТА",date:"ДАТА",join:"JOIN CYBERSHOKE ROOM ↗",missing:"АДМИНИСТРАТОР ЕЩЁ НЕ ДОБАВИЛ ССЫЛКУ НА КОМНАТУ",empty:"СОСТАВ КОМАНДЫ НЕ НАЙДЕН",vs:"ПРОТИВ"}:lv?{back:"ATPAKAĻ UZ MANĀM SPĒLĒM",room:"SPĒLES TELPA",round:"KĀRTA",match:"SPĒLE",live:"SPĒLE NOTIEK",upcoming:"GAIDĀMA",done:"PABEIGTA",your:"TAVA KOMANDA",opponent:"PRETINIEKS",captain:"KAPTEINIS",players:"SPĒLĒTĀJI",map:"KARTE",date:"DATUMS",join:"PIEVIENOTIES CYBERSHOKE ↗",missing:"ADMINISTRATORS VĒL NAV PIEVIENOJIS TELPAS SAITI",empty:"KOMANDAS SASTĀVS NAV ATRASTS",vs:"PRET"}:{back:"BACK TO MY MATCHES",room:"MATCH ROOM",round:"ROUND",match:"MATCH",live:"LIVE NOW",upcoming:"UPCOMING",done:"COMPLETED",your:"YOUR TEAM",opponent:"OPPONENT",captain:"CAPTAIN",players:"PLAYERS",map:"MAP",date:"DATE",join:"JOIN CYBERSHOKE ROOM ↗",missing:"THE ADMIN HAS NOT ADDED A ROOM LINK YET",empty:"TEAM ROSTER NOT FOUND",vs:"VS"};
 useEffect(()=>{let active=true;async function load(){if(!supabase){setError("Database connection unavailable.");setLoading(false);return;}
  const {data:m,error:mErr}=await supabase.from("tournament_matches").select("id,tournament_id,round_number,match_number,team_a,team_b,winner_team,status,score_a,score_b,cybershoke_url,map_name").eq("id",matchId).maybeSingle();
  if(mErr||!m){if(active){setError(mErr?.message||"Match not found.");setLoading(false);}return;}
  const [{data:registrations},{data:event}]=await Promise.all([
   supabase.from("tournament_registrations").select("team_name,captain_name,roster,status").eq("tournament_id",m.tournament_id).eq("status","REGISTERED"),
   supabase.from("tournaments").select("title,game,event_date").eq("id",m.tournament_id).maybeSingle()
  ]);
  if(active){setMatch(m as Match);setTeams((registrations||[]) as Team[]);setTournament(event as Tournament|null);setLoading(false);}
 }load();return()=>{active=false;}},[matchId]);
 if(loading)return <main className={styles.page}><div className={styles.shell}><p className={styles.loading}>LOADING MATCH ROOM...</p></div></main>;
 if(error||!match)return <main className={styles.page}><div className={styles.shell}><Link className={styles.back} href="/account">{labels.back}</Link><h1>MATCH <em>UNAVAILABLE.</em></h1><p className={styles.error}>{error}</p></div></main>;
 const teamA=teams.find(team=>team.team_name===match.team_a);
 const teamB=teams.find(team=>team.team_name===match.team_b);
 const status=match.status==="LIVE"?labels.live:match.status==="COMPLETED"?labels.done:labels.upcoming;
 const teamCard=(team:Team|undefined,name:string|null,side:"a"|"b")=><article className={styles.teamCard} key={side}><div className={styles.teamLabel}>{side==="a"?labels.your:labels.opponent}</div><h2>{name||"TBD"}</h2><p className={styles.captain}>{labels.captain}: {team?.captain_name||"—"}</p><div className={styles.rosterTitle}>{labels.players} <span>{team?.roster?.length||0}</span></div>{team?.roster?.length?<div className={styles.players}>{team.roster.map((player,index)=><div className={styles.player} key={index}><span className={styles.playerNumber}>{String(index+1).padStart(2,"0")}</span><strong>{player.nickname||"PLAYER"}</strong>{player.steam&&<a href={player.steam.startsWith("http")?player.steam:"https://steamcommunity.com/profiles/"+player.steam} target="_blank" rel="noreferrer">STEAM ↗</a>}</div>)}</div>:<p className={styles.noRoster}>{labels.empty}</p>}</article>;
 return <main className={styles.page}><div className={styles.shell}>
  <div className={styles.top}><Link className={styles.back} href="/account">← {labels.back}</Link><span>VENTSPILS ARENA / {labels.room}</span></div>
  <header className={styles.header}><div><span className={styles.eyebrow}>{tournament?.game||"TOURNAMENT"} / {labels.room}</span><h1>{tournament?.title||"TOURNAMENT"}<em>.</em></h1><p>{labels.round} {match.round_number} · {labels.match} {match.match_number}</p></div><span className={match.status==="LIVE"?styles.live:styles.status}>{status}</span></header>
  <section className={styles.scoreboard}><div className={styles.scoreTeam}><span>{match.team_a||"TBD"}</span><strong>{match.score_a??"—"}</strong></div><div className={styles.versus}>{labels.vs}</div><div className={styles.scoreTeam}><span>{match.team_b||"TBD"}</span><strong>{match.score_b??"—"}</strong></div></section>
  <div className={styles.teams}>{teamCard(teamA,match.team_a,"a")}{teamCard(teamB,match.team_b,"b")}</div>
  <section className={styles.roomPanel}><div className={styles.roomInfo}><span className={styles.eyebrow}>MATCH SERVER</span><h2>CYBERSHOKE <em>ROOM.</em></h2><div className={styles.roomMeta}><span><i>{labels.map}</i>{match.map_name||"—"}</span><span><i>{labels.date}</i>{tournament?.event_date?new Date(tournament.event_date).toLocaleString(ru?"ru-RU":lv?"lv-LV":"en-GB"):"—"}</span></div></div>{match.cybershoke_url?<a className={styles.join} href={match.cybershoke_url} target="_blank" rel="noopener noreferrer">{labels.join}</a>:<p className={styles.missing}>{labels.missing}</p>}</section>
  <footer className={styles.footer}>VENTSPILS ARENA <span>COMPETE · CONNECT · CONQUER</span></footer>
 </div></main>;
}
