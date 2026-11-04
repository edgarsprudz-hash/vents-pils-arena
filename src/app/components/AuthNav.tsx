"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage, translations } from "./LanguageProvider";

export default function AuthNav() {
  const {language}=useLanguage(); const t=translations[language];
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!email) return <Link className="nav-signin" href="/login">{t.signIn} <span>↗</span></Link>;
  return <div className="account-menu">
    <button className="account-trigger" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="account-avatar">{email.slice(0, 1).toUpperCase()}</span>
      <span className="account-trigger-copy"><strong>{t.myAccount}</strong><small>{t.profile}</small></span>
      <span className="account-chevron">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="account-dropdown">
      <div className="dropdown-user"><span className="dropdown-label">{t.signedIn}</span><strong>{email}</strong></div>
      <Link href="/account" onClick={() => setOpen(false)}>{t.cabinet} <span>↗</span></Link>
      <button type="button" onClick={async () => { await supabase?.auth.signOut(); window.location.href = "/"; }}>{t.logout} <span>↗</span></button>
    </div>}
  </div>;
}
