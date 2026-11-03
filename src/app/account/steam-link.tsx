"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";

type Props={steamId?:string|null};
export default function SteamLink({steamId:initialSteamId}:Props){
 const [steamId,setSteamId]=useState(initialSteamId||"");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{setSteamId(initialSteamId||"");},[initialSteamId]);
 async function link(){
  if(!supabase)return;
  setBusy(true);setError("");
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Sign in again.");setBusy(false);return;}
  const r=await fetch("/api/steam/start",{method:"POST",headers:{authorization:"Bearer "+session.access_token}});
  const d=await r.json();setBusy(false);
  if(!r.ok){setError(d.error||"Steam linking unavailable.");return;}
  window.location.assign(d.url);
 }
 return <section className="steam-link-box">
  <div><strong>STEAM ACCOUNT</strong><p>{steamId?"Your Steam identity is connected to this VENTSPILS ARENA profile.":"Connect your real Steam profile to build trust and verify your tournament identity."}</p>
   {steamId&&<div className="steam-verified-profile"><span className="steam-verified-badge">✓ STEAM VERIFIED</span><a href={"https://steamcommunity.com/profiles/"+steamId+"/"} target="_blank" rel="noreferrer">OPEN STEAM PROFILE ↗</a><small>STEAMID64: {steamId}</small></div>}
  </div>
  {!steamId&&<button onClick={link} disabled={busy}>{busy?"CONNECTING...":"LINK STEAM ↗"}</button>}
  {error&&<small role="alert">{error}</small>}
 </section>;
}
