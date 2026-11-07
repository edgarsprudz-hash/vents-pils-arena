"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./steam-link.module.css";

type Props = { steamId?: string | null };

export default function SteamLink({ steamId: initialSteamId }: Props) {
  const [steamId, setSteamId] = useState(initialSteamId || "");
  const [steamName, setSteamName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { setSteamId(initialSteamId || ""); }, [initialSteamId]);
  useEffect(() => {
    if (!steamId) return;
    let active = true;
    fetch("/api/steam/profile?steamId=" + encodeURIComponent(steamId), { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (active && data?.name) setSteamName(data.name); })
      .catch(() => {});
    return () => { active = false; };
  }, [steamId]);

  async function link() {
    if (!supabase) return;
    setBusy(true); setError(""); setSuccess("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sign in again."); setBusy(false); return; }
    const response = await fetch("/api/steam/start", { method: "POST", headers: { authorization: "Bearer " + session.access_token } });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "Steam linking unavailable."); return; }
    window.location.assign(data.url);
  }

  async function unlink() {\n    if (!supabase || !window.confirm("Unlink this Steam account from your VENTSPILS ARENA profile?")) return;\n    setBusy(true); setError(""); setSuccess("");\n    const { data: { session } } = await supabase.auth.getSession();\n    if (!session) { setError("Sign in again."); setBusy(false); return; }\n    const response = await fetch("/api/steam/unlink", { method: "POST", headers: { authorization: "Bearer " + session.access_token } });\n    const data = await response.json(); setBusy(false);\n    if (!response.ok) { setError(data.error || "Could not unlink Steam account."); return; }\n    setSteamId(""); setSteamName(""); setProfileUrl("");\n    setSuccess("Steam account unlinked. You can connect another profile at any time.");\n  }\n\n  async function linkByUrl() {
    if (!supabase) return;
    setBusy(true); setError(""); setSuccess("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sign in again."); setBusy(false); return; }
    const response = await fetch("/api/steam/manual-link", {
      method: "POST",
      headers: { authorization: "Bearer " + session.access_token, "content-type": "application/json" },
      body: JSON.stringify({ profileUrl })
    });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "Could not link this Steam profile."); return; }
    setSteamId(data.steamId64); setSteamName(data.name || "STEAM ACCOUNT LINKED");
    setProfileUrl(data.profileUrl); setSuccess("Steam profile linked successfully.");
  }

  return (
    <section className={styles.card}>
      <div className={styles.topline}>
        <span className={styles.eyebrow}>PLAYER IDENTITY / EXTERNAL ACCOUNT</span>
        <span className={steamId ? styles.connected : styles.pending}><i /> {steamId ? "STEAM ACCOUNT LINKED" : "NOT CONNECTED"}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.steamMark} aria-hidden="true">S</div>
        <div className={styles.copy}>
          <span className={styles.label}>STEAM ACCOUNT</span>
          <h3>{steamId ? (steamName || "STEAM ACCOUNT LINKED") : "CONNECT YOUR STEAM"}</h3>
          <p>{steamId ? "Your SteamID64 is saved and will be used to check your tournament registration." : "Connect through Steam or paste your regular Steam profile URL."}</p>
          {steamId && <div className={styles.identity}>
            <span className={styles.verified}>✓ LINKED</span>
            <span className={styles.steamId}>STEAMID64: {steamId}</span>
            <a href={"https://steamcommunity.com/profiles/" + steamId + "/"} target="_blank" rel="noreferrer">VIEW STEAM PROFILE ↗</a>
          </div>}
        </div>
      </div>
      {steamId && <div style={{position:"relative",zIndex:1,padding:"0 21px 22px"}}><button type="button" className={styles.button} onClick={unlink} disabled={busy}>{busy ? "PLEASE WAIT..." : "UNLINK STEAM ACCOUNT"}</button></div>}\n      {!steamId && <div style={{position:"relative",zIndex:1,padding:"0 21px 22px",display:"grid",gap:12}}>
        <button className={styles.button} onClick={link} disabled={busy}>
          <span className={styles.buttonIcon}>S</span><span>{busy ? "PLEASE WAIT..." : "CONNECT WITH STEAM"}</span><span className={styles.arrow}>↗</span>
        </button>
        <div style={{display:"grid",gap:8}}>
          <label htmlFor="steam-profile-url" className={styles.label}>OR PASTE YOUR STEAM PROFILE LINK</label>
          <input id="steam-profile-url" type="url" value={profileUrl} onChange={e=>setProfileUrl(e.target.value)} placeholder="https://steamcommunity.com/id/username" style={{width:"100%",boxSizing:"border-box",padding:"13px 14px",background:"#0b0c0f",border:"1px solid #454751",color:"#fff",fontSize:12}} />
          <button type="button" className={styles.button} onClick={linkByUrl} disabled={busy || !profileUrl.trim()}>{busy ? "VERIFYING..." : "VERIFY & LINK PROFILE ↗"}</button>
        </div>
      </div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p style={{position:"relative",zIndex:1,padding:"0 21px 16px",margin:0,color:"#75dfa4",fontSize:10}} role="status">{success}</p>}
    </section>
  );
}
