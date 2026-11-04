"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SteamLink from "./steam-link";
import MyMatches from "./matches";
import { useLanguage } from "../components/LanguageProvider";

type Profile = { nickname: string | null; display_name: string | null; role: string; steam_id?: string | null };

export default function AccountPage() {
  const {language}=useLanguage();
  const tr=language==="ru"?{loading:"ЗАГРУЗКА ПРОФИЛЯ ИГРОКА...",crumb:"ЛИЧНЫЙ КАБИНЕТ",heading:"ЛИЧНЫЙ",sub:"КАБИНЕТ.",overview:"ОБЗОР АККАУНТА",active:"СЕАНС АКТИВЕН",welcome:"С ВОЗВРАЩЕНИЕМ",player:"ИГРОК",nickname:"НИКНЕЙМ ИГРОКА",display:"ОТОБРАЖАЕМОЕ ИМЯ",type:"ТИП АККАУНТА",notset:"НЕ УКАЗАНО",space:"ТВОЁ ПРОСТРАНСТВО",ready:"ГОТОВ К ИГРЕ?",spaceText:"Профиль игрока и аккаунт арены — в одном месте.",browse:"СМОТРЕТЬ ТУРНИРЫ",admin:"ПАНЕЛЬ АДМИНИСТРАТОРА",logout:"ВЫЙТИ"}:language==="lv"?{loading:"IELĀDĒ SPĒLĒTĀJA PROFILU...",crumb:"PERSONĪGAIS KABINETS",heading:"PERSONĪGAIS",sub:"KABINETS.",overview:"KONTA PĀRSKATS",active:"SESIJA AKTĪVA",welcome:"LAIPNI ATGRIEZIES",player:"SPĒLĒTĀJS",nickname:"SPĒLĒTĀJA NIKS",display:"ATTĒLOTAIS VĀRDS",type:"KONTA TIPS",notset:"NAV IESTATĪTS",space:"TAVA TELPA",ready:"GATAVS SACENSTIES?",spaceText:"Tavs spēlētāja profils un arēnas konts vienuviet.",browse:"APSKATĪT TURNĪRUS",admin:"ADMINISTRĀCIJAS PANELIS",logout:"IZIET"}:{loading:"{tr.loading}",crumb:"{tr.crumb}",heading:"PERSONAL",sub:"CABINET.",overview:"{tr.overview}",active:"{tr.active}",welcome:"{tr.welcome}",player:tr.player,nickname:"{tr.nickname}",display:"{tr.display}",type:"{tr.type}",notset:tr.notset,space:"{tr.space}",ready:"{tr.ready}",spaceText:"{tr.spaceText}",browse:"{tr.browse}",admin:"{tr.admin}",logout:"{tr.logout}"};
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setMessage("Authentication is not configured."); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setEmail(session.user.email ?? "");
      const params = new URLSearchParams(window.location.search);
      const steamError = params.get("steam_error");
      if (steamError) setMessage("STEAM: " + steamError);
      else if (params.get("steam") === "linked") setMessage("Steam account connected successfully.");
      const { data } = await supabase.from("profiles").select("nickname, display_name, role, steam_id").eq("id", session.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function logout() {
    await supabase?.auth.signOut();
    router.replace("/");
  }

  if (loading) return <main className="account-page"><p className="account-loading">{tr.loading}</p></main>;

  return (
    <main className="account-page">
      <div className="account-shell">
        <div className="account-breadcrumb"><Link href="/">HOME</Link><span>/</span> {tr.crumb}</div>
        <div className="account-heading"><div><span className="account-kicker">VENTSPILS ARENA / PLAYER AREA</span><h1>{tr.heading}<br/><em>{tr.sub}</em></h1></div><span className="account-mark">VA</span></div>
        <section className="profile-panel">
          <div className="profile-topline"><span>{tr.overview}</span><span className="profile-status"><i/> {tr.active}</span></div>
          <div className="profile-main">
            <div className="profile-avatar">{(profile?.display_name || profile?.nickname || email || "P").slice(0,1).toUpperCase()}</div>
            <div className="profile-identity"><span className="account-kicker">{tr.welcome}</span><h2>{profile?.display_name || profile?.nickname || tr.player}</h2><p>{email}</p></div>
            <span className="profile-role">{profile?.role === "SUPER_ADMIN" ? "SUPER ADMIN" : tr.player}</span>
          </div>
          <div className="profile-details">
            <div><span>{tr.nickname}</span><strong>{profile?.nickname || tr.notset}</strong></div>
            <div><span>{tr.display}</span><strong>{profile?.display_name || tr.notset}</strong></div>
            <div><span>{tr.type}</span><strong>{profile?.role || tr.player}</strong></div>
          </div>
        </section>
        <section className="account-actions">
          <div><span className="account-kicker">{tr.space}</span><h3>{tr.ready}</h3><p>{tr.spaceText}</p></div>
          <div className="account-action-links"><Link href="/tournaments">{tr.browse} <span>↗</span></Link>{profile?.role === "SUPER_ADMIN" && <Link href="/admin">{tr.admin} <span>↗</span></Link>}<button type="button" onClick={logout}>{tr.logout} <span>↗</span></button></div>
        </section>
        <SteamLink steamId={profile?.steam_id} />
        <MyMatches />
        {message && <p className="account-message" role="status">{message}</p>}
      </div>
    </main>
  );
}
