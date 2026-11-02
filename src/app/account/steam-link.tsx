"use client";
import {useState} from "react";
import {supabase} from "../../lib/supabase";
export default function SteamLink(){const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function link(){if(!supabase)return;setBusy(true);setError("");const {data:{session}}=await supabase.auth.getSession();if(!session){setError("Sign in again.");setBusy(false);return;}const r=await fetch("/api/steam/start",{method:"POST",headers:{authorization:"Bearer "+session.access_token}});const d=await r.json();setBusy(false);if(!r.ok){setError(d.error||"Steam linking unavailable.");return;}window.location.assign(d.url);}
 return <section className="steam-link-box"><div><strong>STEAM ACCOUNT</strong><p>Verify your Steam account to access private tournament rooms.</p></div><button onClick={link} disabled={busy}>{busy?"CONNECTING...":"LINK STEAM ↗"}</button>{error&&<small>{error}</small>}</section>;
}