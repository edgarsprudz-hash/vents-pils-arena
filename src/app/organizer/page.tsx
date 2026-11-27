"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../components/LanguageProvider";
import "./organizer.css";

type Tournament = { id: string; title: string; game: string; status: string; event_date: string | null; location: string };
type Match = { id: string; tournament_id: string; round_number: number; match_number: number; bracket_type: string; group_number: number | null; team_a: string | null; team_b: string | null; winner_team: string | null; score_a: number | null; score_b: number | null; next_match_id: string | null; next_slot: "A" | "B" | null; status: "SCHEDULED" | "LIVE" | "COMPLETED"; map_name: string | null; scheduled_at: string | null };
type Scores = Record<string, { a: string; b: string }>;

const words = {
  en: { eyebrow:"MATCH OPERATIONS", title:"ORGANIZER", sub:"Match control, live status and results.", tournaments:"TOURNAMENTS", matches:"MATCH CONTROL", all:"ALL MATCHES", scheduled:"UPCOMING", live:"LIVE NOW", completed:"FINISHED", noMatches:"No matches have been generated for this tournament yet.", choose:"Select a tournament to manage its matches.", setLive:"SET LIVE", setUpcoming:"SET UPCOMING", save:"SAVE RESULT", saving:"SAVING...", score:"SCORE", group:"GROUP", round:"ROUND", match:"MATCH", station:"STATION", refreshed:"Updated just now", logout:"SIGN OUT", denied:"ORGANIZER ACCESS ONLY", deniedText:"This account does not have permission to use the organizer app.", login:"SIGN IN", noTournaments:"No active tournaments are available.", error:"Something went wrong.", saved:"Match updated.", install:"Add to Home Screen", installText:"In Safari, tap Share and choose “Add to Home Screen” to install this app.", reload:"REFRESH", loading:"CHECKING ACCESS...", draw:"Group matches may end in a draw.", websiteOnly:"Tournament creation and bracket generation are available on the website only." },
  ru: { eyebrow:"УПРАВЛЕНИЕ МАТЧАМИ", title:"ОРГАНИЗАТОР", sub:"Статусы матчей, LIVE и ввод результатов.", tournaments:"ТУРНИРЫ", matches:"УПРАВЛЕНИЕ МАТЧАМИ", all:"ВСЕ МАТЧИ", scheduled:"ОЖИДАЮТ", live:"СЕЙЧАС LIVE", completed:"ЗАВЕРШЕНЫ", noMatches:"В этом турнире пока нет сгенерированных матчей.", choose:"Выбери турнир для управления матчами.", setLive:"НАЧАТЬ LIVE", setUpcoming:"ВЕРНУТЬ В ОЖИДАНИЕ", save:"СОХРАНИТЬ РЕЗУЛЬТАТ", saving:"СОХРАНЕНИЕ...", score:"СЧЁТ", group:"ГРУППА", round:"РАУНД", match:"МАТЧ", station:"СТАНЦИЯ", refreshed:"Обновлено", logout:"ВЫЙТИ", denied:"ТОЛЬКО ДЛЯ ОРГАНИЗАТОРОВ", deniedText:"У этого аккаунта нет доступа к приложению организатора.", login:"ВОЙТИ", noTournaments:"Нет доступных активных турниров.", error:"Произошла ошибка.", saved:"Матч обновлён.", install:"Установить на экран Домой", installText:"В Safari нажми «Поделиться» и выбери «На экран Домой».", reload:"ОБНОВИТЬ", loading:"ПРОВЕРКА ДОСТУПА...", draw:"В группах допускается ничья.", websiteOnly:"Создание турниров и генерация сетки доступны только на сайте." },
  lv: { eyebrow:"SPĒĻU VADĪBA", title:"ORGANIZATORS", sub:"Spēļu statusi, LIVE un rezultātu ievade.", tournaments:"TURNĪRI", matches:"SPĒĻU VADĪBA", all:"VISAS SPĒLES", scheduled:"GAIDA", live:"TIEŠRAIDĒ", completed:"PABEIGTAS", noMatches:"Šim turnīram vēl nav ģenerētu spēļu.", choose:"Izvēlies turnīru, lai pārvaldītu spēles.", setLive:"SĀKT LIVE", setUpcoming:"ATGRIEZT GAIDĪŠANĀ", save:"SAGLABĀT REZULTĀTU", saving:"SAGLABĀ...", score:"REZULTĀTS", group:"GRUPA", round:"KĀRTA", match:"SPĒLE", station:"STACIJA", refreshed:"Atjaunināts", logout:"IZIET", denied:"TIKAI ORGANIZATORIEM", deniedText:"Šim kontam nav piekļuves organizatora lietotnei.", login:"PIESLĒGTIES", noTournaments:"Nav pieejamu aktīvu turnīru.", error:"Radās kļūda.", saved:"Spēle atjaunināta.", install:"Pievienot sākuma ekrānam", installText:"Safari nospied Kopīgot un izvēlies “Pievienot sākuma ekrānam”.", reload:"ATJAUNINĀT", loading:"TIEK PĀRBAUDĪTA PIEKĻUVE...", draw:"Grupu spēlēs neizšķirts ir atļauts.", websiteOnly:"Turnīru izveide un izslēgšanas spēļu ģenerēšana pieejama tikai vietnē." }
};

