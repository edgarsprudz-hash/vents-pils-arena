"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./matches.module.css";

type Tournament = {
  id: string;
  title: string;
  game: string;
  event_date: string | null;
  location: string;
  format: string;
  status: string;
};

type Match = {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  team_a: string | null;
  team_b: string | null;
  winner_team: string | null;
  status: string;
};

export default function MyMatches() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [items, setItems] = useState<Match[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setBusy(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setBusy(false); return; }

      const { data: registrations } = await supabase
        .from("tournament_registrations")
        .select("tournament_id, status")
        .eq("user_id", session.user.id)
        .neq("status", "CANCELLED");

      const tournamentIds = [...new Set((registrations || []).map((r) => r.tournament_id))];
      if (tournamentIds.length) {
        const { data } = await supabase
          .from("tournaments")
          .select("id, title, game, event_date, location, format, status")
          .in("id", tournamentIds)
          .order("event_date", { ascending: true, nullsFirst: false });
        if (active) setTournaments((data || []) as Tournament[]);

        const { data: members } = await supabase
          .from("tournament_players")
          .select("tournament_id")
          .eq("user_id", session.user.id);
        const matchIds = [...new Set((members || []).map((m) => m.tournament_id))];
        if (matchIds.length) {
          const { data: matches } = await supabase
            .from("tournament_matches")
            .select("id,tournament_id,round_number,match_number,team_a,team_b,winner_team,status")
            .in("tournament_id", matchIds)
            .order("round_number")
            .order("match_number");
          if (active) setItems((matches || []) as Match[]);
        }
      }
      if (active) setBusy(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const dateLabel = (value: string | null) => value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "DATE TO BE ANNOUNCED";

  return (
    <>
      <section className={styles.section}>
        <div className={styles.kicker}>PLAYER AREA <i /></div>
        <div className={styles.headingRow}>
          <h2>MY <em>TOURNAMENTS.</em></h2>
          <span className={styles.count}>{tournaments.length.toString().padStart(2, "0")} JOINED</span>
        </div>
        {busy ? <p className={styles.empty}>LOADING YOUR REGISTRATIONS...</p> :
          tournaments.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyMark}>VA</span>
              <div><strong>NO ACTIVE REGISTRATIONS</strong><p>You have not registered for a tournament yet.</p></div>
              <Link href="/tournaments">EXPLORE TOURNAMENTS ↗</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {tournaments.map((t) => (
                <article className={styles.card} key={t.id}>
                  <div className={styles.cardTop}><span>{t.game} / {t.format || "TOURNAMENT"}</span><b>{t.status.replaceAll("_", " ")}</b></div>
                  <h3>{t.title}</h3>
                  <div className={styles.meta}>
                    <span><i>DATE</i>{dateLabel(t.event_date)}</span>
                    <span><i>LOCATION</i>{t.location || "To be announced"}</span>
                  </div>
                  <div className={styles.cardBottom}><span><i /> REGISTRATION ACTIVE</span><Link href={"/tournaments/" + t.id}>VIEW TOURNAMENT ↗</Link></div>
                </article>
              ))}
            </div>
          )}
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>PLAYER AREA <i /></div>
        <div className={styles.headingRow}><h2>MY <em>MATCHES.</em></h2></div>
        {busy ? <p className={styles.empty}>LOADING MATCHES...</p> :
          items.length === 0 ? <p className={styles.empty}>No tournament matches have been scheduled for your account yet.</p> :
          <div className={styles.grid}>{items.map((m) => (
            <Link href={"/account/matches/" + m.id} className={styles.matchCard} key={m.id}>
              <small>ROUND {m.round_number} / MATCH {m.match_number}</small>
              <strong>{m.team_a || "TBD"} <i>VS</i> {m.team_b || "TBD"}</strong>
              <span>OPEN MATCH ROOM ↗</span>
            </Link>
          ))}</div>}
      </section>
    </>
  );
}
