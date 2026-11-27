"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./smm.css";

type Post = { id:string; created_at:string; format:"POST"|"STORY"|"REEL"; language:string; topic:string; objective:string; title:string; caption:string; hashtags:string; visual_brief:string; recommended_time:string; status:string; };
export default function SmmPage(){
  const router=useRouter();
  const [loading,setLoading]=useState(true),[denied,setDenied]=useState(false),[busy,setBusy]=useState(false);
  const [posts,setPosts]=useState<Post[]>([]);
  const [topic,setTopic]=useState("VENTSPILS ARENA platform");
  const [objective,setObjective]=useState("Increase awareness and attract tournament participants");
  const [format,setFormat]=useState<"POST"|"STORY"|"REEL">("POST");
  const [language,setLanguage]=useState("lv");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [workingId,setWorkingId]=useState("");
  const token=useCallback(async()=>{const {data:{session}}=await supabase!.auth.getSession();if(!session){router.replace("/login?next=/smm");throw new Error("Session expired. Sign in again.");}return session.access_token;},[router]);
  const load=useCallback(async()=>{const access=await token();const res=await fetch("/api/smm",{headers:{Authorization:"Bearer "+access},cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not load queue.");setPosts(data.posts||[]);},[token]);
  useEffect(()=>{let active=true;(async()=>{if(!supabase){setDenied(true);setLoading(false);return;}const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace("/login?next=/smm");return;}const {data:profile,error}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();if(!active)return;if(error||profile?.role!=="SUPER_ADMIN"){setDenied(true);setLoading(false);return;}try{await load();}catch(e){setError(e instanceof Error?e.message:"Unable to load SMM.");}if(active)setLoading(false);})();return()=>{active=false;};},[load,router]);
  async function generate(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");try{const access=await token();const res=await fetch("/api/smm/generate",{method:"POST",headers:{Authorization:"Bearer "+access,"Content-Type":"application/json"},body:JSON.stringify({topic,objective,format,language})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Claude could not create the draft.");setNotice("Claude created a draft. Review every detail before requesting approval.");await load();}catch(e){setError(e instanceof Error?e.message:"Generation failed.");}finally{setBusy(false);}}
  async function action(id:string,action:"APPROVE"|"REJECT"|"REQUEST_APPROVAL"){setWorkingId(id);setError("");setNotice("");try{const access=await token();const res=await fetch("/api/smm",{method:"POST",headers:{Authorization:"Bearer "+access,"Content-Type":"application/json"},body:JSON.stringify({id,action})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Action failed.");setNotice(data.note||"Content status updated.");await load();}catch(e){setError(e instanceof Error?e.message:"Action failed.");}finally{setWorkingId("");}}
  async function signOut(){await supabase?.auth.signOut();router.replace("/login");}
  if(loading)return <main className="smm-page"><div className="smm-denied">CHECKING SUPERADMIN ACCESS...</div></main>;
  if(denied)return <main className="smm-page"><section className="smm-denied"><span className="smm-kicker">PRIVATE APPLICATION</span><h1>ACCESS RESTRICTED.</h1><p>CLAUDE SMM is available only to VENTSPILS ARENA SuperAdmin accounts.</p><a href="/login">SIGN IN</a></section></main>;
  return <main className="smm-page">
    <header className="smm-top"><a className="smm-brand" href="/smm"><span className="smm-mark">C</span><span><strong>CLAUDE SMM</strong><small>VENTSPILS ARENA · PRIVATE</small></span></a><button onClick={signOut}>SIGN OUT</button></header>
    <div className="smm-shell">
      <section className="smm-hero"><div><span className="smm-kicker">SOCIAL MEDIA OPERATIONS / 001</span><h1>CONTROL CENTER<i>.</i></h1><p>Claude creates the strategy and drafts. You retain final publishing control.</p></div><span className="smm-online">● SUPERADMIN SESSION</span></section>
      {error&&<div className="smm-alert">{error}</div>}{notice&&<div className="smm-notice">{notice}</div>}
      <div className="smm-grid">
        <section className="smm-panel"><h2>CREATE CONTENT.</h2><p className="smm-muted">Give Claude a campaign or topic. It will prepare a reviewable Instagram draft in the selected language.</p>
          <form onSubmit={generate}>
            <div className="smm-field"><label htmlFor="smm-topic">TOPIC / CAMPAIGN</label><input id="smm-topic" value={topic} onChange={e=>setTopic(e.target.value)} minLength={3} maxLength={500} required placeholder="Tournament announcement, registration..." /></div>
            <div className="smm-field"><label htmlFor="smm-objective">OBJECTIVE</label><textarea id="smm-objective" value={objective} onChange={e=>setObjective(e.target.value)} maxLength={500}/></div>
            <div className="smm-fields-row"><div className="smm-field"><label htmlFor="smm-format">FORMAT</label><select id="smm-format" value={format} onChange={e=>setFormat(e.target.value as "POST"|"STORY"|"REEL")}><option value="POST">Instagram post</option><option value="STORY">Story</option><option value="REEL">Reel script</option></select></div><div className="smm-field"><label htmlFor="smm-language">LANGUAGE</label><select id="smm-language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="lv">Latvian</option><option value="ru">Russian</option><option value="en">English</option></select></div></div>
            <button className="smm-primary" type="submit" disabled={busy}>{busy?"CLAUDE IS WORKING...":"GENERATE WITH CLAUDE"}</button>
          </form>
          <div className="smm-notice">Brand rules: minimal black-and-red identity, no unnecessary emojis, no CS-only positioning, and no invented event details.</div>
        </section>
        <section className="smm-panel"><h2>CONTENT QUEUE.</h2><p className="smm-muted">Latest drafts, approval decisions and publishing status.</p>
          <div className="smm-queue">{posts.length===0?<div className="smm-empty">No content yet.<br/>Generate the first draft with Claude.</div>:posts.map(post=><article className="smm-post" key={post.id}>
            <div className="smm-post-head"><strong>{post.format} / {post.language.toUpperCase()}</strong><span className={"smm-tag "+post.status.toLowerCase()}>{post.status.replace("_"," ")}</span></div>
            <h3>{post.title||post.topic}</h3><small>{post.topic} · {new Date(post.created_at).toLocaleString()}</small>
            <p>{post.caption}</p>{post.hashtags&&<p>{post.hashtags}</p>}
            {post.visual_brief&&<p><b>VISUAL:</b> {post.visual_brief}</p>}{post.recommended_time&&<small>Suggested timing: {post.recommended_time}</small>}
            <div className="smm-post-actions">{post.status!=="APPROVED"&&post.status!=="PUBLISHED"&&<button className="approve" disabled={!!workingId} onClick={()=>action(post.id,"APPROVE")}>{workingId===post.id?"SAVING...":"APPROVE"}</button>}{post.status!=="REJECTED"&&post.status!=="PUBLISHED"&&<button disabled={!!workingId} onClick={()=>action(post.id,"REJECT")}>REJECT</button>}</div>
          </article>)}</div>
        </section>
      </div>
      <footer className="smm-footer">VENTSPILS ARENA / CLAUDE SMM<p>APPROVAL IS NOT PUBLICATION. Instagram publishing is disabled until the official Meta connection is configured and verified.</p></footer>
    </div>
  </main>;
}
