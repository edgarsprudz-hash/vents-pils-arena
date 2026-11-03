"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SteamLink from "./steam-link";
import MyMatches from "./matches";

type Profile = { nickname: string | null; display_name: string | null; role: string; steam_id?: string | null };

export default function AccountPage() {
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

  if (loading) return <main className="account-page"><p className="account-loading">LOADING PLAYER PROFILE...</p></main>;

  return (
    <main className="account-page">
      <div className="account-shell">
        <div className="account-breadcrumb"><Link href="/">HOME</Link><span>/</span> PERSONAL CABINET</div>
        <div className="account-heading"><div><span className="account-kicker">VENTSPILS ARENA / PLAYER AREA</span><h1>PERSONAL<br/><em>CABINET.</em></h1></div><span className="account-mark">VA</span></div>
        <section className="profile-panel">
          <div className="profile-topline"><span>ACCOUNT OVERVIEW</span><span className="profile-status"><i/> ACTIVE SESSION</span></div>
          <div className="profile-main">
            <div className="profile-avatar">{(profile?.display_name || profile?.nickname || email || "P").slice(0,1).toUpperCase()}</div>
            <div className="profile-identity"><span className="account-kicker">WELCOME BACK</span><h2>{profile?.display_name || profile?.nickname || "PLAYER"}</h2><p>{email}</p></div>
            <span className="profile-role">{profile?.role === "SUPER_ADMIN" ? "SUPER ADMIN" : "PLAYER"}</span>
          </div>
          <div className="profile-details">
            <div><span>PLAYER NICKNAME</span><strong>{profile?.nickname || "NOT SET"}</strong></div>
            <div><span>DISPLAY NAME</span><strong>{profile?.display_name || "NOT SET"}</strong></div>
            <div><span>ACCOUNT TYPE</span><strong>{profile?.role || "PLAYER"}</strong></div>
          </div>
        </section>
        <section className="account-actions">
          <div><span className="account-kicker">YOUR SPACE</span><h3>READY TO COMPETE?</h3><p>Your player profile and arena account are in one place.</p></div>
          <div className="account-action-links"><Link href="/tournaments">BROWSE TOURNAMENTS <span>↗</span></Link>{profile?.role === "SUPER_ADMIN" && <Link href="/admin">ADMIN CONTROL <span>↗</span></Link>}<button type="button" onClick={logout}>LOG OUT <span>↗</span></button></div>
        </section>
        <SteamLink steamId={profile?.steam_id} />
        <MyMatches />
        {message && <p className="account-message" role="status">{message}</p>}
      </div>
    </main>
  );
}
