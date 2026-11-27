"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./smm.css";

type Post = { id:string; platform:string; title:string; caption:string; scheduled_at:string|null; status:string; notes:string; metrics:Record<string,number>; created_at:string };
type Draft = { title:string; platform:string; caption:string; scheduled_at:string; notes:string };
const empty:Draft={title:"",platform:"INSTAGRAM",caption:"",scheduled_at:"",notes:""};

export default function ClaudeSmmPage(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [denied,setDenied]=useState(false);
  const [posts,setPosts]=useState<Post[]>([]);
  const [draft,setDraft]=useState<Draft>(empty);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [tab,setTab]=useState<"OVERVIEW"|"CONTENT"|"CALENDAR"|"ANALYTICS">("OVERVIEW");
  const [metricPost,setMetricPost]=useState("");
  const [metrics,setMetrics]=useState({reach:"",likes:"",comments:"",shares:""});

  const api=useCallback(async(method:"GET"|"POST"|"PATCH",body?:unknown)=>{
    const {data:{session}}=await supabase!.auth.getSession();
    if(!session){router.replace("/login?next=/organizer/smm");throw new Error("Session expired. Sign in again.");}
    const res=await fetch("/api/organizer/smm",{method,headers:{Authorization:`Bearer ${session.access_token}`,...(method!=="GET"?{"Content-Type":"application/json"}:{})},...(method!=="GET"?{body:JSON.stringify(body)}:{}),cache:"no-store"});
    const json=await res.json();
    if(!res.ok){if(res.status===403)setDenied(true);throw new Error(json.error||"Request failed.");}
    return json;
  },[router]);

  const load=useCallback(async()=>{const result=await api("GET");setPosts(result.posts||[]);},[api]);
  useEffect(()=>{let active=true;(async()=>{if(!supabase){setDenied(true);setLoading(false);return;}const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace("/login?next=/organizer/smm");return;}try{const result=await api("GET");if(active)setPosts(result.posts||[]);}catch(e){if(active)setMessage(e instanceof Error?e.message:"Could not load SMM.");}if(active)setLoading(false);})();return()=>{active=false;};},[api,router]);

  const stats=useMemo(()=>({total:posts.length,pending:posts.filter(p=>p.status==="PENDING_APPROVAL").length,approved:posts.filter(p=>p.status==="APPROVED").length,published:posts.filter(p=>p.status==="PUBLISHED").length}),[posts]);
  const upcoming=useMemo(()=>posts.filter(p=>p.scheduled_at).sort((a,b)=>new Date(a.scheduled_at!).getTime()-new Date(b.scheduled_at!).getTime()),[posts]);

  async function createPost(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{await api("POST",{...draft,scheduled_at:draft.scheduled_at?new Date(draft.scheduled_at).toISOString():null});setDraft(empty);await load();setMessage("Черновик сохранён.");}catch(err){setMessage(err instanceof Error?err.message:"Ошибка сохранения.");}finally{setBusy(false);}}
  async function changeStatus(post:Post,status:string){setBusy(true);setMessage("");try{await api("PATCH",{id:post.id,status});await load();}catch(e){setMessage(e instanceof Error?e.message:"Не удалось обновить публикацию.");}finally{setBusy(false);}}
  async function saveMetrics(){if(!metricPost)return;setBusy(true);try{await api("PATCH",{id:metricPost,status:posts.find(p=>p.id===metricPost)?.status||"PUBLISHED",metrics});await load();setMessage("Метрики обновлены. Источник: ручной ввод.");}catch(e){setMessage(e instanceof Error?e.message:"Не удалось сохранить метрики.");}finally{setBusy(false);}}

  if(loading)return <main className="smm-page"><div className="smm-loading">ПРОВЕРКА ДОСТУПА...</div></main>;
  if(denied)return <main className="smm-page"><div className="smm-denied"><span>VENTSPILS ARENA / PRIVATE WORKSPACE</span><h1>ДОСТУП ЗАКРЫТ</h1><p>CLAUDE SMM доступен только аккаунту SUPER_ADMIN.</p><Link href="/organizer">ВЕРНУТЬСЯ В ORGANIZER</Link></div></main>;

  return <main className="smm-page">
    <header className="smm-top"><Link href="/organizer" className="smm-back">← ORGANIZER</Link><div className="smm-wordmark">CLAUDE <i>SMM</i></div><span className="smm-private">SUPERADMIN WORKSPACE</span></header>
    <div className="smm-shell">
      <section className="smm-hero"><span>VENTSPILS ARENA / SOCIAL OPERATIONS</span><h1>CLAUDE SMM<i>.</i></h1><p>Контент, согласование публикаций и аналитика в одном рабочем пространстве.</p><div className="smm-agent-state"><b></b> РЕЖИМ: ПОДГОТОВКА С СОГЛАСОВАНИЕМ</div></section>
      <nav className="smm-tabs">{(["OVERVIEW","CONTENT","CALENDAR","ANALYTICS"] as const).map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{({OVERVIEW:"ОБЗОР",CONTENT:"КОНТЕНТ",CALENDAR:"КАЛЕНДАРЬ",ANALYTICS:"АНАЛИТИКА"} as const)[x]}</button>)}</nav>
      {message&&<div className="smm-message">{message}</div>}
      {tab==="OVERVIEW"&&<><div className="smm-stats"><div><strong>{stats.total}</strong><span>ВСЕ МАТЕРИАЛЫ</span></div><div><strong>{stats.pending}</strong><span>НА СОГЛАСОВАНИИ</span></div><div><strong>{stats.approved}</strong><span>ОДОБРЕНО</span></div><div><strong>{stats.published}</strong><span>ОПУБЛИКОВАНО</span></div></div><div className="smm-columns"><section className="smm-panel"><div className="smm-panel-head"><span>01 / APPROVAL QUEUE</span><h2>ОЖИДАЮТ СОГЛАСОВАНИЯ</h2></div>{posts.filter(p=>p.status==="PENDING_APPROVAL").length===0?<p className="smm-muted">Нет публикаций на согласовании.</p>:posts.filter(p=>p.status==="PENDING_APPROVAL").map(p=><article className="smm-post" key={p.id}><div><b>{p.title}</b><small>{p.platform} · {p.status}</small><p>{p.caption}</p></div><div className="smm-actions"><button onClick={()=>changeStatus(p,"APPROVED")} disabled={busy}>ОДОБРИТЬ</button><button className="quiet" onClick={()=>changeStatus(p,"REJECTED")} disabled={busy}>ОТКЛОНИТЬ</button></div></article>)}</section><section className="smm-panel"><div className="smm-panel-head"><span>02 / NEXT UP</span><h2>БЛИЖАЙШИЕ ПУБЛИКАЦИИ</h2></div>{upcoming.slice(0,4).map(p=><div className="smm-upcoming" key={p.id}><span>{new Date(p.scheduled_at!).toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span><b>{p.title}</b><small>{p.status}</small></div>)}{upcoming.length===0&&<p className="smm-muted">Запланированных публикаций пока нет.</p>}</section></div></>}
      {tab==="CONTENT"&&<div className="smm-columns content-layout"><section className="smm-panel"><div className="smm-panel-head"><span>01 / CREATE</span><h2>НОВАЯ ПУБЛИКАЦИЯ</h2></div><form className="smm-form" onSubmit={createPost}><label>НАЗВАНИЕ<input required maxLength={140} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Например, Winter Cup — регистрация"/></label><label>ПЛАТФОРМА<select value={draft.platform} onChange={e=>setDraft({...draft,platform:e.target.value})}><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option><option value="TIKTOK">TikTok</option><option value="OTHER">Другое</option></select></label><label>ТЕКСТ ПУБЛИКАЦИИ<textarea rows={7} maxLength={5000} value={draft.caption} onChange={e=>setDraft({...draft,caption:e.target.value})} placeholder="Текст поста..."/></label><label>ПЛАНИРУЕМАЯ ДАТА И ВРЕМЯ<input type="datetime-local" value={draft.scheduled_at} onChange={e=>setDraft({...draft,scheduled_at:e.target.value})}/></label><label>ЗАМЕТКИ ДЛЯ КОМАНДЫ<textarea rows={3} maxLength={2000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><button disabled={busy}>{busy?"СОХРАНЕНИЕ...":"СОХРАНИТЬ ЧЕРНОВИК"}</button></form></section><section className="smm-panel"><div className="smm-panel-head"><span>02 / LIBRARY</span><h2>КОНТЕНТ-БИБЛИОТЕКА</h2></div>{posts.map(p=><article className="smm-post" key={p.id}><div><b>{p.title}</b><small>{p.platform} · {p.status}</small><p>{p.caption||"Без текста"}</p>{p.scheduled_at&&<small>{new Date(p.scheduled_at).toLocaleString("ru-RU")}</small>}</div><div className="smm-actions">{p.status==="DRAFT"&&<button onClick={()=>changeStatus(p,"PENDING_APPROVAL")} disabled={busy}>НА СОГЛАСОВАНИЕ</button>}{p.status==="APPROVED"&&<button onClick={()=>changeStatus(p,"PUBLISHED")} disabled={busy}>ОТМЕТИТЬ ОПУБЛИКОВАННЫМ</button>}{p.status==="REJECTED"&&<button onClick={()=>changeStatus(p,"DRAFT")} disabled={busy}>ВЕРНУТЬ В ЧЕРНОВИКИ</button>}</div></article>)}{posts.length===0&&<p className="smm-muted">Здесь появятся созданные материалы.</p>}</section></div>}
      {tab==="CALENDAR"&&<section className="smm-panel"><div className="smm-panel-head"><span>01 / SCHEDULE</span><h2>КОНТЕНТ-КАЛЕНДАРЬ</h2></div>{upcoming.length?upcoming.map(p=><div className="smm-calendar-row" key={p.id}><time>{new Date(p.scheduled_at!).toLocaleString("ru-RU",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</time><div><b>{p.title}</b><small>{p.platform} · {p.status}</small></div></div>):<p className="smm-muted">Добавь дату публикации в разделе «Контент».</p>}</section>}
      {tab==="ANALYTICS"&&<section className="smm-panel"><div className="smm-panel-head"><span>01 / PERFORMANCE</span><h2>АНАЛИТИКА ПУБЛИКАЦИЙ</h2></div><p className="smm-note">Метрики вводятся вручную. Подключение Instagram / Meta / TikTok API пока не настроено; автоматические показатели не имитируются.</p><div className="smm-metric-form"><label>ПУБЛИКАЦИЯ<select value={metricPost} onChange={e=>setMetricPost(e.target.value)}><option value="">Выбери публикацию</option>{posts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>{(["reach","likes","comments","shares"] as const).map(k=><label key={k}>{({reach:"ОХВАТ",likes:"ЛАЙКИ",comments:"КОММЕНТАРИИ",shares:"РЕПОСТЫ"} as const)[k]}<input type="number" min="0" value={metrics[k]} onChange={e=>setMetrics({...metrics,[k]:e.target.value})}/></label>)}<button disabled={busy||!metricPost} onClick={saveMetrics}>СОХРАНИТЬ МЕТРИКИ</button></div><div className="smm-analytics-list">{posts.filter(p=>p.status==="PUBLISHED").map(p=><div key={p.id}><b>{p.title}</b><span>Охват {p.metrics?.reach||0} · Лайки {p.metrics?.likes||0} · Комментарии {p.metrics?.comments||0} · Репосты {p.metrics?.shares||0}</span></div>)}</div></section>}
      <footer className="smm-footer">VENTSPILS ARENA · PRIVATE SMM WORKSPACE <span>TIMEZONE: EUROPE/RIGA</span></footer>
    </div>
  </main>;
}
