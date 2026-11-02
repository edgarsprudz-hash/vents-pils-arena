"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!email) return <Link href="/login">SIGN IN ↗</Link>;
  return <span className="auth-nav">
    <Link href="/account">{email}</Link>
    <button type="button" onClick={async () => { await supabase?.auth.signOut(); window.location.href = "/"; }}>SIGN OUT</button>
  </span>;
}
