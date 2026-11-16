"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../components/LanguageProvider";

type Message = { id:string; subject:string; body:string; created_at:string; read_at:string|null; tournaments?:{title:string}|null };
export default function MessagesPage(){
 const {language}=useLanguage(); const router=useRouter();
 const ru=language==="ru", lv=language==="lv";
 const [rows,setRows]=useState<Message[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const title=ru?"СООБЩЕНИЯ":lv?"ZIŅOJUMI":"MESSAGES";
 const empty=ru?"У вас пока нет сообщений.":lv?"Jums vēl nav ziņojumu.":"You have no messages yet.";
 useEffect(()=>{let alive=true;(async()=>{if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}const{data:{session}}=await supabase.auth.getSession();if(!session){router.replace("/login");return;}
 const{data,error}=await supabase.from("arena_messages").select("id,subject,body,created_at,read_at,tournaments(title)").eq("recipient_id",session.user.id).order("created_at",{ascending:false});
 if(!alive)return;if(error)setError(error.message);else{setRows((data||[]) as unknown as Message[]);const unread=(data||[]).filter((m:any)=>!m.read_at).map((m:any)=>m.id);if(unread.length)await supabase.from("arena_messages").update({read_at:new Date().toISOString()}).in("id",unread);}setLoading(false);})();return()=>{alive=false}},[router]);
 return <main className="account-page"><div className="account-shell"><div className="account-breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/account">{ru?"ЛИЧНЫЙ КАБИНЕТ":lv?"PERSONĪGAIS KABINETS":"PERSONAL CABINET"}</Link><span>/</span>{title}</div><div className="account-heading"><div><span className="account-kicker">VENTSPILS ARENA / INBOX</span><h1>{title}<br/><em>{ru?"АРЕНЫ.":lv?"ARĒNA.":"FROM ARENA."}</em></h1></div><span className="account-mark">✉</span></div>
 {loading?<p className="account-loading">{ru?"ЗАГРУЗКА...":lv?"IELĀDĒ...":"LOADING..."}</p>:error?<p className="account-message">{error}</p>:rows.length===0?<section className="profile-panel" style={{padding:28,color:"#aaa"}}>{empty}</section>:<div style={{display:"grid",gap:12}}>{rows.map(m=><article key={m.id} style={{padding:22,border:"1px solid #383a42",background:"linear-gradient(145deg,#191b21,#101115)"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",color:"#ef666d",fontSize:9,fontWeight:800,letterSpacing:1.4}}><span>{m.tournaments?.title||"VENTSPILS ARENA"}</span><time>{new Date(m.created_at).toLocaleString(language==="ru"?"ru-RU":language==="lv"?"lv-LV":"en-GB")}</time></div><h2 style={{font:"900 27px 'Barlow Condensed',Impact",margin:"12px 0 8px"}}>{m.subject}</h2><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",color:"#c5c6cb",fontSize:13,lineHeight:1.8,margin:0}}>{m.body}</p></article>)}</div>}
 <div className="admin-footer-actions"><Link href="/account">← {ru?"ЛИЧНЫЙ КАБИНЕТ":lv?"PERSONĪGAIS KABINETS":"PERSONAL CABINET"}</Link><Link href="/">HOME ↗</Link></div></div></main>;
}
