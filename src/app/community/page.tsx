"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../components/LanguageProvider";
import styles from "./community.module.css";

type Player = { id: string; nickname: string; display_name: string | null };
type FriendRequest = { id: string; requester_id: string; addressee_id: string; status: string };
type Team = { id: string; name: string; owner_id: string };
type Member = { team_id: string; user_id: string; role: string; status: string; invited_by?: string };

export default function CommunityPage() {
  const { language } = useLanguage();
  const ru = language === "ru";
  const lv = language === "lv";
  const t = ru ? {
    title: "ДРУЗЬЯ И КОМАНДЫ", desc: "Находи игроков, собирай состав и готовься к турнирам.",
    search: "ПОИСК ИГРОКОВ", searchHint: "Введи точный никнейм или его часть", find: "НАЙТИ ИГРОКОВ",
    friends: "ДРУЗЬЯ", incoming: "ВХОДЯЩИЕ ЗАПРОСЫ", outgoing: "ОТПРАВЛЕННЫЕ ЗАПРОСЫ",
    teams: "МОИ КОМАНДЫ", teamName: "НАЗВАНИЕ КОМАНДЫ", create: "СОЗДАТЬ КОМАНДУ",
    invite: "ПРИГЛАСИТЬ", accept: "ПРИНЯТЬ", decline: "ОТКЛОНИТЬ", pending: "ОЖИДАЕТ",
    noFriends: "Пока нет друзей. Найди игрока по никнейму и отправь запрос.",
    noTeams: "У тебя пока нет команды. Создай команду и приглашай друзей.",
    noResults: "Игроки не найдены.", members: "УЧАСТНИКИ", chooseFriend: "ВЫБЕРИ ДРУГА",
    invited: "ПРИГЛАШЕНИЕ В КОМАНДУ", save: "СОХРАНИТЬ", back: "В ЛИЧНЫЙ КАБИНЕТ",
    login: "Войди в аккаунт, чтобы пользоваться друзьями и командами.", error: "Не удалось выполнить действие.",
    sent: "Запрос отправлен.", teamCreated: "Команда создана.", inviteSent: "Приглашение отправлено.",
    already: "Запрос или приглашение уже существует.", active: "В КОМАНДЕ", emptySearch: "Введи никнейм для поиска."
  } : lv ? {
    title: "DRAUGI UN KOMANDAS", desc: "Atrodi spēlētājus, veido sastāvu un gatavojies turnīriem.",
    search: "SPĒLĒTĀJU MEKLĒŠANA", searchHint: "Ievadi precīzu segvārdu vai tā daļu", find: "MEKLĒT",
    friends: "DRAUGI", incoming: "IENĀKOŠIE PIEPRASĪJUMI", outgoing: "NOSŪTĪTIE PIEPRASĪJUMI",
    teams: "MANAS KOMANDAS", teamName: "KOMANDAS NOSAUKUMS", create: "IZVEIDOT KOMANDU",
    invite: "UZAICINĀT", accept: "PIEŅEMT", decline: "NORAIDĪT", pending: "GAIDA",
    noFriends: "Draugu vēl nav. Atrodi spēlētāju pēc segvārda un nosūti pieprasījumu.",
    noTeams: "Tev vēl nav komandas. Izveido komandu un uzaicini draugus.",
    noResults: "Spēlētāji nav atrasti.", members: "DALĪBNIEKI", chooseFriend: "IZVĒLIES DRAUGU",
    invited: "KOMANDAS UZAICINĀJUMS", save: "SAGLABĀT", back: "PERSONĪGAIS KABINETS",
    login: "Pieslēdzies, lai izmantotu draugus un komandas.", error: "Darbību neizdevās izpildīt.",
    sent: "Pieprasījums nosūtīts.", teamCreated: "Komanda izveidota.", inviteSent: "Uzaicinājums nosūtīts.",
    already: "Pieprasījums vai uzaicinājums jau pastāv.", active: "KOMANDĀ", emptySearch: "Ievadi segvārdu."
  } : {
    title: "FRIENDS & TEAMS", desc: "Find players, build your roster and get ready for tournaments.",
    search: "FIND PLAYERS", searchHint: "Enter a nickname or part of it", find: "SEARCH PLAYERS",
    friends: "FRIENDS", incoming: "INCOMING REQUESTS", outgoing: "SENT REQUESTS",
    teams: "MY TEAMS", teamName: "TEAM NAME", create: "CREATE TEAM",
    invite: "INVITE", accept: "ACCEPT", decline: "DECLINE", pending: "PENDING",
    noFriends: "No friends yet. Search for a player by nickname and send a request.",
    noTeams: "You don't have a team yet. Create one and invite your friends.",
    noResults: "No players found.", members: "MEMBERS", chooseFriend: "SELECT A FRIEND",
    invited: "TEAM INVITATION", save: "SAVE", back: "PERSONAL CABINET",
    login: "Sign in to use friends and teams.", error: "The action could not be completed.",
    sent: "Friend request sent.", teamCreated: "Team created.", inviteSent: "Invitation sent.",
    already: "A request or invitation already exists.", active: "ACTIVE", emptySearch: "Enter a nickname to search."
  };

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Player | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamInvites, setTeamInvites] = useState<{ member: Member; team: Team }[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");
  const [inviteFor, setInviteFor] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!supabase) { setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    const { data: suggestedPlayers } = await supabase.from("player_directory").select("id,nickname,display_name").neq("id", session.user.id).order("nickname").limit(12);
    setResults((suggestedPlayers || []) as Player[]);
    const [{ data: me }, { data: reqs }, { data: ownTeams }, { data: invites }] = await Promise.all([
      supabase.from("player_directory").select("id,nickname,display_name").eq("id", session.user.id).maybeSingle(),
      supabase.from("friend_requests").select("id,requester_id,addressee_id,status").or("requester_id.eq." + session.user.id + ",addressee_id.eq." + session.user.id),
      supabase.from("arena_teams").select("id,name,owner_id").eq("owner_id", session.user.id).order("created_at"),
      supabase.from("arena_team_members").select("team_id,user_id,role,status,invited_by").eq("user_id", session.user.id).eq("status", "INVITED")
    ]);
    setProfile(me as Player | null);
    setRequests((reqs || []) as FriendRequest[]);
    setTeams((ownTeams || []) as Team[]);
    const ownTeamIds = (ownTeams || []).map((team: Team) => team.id);
    const [{ data: ownMembers }, { data: activeMemberships }, { data: inviteTeams }] = await Promise.all([
      ownTeamIds.length ? supabase.from("arena_team_members").select("team_id,user_id,role,status").in("team_id", ownTeamIds) : Promise.resolve({ data: [] as Member[] }),
      supabase.from("arena_team_members").select("team_id,user_id,role,status").eq("user_id", session.user.id).eq("status", "ACTIVE"),
      (invites || []).length ? supabase.from("arena_teams").select("id,name,owner_id").in("id", (invites || []).map((i: Member) => i.team_id)) : Promise.resolve({ data: [] as Team[] })
    ]);
    const joinedTeamIds = (activeMemberships || []).map((m: Member) => m.team_id).filter((id: string) => !ownTeamIds.includes(id));
    const { data: joinedTeams } = joinedTeamIds.length ? await supabase.from("arena_teams").select("id,name,owner_id").in("id", joinedTeamIds) : { data: [] as Team[] };
    const allTeams = [...(ownTeams || []), ...(joinedTeams || []), ...(inviteTeams || [])] as Team[];
    const allTeamIds = Array.from(new Set(allTeams.map(team => team.id)));
    const { data: teamMembers } = allTeamIds.length ? await supabase.from("arena_team_members").select("team_id,user_id,role,status").in("team_id", allTeamIds) : { data: [] as Member[] };
    setMembers((teamMembers || ownMembers || []) as Member[]);
    setTeamInvites((invites || []).map((member: Member) => ({ member, team: (inviteTeams || []).find((team: Team) => team.id === member.team_id) })).filter((item: {member: Member; team?: Team}) => !!item.team) as {member: Member; team: Team}[]);
    const playerIds = Array.from(new Set([
      ...(reqs || []).flatMap((r: FriendRequest) => [r.requester_id, r.addressee_id]),
      ...(teamMembers || []).map((m: Member) => m.user_id),
      ...(invites || []).map((m: any) => m.invited_by)
    ]));
    const { data: friendProfiles } = playerIds.length ? await supabase.from("player_directory").select("id,nickname,display_name").in("id", playerIds) : { data: [] as Player[] };
    const directory: Record<string, Player> = {};
    (friendProfiles || []).forEach((p: Player) => { directory[p.id] = p; });
    setPlayers(directory);
    setTeams(allTeams.filter((team, index) => allTeams.findIndex(other => other.id === team.id) === index));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function searchPlayers(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !search.trim()) { setMessage(t.emptySearch); return; }
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("player_directory").select("id,nickname,display_name").ilike("nickname", "%" + search.trim() + "%").neq("id", userId).limit(12);
    if (error) setMessage(error.message);
    else setResults((data || []) as Player[]);
    setBusy(false);
  }

  async function sendRequest(targetId: string) {
    if (!supabase) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("friend_requests").insert({ requester_id: userId, addressee_id: targetId, status: "PENDING" });
    if (error) setMessage(error.code === "23505" ? t.already : error.message);
    else { setMessage(t.sent); await load(); }
    setBusy(false);
  }

  async function respondRequest(id: string, status: "ACCEPTED" | "REJECTED") {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("friend_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) setMessage(error.message); else await load();
    setBusy(false);
  }

  async function createTeam(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !teamName.trim()) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("arena_teams").insert({ name: teamName.trim(), owner_id: userId }).select("id,name,owner_id").single();
    if (error || !data) setMessage(error?.code === "23505" ? "You already have a team with this name." : error?.message || t.error);
    else {
      const { error: memberError } = await supabase.from("arena_team_members").insert({ team_id: data.id, user_id: userId, role: "CAPTAIN", status: "ACTIVE", invited_by: userId });
      if (memberError) setMessage(memberError.message);
      else { setTeamName(""); setMessage(t.teamCreated); await load(); }
    }
    setBusy(false);
  }

  async function inviteFriend(teamId: string) {
    if (!supabase) return;
    const friendId = inviteFor[teamId];
    if (!friendId) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("arena_team_members").insert({ team_id: teamId, user_id: friendId, role: "MEMBER", status: "INVITED", invited_by: userId });
    if (error) setMessage(error.code === "23505" ? t.already : error.message);
    else { setMessage(t.inviteSent); setInviteFor(old => ({ ...old, [teamId]: "" })); await load(); }
    setBusy(false);
  }

  async function respondTeamInvite(teamId: string, status: "ACTIVE" | "DECLINED") {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("arena_team_members").update({ status }).eq("team_id", teamId).eq("user_id", userId);
    if (error) setMessage(error.message); else await load();
    setBusy(false);
  }

  if (loading) return <main className={styles.page}><div className={styles.shell}>LOADING COMMUNITY...</div></main>;
  if (!userId) return <main className={styles.page}><div className={styles.shell}><h1>{t.title}</h1><p>{t.login}</p><Link className={styles.action} href="/login">SIGN IN ↗</Link></div></main>;

  const incoming = requests.filter(r => r.addressee_id === userId && r.status === "PENDING");
  const outgoing = requests.filter(r => r.requester_id === userId && r.status === "PENDING");
  const friends = requests.filter(r => r.status === "ACCEPTED");
  const pendingTeamInvites = teamInvites;

  return <main className={styles.page}><div className={styles.shell}>
    <div className={styles.crumb}><Link href="/account">{t.back}</Link><b>/</b> VENTSPILS ARENA / COMMUNITY</div>
    <header className={styles.hero}><span>PLAYER NETWORK / VENTSPILS ARENA</span><h1>{t.title}<i>.</i></h1><p>{t.desc}</p></header>
    {message && <p className={styles.message} role="status">{message}</p>}
    <section className={styles.panel}>
      <div className={styles.panelTitle}><span>01 / PLAYER NETWORK</span><h2>{t.search}</h2></div>
      <form className={styles.search} onSubmit={searchPlayers}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchHint}/><button disabled={busy}>{busy ? "..." : t.find}</button></form>
      {results.length>0 ? <div className={styles.people}>{results.map(p=><article className={styles.person} key={p.id}><div className={styles.avatar}>{(p.nickname||"P").slice(0,1).toUpperCase()}</div><div><strong>{p.nickname}</strong><small>{p.display_name || "VENTSPILS ARENA PLAYER"}</small></div><button disabled={busy || requests.some(r => (r.requester_id===userId&&r.addressee_id===p.id)||(r.requester_id===p.id&&r.addressee_id===userId))} onClick={()=>sendRequest(p.id)}>+ ADD FRIEND</button></article>)}</div> : <p className={styles.empty}>{t.emptySearch}</p>}
    </section>

    <div className={styles.columns}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><span>02 / SOCIAL</span><h2>{t.friends}</h2></div>
        {friends.length ? friends.map(r=>{const other=r.requester_id===userId?r.addressee_id:r.requester_id;return <div className={styles.person} key={r.id}><div className={styles.avatar}>{(players[other]?.nickname||"P").slice(0,1).toUpperCase()}</div><div><strong>{players[other]?.nickname||"PLAYER"}</strong><small>{t.active}</small></div><span className={styles.accepted}>✓</span></div>}) : <p className={styles.empty}>{t.noFriends}</p>}
        <div className={styles.subhead}>{t.incoming}</div>
        {incoming.length ? incoming.map(r=><div className={styles.person} key={r.id}><div><strong>{players[r.requester_id]?.nickname||"PLAYER"}</strong></div><button onClick={()=>respondRequest(r.id,"ACCEPTED")} disabled={busy}>{t.accept}</button><button className={styles.secondary} onClick={()=>respondRequest(r.id,"REJECTED")} disabled={busy}>{t.decline}</button></div>) : <p className={styles.muted}>—</p>}
        <div className={styles.subhead}>{t.outgoing}</div>
        {outgoing.length ? outgoing.map(r=><div className={styles.person} key={r.id}><strong>{players[r.addressee_id]?.nickname||"PLAYER"}</strong><small>{t.pending}</small></div>) : <p className={styles.muted}>—</p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTitle}><span>03 / SQUAD MANAGEMENT</span><h2>{t.teams}</h2></div>
        <form className={styles.createTeam} onSubmit={createTeam}><input required minLength={2} maxLength={40} value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder={t.teamName}/><button disabled={busy}>{t.create}</button></form>
        {teams.length ? teams.map(team=><article className={styles.team} key={team.id}><h3>{team.name}</h3><div className={styles.subhead}>{t.members}</div>{members.filter(m=>m.team_id===team.id).map(m=><div className={styles.member} key={m.user_id}><span>{m.role==="CAPTAIN"?"CAPTAIN":"PLAYER"}</span><strong>{m.user_id===userId?(profile?.nickname||"YOU"):(players[m.user_id]?.nickname||"PLAYER")}</strong><small>{m.status==="ACTIVE"?t.active:t.pending}</small></div>)}{team.owner_id===userId&&<div className={styles.invite}><select value={inviteFor[team.id]||""} onChange={e=>setInviteFor(old=>({...old,[team.id]:e.target.value}))}><option value="">{t.chooseFriend}</option>{friends.map(r=>{const other=r.requester_id===userId?r.addressee_id:r.requester_id;return <option key={other} value={other}>{players[other]?.nickname||"PLAYER"}</option>})}</select><button disabled={busy||!inviteFor[team.id]} onClick={()=>inviteFriend(team.id)}>{t.invite}</button></div>}</article>) : <p className={styles.empty}>{t.noTeams}</p>}
      </section>
    </div>

    {pendingTeamInvites.length>0&&<section className={styles.panel}><div className={styles.panelTitle}><span>04 / TEAM REQUESTS</span><h2>{t.invited}</h2></div>{pendingTeamInvites.map(invite=>{const team=invite.team;return <div className={styles.person} key={invite.member.team_id}><strong>{team.name||"TEAM"}</strong><small>INVITED BY {players[invite.member.invited_by || ""]?.nickname||"TEAM CAPTAIN"}</small><button onClick={()=>respondTeamInvite(invite.member.team_id,"ACTIVE")} disabled={busy}>{t.accept}</button><button className={styles.secondary} onClick={()=>respondTeamInvite(invite.member.team_id,"DECLINED")} disabled={busy}>{t.decline}</button></div>})}</section>}
    <div className={styles.bottom}><Link href="/account">← {t.back}</Link><span>COMPETE • CONNECT • CONQUER</span></div>
  </div></main>;
}