export default function OrganizerPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = words[language] || words.en;
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"ALL" | "SCHEDULED" | "LIVE" | "COMPLETED">("ALL");
  const [installVisible, setInstallVisible] = useState(false);

  const api = useCallback(async (method: "GET" | "POST", body?: unknown, tournamentId?: string) => {
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) { router.replace("/login?next=/organizer"); throw new Error("Session expired. Sign in again."); }
    const response = await fetch(method === "GET" ? `/api/organizer/matches${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ""}` : "/api/organizer/matches", {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t.error);
    return result;
  }, [router, t.error]);

  const load = useCallback(async (id?: string) => {
    const result = await api("GET", undefined, id || selected || undefined);
    setTournaments(result.tournaments || []);
    if (id || selected) setMatches(result.matches || []);
    else if (result.tournaments?.[0]) {
      setSelected(result.tournaments[0].id);
      const next = await api("GET", undefined, result.tournaments[0].id);
      setMatches(next.matches || []);
    }
  }, [api, selected]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { setDenied(true); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?next=/organizer"); return; }
      const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (error || !profile || !["SUPER_ADMIN", "ORGANIZER"].includes(profile.role)) { setDenied(true); setLoading(false); return; }
      try { await load(); } catch (e) { setMessage(e instanceof Error ? e.message : t.error); }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [load, router, t.error]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setInterval(() => { load(selected).catch(() => undefined); }, 12000);
    return () => window.clearInterval(timer);
  }, [load, selected]);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.matchMedia("(display-mode: standalone)").matches) setInstallVisible(true);
  }, []);

  const counts = useMemo(() => ({
    SCHEDULED: matches.filter(m => m.status === "SCHEDULED").length,
    LIVE: matches.filter(m => m.status === "LIVE").length,
    COMPLETED: matches.filter(m => m.status === "COMPLETED").length
  }), [matches]);
  const visibleMatches = useMemo(() => matches.filter(m => filter === "ALL" || m.status === filter), [matches, filter]);
  const activeTournament = tournaments.find(x => x.id === selected);

  async function selectTournament(id: string) {
    setSelected(id); setFilter("ALL"); setMessage("");
    try { const result = await api("GET", undefined, id); setTournaments(result.tournaments || []); setMatches(result.matches || []); setScores({}); }
    catch (e) { setMessage(e instanceof Error ? e.message : t.error); }
  }

  async function updateMatch(match: Match, status: "SCHEDULED" | "LIVE" | "COMPLETED") {
    if (busy) return;
    setBusy(match.id); setMessage("");
    try {
      const current = scores[match.id] || { a: String(match.score_a ?? ""), b: String(match.score_b ?? "") };
      const result = await api("POST", { matchId: match.id, status, ...(status === "COMPLETED" ? { scoreA: Number(current.a), scoreB: Number(current.b) } : {}) });
      setMessage(result.success ? t.saved : t.error);
      await load(selected);
    } catch (e) { setMessage(e instanceof Error ? e.message : t.error); }
    finally { setBusy(null); }
  }

  async function signOut() { await supabase?.auth.signOut(); router.replace("/login"); }

  if (loading) return <main className="organizer-page"><div className="organizer-loading">{t.loading}</div></main>;
  if (denied) return <main className="organizer-page"><section className="organizer-denied"><div className="organizer-mark">VA</div><span>VENTSPILS ARENA / ORGANIZER</span><h1>{t.denied}</h1><p>{t.deniedText}</p><a href="/login">{t.login}</a></section></main>;

  return <main className="organizer-page">
    <header className="organizer-topbar">
      <a className="organizer-brand" href="/organizer"><span className="organizer-mark">VA</span><span>VENTSPILS ARENA<small>ORGANIZER APP</small></span></a>
      <div className="organizer-top-actions"><span className="organizer-secure">● SECURE ACCESS</span><button onClick={signOut}>{t.logout}</button></div>
    </header>
    <div className="organizer-shell">
      <div className="organizer-intro"><span>{t.eyebrow} / VENTSPILS, LATVIA</span><h1>{t.title}<i>.</i></h1><p>{t.sub}</p></div>
      <section className="organizer-tournament">
        <label htmlFor="organizer-tournament">{t.tournaments}</label>
        <select id="organizer-tournament" value={selected} onChange={e => selectTournament(e.target.value)}>
          {tournaments.map(item => <option key={item.id} value={item.id}>{item.title} · {item.game}</option>)}
        </select>
        {activeTournament && <div className="organizer-event-meta"><span>{activeTournament.status}</span><span>{activeTournament.event_date ? new Date(activeTournament.event_date).toLocaleString() : activeTournament.location}</span></div>}
      </section>
      <div className="organizer-section-heading"><div><span>{t.eyebrow}</span><h2>{t.matches}</h2></div><button onClick={() => load(selected)}>{t.reload} ↻</button></div>
      <div className="organizer-stats">
        <button className={filter === "ALL" ? "selected" : ""} onClick={() => setFilter("ALL")}><strong>{matches.length}</strong><span>{t.all}</span></button>
        <button className={filter === "LIVE" ? "selected" : ""} onClick={() => setFilter("LIVE")}><strong className="live-number">{counts.LIVE}</strong><span>{t.live}</span></button>
        <button className={filter === "SCHEDULED" ? "selected" : ""} onClick={() => setFilter("SCHEDULED")}><strong>{counts.SCHEDULED}</strong><span>{t.scheduled}</span></button>
        <button className={filter === "COMPLETED" ? "selected" : ""} onClick={() => setFilter("COMPLETED")}><strong>{counts.COMPLETED}</strong><span>{t.completed}</span></button>
      </div>
      {installVisible && <aside className="organizer-install"><button aria-label="Close" onClick={() => setInstallVisible(false)}>×</button><strong>{t.install}</strong><p>{t.installText}</p></aside>}
      {message && <p className="organizer-message" role="status">{message}</p>}
      {!selected ? <div className="organizer-empty">{t.noTournaments}</div> : !matches.length ? <div className="organizer-empty">{t.noMatches}<small>{t.websiteOnly}</small></div> : !visibleMatches.length ? <div className="organizer-empty">{t.noMatches}</div> :
        <div className="organizer-match-list">{visibleMatches.map(match => {
          const value = scores[match.id] || { a: String(match.score_a ?? ""), b: String(match.score_b ?? "") };
          const label = match.bracket_type === "GROUP" ? `${t.group} ${match.group_number || 1}` : `${t.round} ${match.round_number}`;
          return <article className={`organizer-match-card ${match.status.toLowerCase()}`} key={match.id}>
            <div className="organizer-match-top"><span>{label} · {t.match} #{match.match_number}</span><span className={`organizer-status ${match.status.toLowerCase()}`}>{match.status === "LIVE" ? "● LIVE" : match.status === "COMPLETED" ? t.completed : t.scheduled}</span></div>
            {match.map_name && <div className="organizer-station">{t.station}: {match.map_name}</div>}
            <div className="organizer-versus">
              <div className="organizer-team"><strong>{match.team_a || "TBD"}</strong><input aria-label={`Score ${match.team_a || "team A"}`} inputMode="numeric" pattern="[0-9]*" type="number" min="0" value={value.a} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...value, a: e.target.value } }))}/></div>
              <div className="organizer-vs">VS</div>
              <div className="organizer-team"><strong>{match.team_b || "TBD"}</strong><input aria-label={`Score ${match.team_b || "team B"}`} inputMode="numeric" pattern="[0-9]*" type="number" min="0" value={value.b} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...value, b: e.target.value } }))}/></div>
            </div>
            {match.status === "COMPLETED" && match.winner_team && <div className="organizer-winner">WINNER · {match.winner_team}</div>}
            <div className="organizer-match-actions">
              {match.status !== "LIVE" && <button className="organizer-live-button" disabled={!!busy || !match.team_a || !match.team_b} onClick={() => updateMatch(match, "LIVE")}>{busy === match.id ? t.saving : t.setLive}</button>}
              {match.status === "LIVE" && <button className="organizer-neutral-button" disabled={!!busy} onClick={() => updateMatch(match, "SCHEDULED")}>{t.setUpcoming}</button>}
              <button className="organizer-save-button" disabled={!!busy || !match.team_a || !match.team_b || value.a === "" || value.b === ""} onClick={() => updateMatch(match, "COMPLETED")}>{busy === match.id ? t.saving : t.save}</button>
            </div>
          </article>;
        })}</div>}
      <footer className="organizer-footer"><span>VENTSPILS ARENA · MATCH OPERATIONS</span><p>{t.websiteOnly}</p></footer>
    </div>
  </main>;
}
