"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Maintenance = { enabled:boolean; title?:string; message?:string };
export default function MaintenanceGate({children}:{children:React.ReactNode}){
  const [state,setState]=useState<"loading"|"open"|"closed">("loading");
  const [maintenance,setMaintenance]=useState<Maintenance>({enabled:false});
  useEffect(()=>{
    const client = supabase;
    if(!client){setState("open");return;}
    let active=true;
    const check=async()=>{
      const {data}=await client.from("site_settings").select("value").eq("key","maintenance_mode").maybeSingle();
      const value=(data?.value||{enabled:false}) as Maintenance;
      if(!active)return;
      setMaintenance(value);
      const {data:{session}}=await client.auth.getSession();
      let isAdmin=false;
      if(session){
        const {data:profile}=await client.from("profiles").select("role").eq("id",session.user.id).maybeSingle();
        isAdmin=profile?.role==="SUPER_ADMIN";
      }
      setState(value.enabled&&!isAdmin?"closed":"open");
    };
    check();
    const {data:{subscription}}=client.auth.onAuthStateChange(()=>{check();});
    const refresh=window.setInterval(check,15000);
    return()=>{active=false;subscription.unsubscribe();window.clearInterval(refresh);};
  },[]);
  if(state==="loading")return <main style={{minHeight:"100vh",background:"#080808"}}/>;
  if(state==="closed")return <main style={{minHeight:"100vh",background:"#080808",color:"#fff",display:"grid",placeItems:"center",padding:24,textAlign:"center"}}>
    <section style={{maxWidth:560}}>
      <div style={{fontSize:12,letterSpacing:5,color:"#e53935",fontWeight:800}}>VENTSPILS ARENA</div>
      <div style={{width:64,height:3,background:"#d62828",margin:"28px auto"}}/>
      <div style={{fontSize:13,letterSpacing:4,color:"#999"}}>TECHNICAL BREAK</div>
      <h1 style={{fontSize:"clamp(32px,7vw,58px)",lineHeight:1.05,margin:"18px 0",fontWeight:900}}>WE’LL BE<br/><span style={{color:"#e53935"}}>BACK SOON.</span></h1>
      <p style={{color:"#aaa",fontSize:16,lineHeight:1.7}}>{maintenance.message||"VENTSPILS ARENA is temporarily unavailable while we carry out technical maintenance. Please check back soon."}</p>
      <div style={{marginTop:42,fontSize:11,letterSpacing:3,color:"#666"}}>COMPETE · CONNECT · CONQUER</div>
    </section>
  </main>;
  return <>{children}</>;
}
