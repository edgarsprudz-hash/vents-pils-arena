"use client";
import Link from "next/link";
import { useEffect,useState,FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Regulation={id:number;title:string;description:string;file_path:string;file_name:string;updated_at:string};
export default function AdminRulesPage(){
 const router=useRouter();const [item,setItem]=useState<Regulation|null>(null);const [title,setTitle]=useState("OFFICIAL TOURNAMENT REGULATIONS");const [description,setDescription]=useState("Official VENTSPILS ARENA rules and tournament regulations.");const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [allowed,setAllowed]=useState(false);
 async function load(){if(!supabase){setNotice("SUPABASE IS NOT CONFIGURED");return;}const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace("/login");return;}const {data:profile}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();if(profile?.role!=="SUPER_ADMIN"){setNotice("ACCESS RESTRICTED");return;}setAllowed(true);const {data,error}=await supabase.from("arena_regulations").select("*").eq("id",1).maybeSingle();if(error)setNotice(error.message);else if(data){setItem(data);setTitle(data.title);setDescription(data.description||"");}}
 useEffect(()=>{load();},[]);
 async function save(e:FormEvent){e.preventDefault();if(!supabase||!file)return;if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){setNotice("PLEASE SELECT A PDF FILE.");return;}if(file.size>25*1024*1024){setNotice("PDF MUST BE 25 MB OR SMALLER.");return;}setBusy(true);setNotice("");
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");const path="official/"+Date.now()+"-"+safe;
 const {error:uploadError}=await supabase.storage.from("arena-regulations").upload(path,file,{contentType:"application/pdf",upsert:false});
 if(uploadError){setNotice("UPLOAD FAILED: "+uploadError.message);setBusy(false);return;}
 const {error:saveError}=await supabase.from("arena_regulations").upsert({id:1,title:title.trim(),description:description.trim(),file_path:path,file_name:file.name,updated_at:new Date().toISOString()},{onConflict:"id"});
 if(saveError){await supabase.storage.from("arena-regulations").remove([path]);setNotice("COULD NOT PUBLISH: "+saveError.message);setBusy(false);return;}
 if(item?.file_path)await supabase.storage.from("arena-regulations").remove([item.file_path]);
 setFile(null);setNotice("REGULATIONS PUBLISHED.");await load();setBusy(false);
 }
 async function remove(){if(!supabase||!item||!confirm("Remove the published regulations PDF?"))return;setBusy(true);const {error}=await supabase.from("arena_regulations").delete().eq("id",1);if(error){setNotice(error.message);setBusy(false);return;}await supabase.storage.from("arena-regulations").remove([item.file_path]);setItem(null);setNotice("REGULATIONS REMOVED.");setBusy(false);}
 const url=item&&supabase?supabase.storage.from("arena-regulations").getPublicUrl(item.file_path).data.publicUrl:"";
 if(!allowed)return <main className="admin-page"><div className="admin-shell"><h1>RULES & REGULATIONS</h1><p>{notice||"VERIFYING ADMIN ACCESS..."}</p><Link href="/admin">← ADMIN CONTROL</Link></div></main>;
 return <main className="admin-page"><div className="admin-shell"><div className="admin-crumb"><Link href="/">HOME</Link><b>/</b><Link href="/admin">ADMIN</Link><b>/</b> RULES & REGULATIONS</div><div className="admin-heading"><div><span className="admin-eyebrow">CONTENT MANAGEMENT</span><h1>RULES &<br/><em>REGULATIONS.</em></h1><p>Publish the official rulebook as a PDF document.</p></div><div className="admin-emblem"><span>PDF</span><small>RULEBOOK</small></div></div>
 <form className="admin-form admin-editor" onSubmit={save}><label>DOCUMENT TITLE<input required value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label><label>DESCRIPTION<input value={description} onChange={e=>setDescription(e.target.value)} maxLength={300}/></label><label>REGULATIONS PDF<input type="file" accept="application/pdf,.pdf" required={!item} onChange={e=>setFile(e.target.files?.[0]||null)}/><small className="rules-upload-hint">PDF ONLY · MAXIMUM FILE SIZE 25 MB. Uploading a new file replaces the currently published document.</small></label><div className="admin-form-actions"><button disabled={busy||(!file&&!item)}>{busy?"UPLOADING...":item?"PUBLISH NEW VERSION":"PUBLISH PDF"} ↗</button></div></form>
 {notice&&<p className="admin-feedback">{notice}</p>}
 {item&&<section className="rules-current"><div><small>CURRENTLY PUBLISHED · {new Date(item.updated_at).toLocaleString()}</small><h2>{item.title}</h2><p>{item.file_name}</p></div><div className="admin-row-actions"><a href={url} target="_blank" rel="noreferrer">VIEW PDF ↗</a><button className="admin-delete" disabled={busy} onClick={remove}>REMOVE</button></div></section>}
 <div className="admin-footer-actions"><Link href="/admin">← ADMIN CONTROL</Link><Link href="/rules">VIEW PUBLIC RULES ↗</Link></div></div></main>;
}
