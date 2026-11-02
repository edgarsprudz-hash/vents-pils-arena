"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!email) return <Link className="nav-signin" href="/login">SIGN IN <span>↗</span></Link>;

  return (
    <div className="account-menu">
      <button className="account-trigger" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="account-avatar">{email.slice(0, 1).toUpperCase()}</span>
        <span className="account-trigger-copy"><strong>MY ACCOUNT</strong><small>PLAYER PROFILE</small></span>
        <span className="account-chevron">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="account-dropdown">
        <div className="dropdown-user"><span className="dropdown-label">SIGNED IN AS</span><strong>{email}</strong></div>
        <Link href="/account" onClick={() => setOpen(false)}>PERSONAL CABINET <span>↗</span></Link>
        <button type="button" onClick={async () => { await supabase?.auth.signOut(); window.location.href = "/"; }}>LOG OUT <span>↗</span></button>
      </div>}
    </div>
  );
}
