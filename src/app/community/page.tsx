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

  const codeLabels = ru ? {
    heading: "ДОБАВИТЬ ПО КОДУ ДРУГА", yourCode: "ТВОЙ КОД ДРУГА", copy: "КОПИРОВАТЬ",
    share: "Отправь этот код человеку, чтобы он мог найти тебя.", enterCode: "ВВЕДИ 8-СИМВОЛЬНЫЙ КОД",
    find: "НАЙТИ", add: "+ ДОБАВИТЬ", empty: "Введи код друга.", error: "Не удалось найти пользователя.",
    notFound: "Пользователь с таким кодом не найден.", alreadyFriend: "Вы уже друзья.", pending: "Запрос в друзья уже существует.", copied: "Код скопирован."
  } : lv ? {
    heading: "PIEVIENOT PĒC DRAUGA KODA", yourCode: "TAVS DRAUGA KODS", copy: "KOPĒT",
    share: "Nosūti šo kodu, lai cits spēlētājs varētu tevi atrast.", enterCode: "IEVADI 8 ZĪMJU KODU",
    find: "MEKLĒT", add: "+ PIEVIENOT", empty: "Ievadi drauga kodu.", error: "Neizdevās atrast spēlētāju.",
    notFound: "Spēlētājs ar šādu kodu nav atrasts.", alreadyFriend: "Jūs jau esat draugi.", pending: "Draudzības pieprasījums jau pastāv.", copied: "Kods nokopēts."
  } : {
    heading: "ADD A FRIEND BY CODE", yourCode: "YOUR FRIEND CODE", copy: "COPY",
    share: "Share this code so another player can find you.", enterCode: "ENTER 8-CHARACTER CODE",
    find: "FIND PLAYER", add: "+ ADD FRIEND", empty: "Enter a friend code.", error: "Could not find the player.",
    notFound: "No player found with that code.", alreadyFriend: "You are already friends.", pending: "A friend request already exists.", copied: "Code copied."
  };

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Player | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamInvites, setTeamInvites] = useState<{ member: Member; team: Team }[]>([]);
  const [friendCode, setFriendCode] = useState("");
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [codeResult, setCodeResult] = useState<Player | null>(null);
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
    const [{ data: me }, { data: ownCode }, { data: reqs }, { data: ownTeams }, { data: invites }] = await Promise.all([
      supabase.rpc("get_arena_player_profiles", { p_user_ids: [session.user.id] }),
      supabase.rpc("get_my_arena_friend_code"),
      supabase.from("friend_requests").select("id,requester_id,addressee_id,status").or("requester_id.eq." + session.user.id + ",addressee_id.eq." + session.user.id),
      supabase.from("arena_teams").select("id,name,owner_id").eq("owner_id", session.user.id).order("created_at"),
      supabase.from("arena_team_members").select("team_id,user_id,role,status,invited_by").eq("user_id", session.user.id).eq("status", "INVITED")
    ]);
    setProfile(((me || [])[0] || null) as Player | null);
    setFriendCode((ownCode || "") as string);
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
    const { data: friendProfiles } = playerIds.length ? await supabase.rpc("get_arena_player_profiles", { p_user_ids: playerIds }) : { data: [] as Player[] };
    const directory: Record<string, Player> = {};
    (friendProfiles || []).forEach((p: Player) => { directory[p.id] = p; });
    setPlayers(directory);
    setTeams(allTeams.filter((team, index) => allTeams.findIndex(other => other.id === team.id) === index));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function findFriendByCode(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !friendCodeInput.trim()) { setMessage(codeLabels.empty); return; }
    setBusy(true); setMessage(""); setCodeResult(null);
    const { data, error } = await supabase.rpc("find_arena_player_by_friend_code", { p_code: friendCodeInput.trim().toUpperCase() });
    if (error) setMessage(codeLabels.error);
    else if (!data?.length) setMessage(codeLabels.notFound);
    else {
      const player = data[0] as Player;
      setCodeResult(player);
      const { data: existing } = await supabase.from("friend_requests").select("id,requester_id,addressee_id,status")
        .or("and(requester_id.eq." + userId + ",addressee_id.eq." + player.id + "),and(requester_id.eq." + player.id + ",addressee_id.eq." + userId + ")").maybeSingle();
      if (existing?.status === "ACCEPTED") setMessage(codeLabels.alreadyFriend);
      else if (existing?.status === "PENDING") setMessage(codeLabels.pending);
    }
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
      <div className={styles.panelTitle}><span>01 / PLAYER NETWORK</span><h2>{codeLabels.heading}</h2></div>
      <div className={styles.friendCodeBox}>
        <span className={styles.codeLabel}>{codeLabels.yourCode}</span>
        <div className={styles.codeRow}><strong>{friendCode || "— — — — — — — —"}</strong><button type="button" onClick={() => { void navigator.clipboard.writeText(friendCode); setMessage(codeLabels.copied); }} disabled={!friendCode}>{codeLabels.copy}</button></div>
        <p className={styles.muted}>{codeLabels.share}</p>
      </div>
      <form className={styles.search} onSubmit={findFriendByCode}>
        <input value={friendCodeInput} onChange={e=>setFriendCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,8))} maxLength={8} placeholder={codeLabels.enterCode} autoCapitalize="characters"/>
        <button disabled={busy || friendCodeInput.length !== 8}>{busy ? "..." : codeLabels.find}</button>
      </form>
      {codeResult && <article className={styles.person}>
        <div className={styles.avatar}>{(codeResult.nickname||"P").slice(0,1).toUpperCase()}</div>
        <div><strong>{codeResult.nickname}</strong><small>{codeResult.display_name || "VENTSPILS ARENA PLAYER"}</small></div>
        <button disabled={busy || requests.some(r => (r.requester_id===userId&&r.addressee_id===codeResult.id)||(r.requester_id===codeResult.id&&r.addressee_id===userId))} onClick={()=>sendRequest(codeResult.id)}>{codeLabels.add}</button>
      </article>}
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
