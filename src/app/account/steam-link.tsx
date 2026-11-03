"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./steam-link.module.css";

type Props = { steamId?: string | null };

export default function SteamLink({ steamId: initialSteamId }: Props) {
  const [steamId, setSteamId] = useState(initialSteamId || "");
  const [steamName, setSteamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSteamId(initialSteamId || "");
  }, [initialSteamId]);

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
    setBusy(true);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Sign in again.");
      setBusy(false);
      return;
    }
    const response = await fetch("/api/steam/start", {
      method: "POST",
      headers: { authorization: "Bearer " + session.access_token },
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Steam linking unavailable.");
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <section className={styles.card}>
      <div className={styles.topline}>
        <span className={styles.eyebrow}>PLAYER IDENTITY / EXTERNAL ACCOUNT</span>
        <span className={steamId ? styles.connected : styles.pending}>
          <i /> {steamId ? "VERIFIED CONNECTION" : "NOT CONNECTED"}
        </span>
      </div>
      <div className={styles.content}>
        <div className={styles.steamMark} aria-hidden="true">S</div>
        <div className={styles.copy}>
          <span className={styles.label}>STEAM ACCOUNT</span>
          <h3>{steamId ? (steamName || "STEAM ACCOUNT LINKED") : "CONNECT YOUR STEAM"}</h3>
          <p>{steamId
            ? "Your Steam identity is connected and verified for this VENTSPILS ARENA profile."
            : "Link your real Steam profile to verify your tournament identity and compete in the arena."}</p>
          {steamId && (
            <div className={styles.identity}>
              <span className={styles.verified}>✓ STEAM VERIFIED</span>
              <span className={styles.steamId}>STEAMID64: {steamId}</span>
              <a href={"https://steamcommunity.com/profiles/" + steamId + "/"} target="_blank" rel="noreferrer">VIEW STEAM PROFILE ↗</a>
            </div>
          )}
        </div>
        {!steamId && (
          <button className={styles.button} onClick={link} disabled={busy}>
            <span className={styles.buttonIcon}>S</span>
            <span>{busy ? "CONNECTING..." : "LINK STEAM ACCOUNT"}</span>
            <span className={styles.arrow}>↗</span>
          </button>
        )}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
