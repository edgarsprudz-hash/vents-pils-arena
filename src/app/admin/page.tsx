"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AdminProfile = { nickname: string | null; display_name: string | null; role: string };

const modules = [
  { number: "01", title: "TOURNAMENTS", description: "Create events, edit details and manage tournament status.", status: "ACTIVE", icon: "🏆", href: "/admin/tournaments" },
  { number: "02", title: "REGISTRATIONS", description: "Review team applications and manage participant entries.", status: "NEXT MODULE", icon: "📋" },
  { number: "03", title: "TEAMS & PLAYERS", description: "View teams, player profiles and membership.", status: "PLANNED", icon: "👥" },
  { number: "04", title: "RANKINGS", description: "Manage competitive points and leaderboard positions.", status: "PLANNED", icon: "📊" },
  { number: "05", title: "NEWSROOM", description: "Publish announcements and arena news.", status: "PLANNED", icon: "📰" },
  { number: "06", title: "USER ACCESS", description: "Review accounts and assign platform roles.", status: "PLANNED", icon: "🛡️" },
  { number: "07", title: "SUPPORT INBOX", description: "Review player tickets and respond to support requests.", status: "ACTIVE", icon: "✉️", href: "/admin/support" },
];

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!supabase) { if (active) { setDenied(true); setLoading(false); } return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data } = await supabase.from("profiles").select("nickname, display_name, role").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (data?.role !== "SUPER_ADMIN") { setDenied(true); setLoading(false); return; }
      setProfile(data);
      setLoading(false);
    }
    verify();
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    }) ?? { data: { subscription: { unsubscribe: () => {} } } };
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router]);

  if (loading) return <main className="admin-page"><div className="admin-loading">VERIFYING ADMIN ACCESS<span>///</span></div></main>;
  if (denied) return <main className="admin-page"><div className="admin-denied"><span>ACCESS RESTRICTED</span><h1>NO ENTRY.</h1><p>This area is available to the VENTSPILS ARENA super administrator only.</p><Link href="/account">BACK TO ACCOUNT ↗</Link></div></main>;

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <div className="admin-crumb"><Link href="/">HOME</Link><b>/</b><Link href="/account">ACCOUNT</Link><b>/</b> ADMIN CONTROL</div>
        <div className="admin-heading">
          <div><span className="admin-eyebrow">VENTSPILS ARENA / CONTROL CENTER</span><h1>ADMIN<br/><em>CONTROL.</em></h1><p>Manage the arena. Shape the competition.</p></div>
          <div className="admin-emblem"><span>VA</span><small>SUPER ADMIN</small></div>
        </div>
        <section className="admin-welcome">
          <div className="admin-welcome-icon">✦</div>
          <div><span>AUTHORIZED SESSION</span><h2>{profile?.display_name || profile?.nickname || "ADMINISTRATOR"}</h2><p>Full administrator access confirmed.</p></div>
          <div className="admin-live"><i/> SYSTEM ONLINE</div>
        </section>
        <div className="admin-section-title"><div><span>MANAGEMENT</span><h2>ARENA MODULES</h2></div><small>CONTROL PANEL / 07 MODULES</small></div>
        <div className="admin-grid">
          {modules.map((item) => <Link href={item.href || "/admin"} className="admin-module" key={item.number}>
            <div className="admin-module-top"><span>{item.number} / 06</span><span className="admin-module-icon">{item.icon}</span></div>
            <h3>{item.title}</h3><p>{item.description}</p>
            <div className="admin-module-bottom"><span>{item.status}</span><i>↗</i></div>
          </Link>)}
        </div>
        <div className="admin-footer-actions"><Link href="/account">← PERSONAL CABINET</Link><Link href="/tournaments">VIEW PUBLIC TOURNAMENTS ↗</Link></div>
      </div>
    </main>
  );
}
