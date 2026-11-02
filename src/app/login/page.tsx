"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured. Check the Vercel environment variables.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(error ? error.message : "Signed in successfully.");
    if (!error) window.location.href = "/";
  }

  return <main className="event">
    <Link href="/">← HOME</Link>
    <h2>SIGN IN<em>.</em></h2>
    <form onSubmit={handleSubmit} style={{display:"grid",gap:14,maxWidth:420}}>
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? "SIGNING IN..." : "SIGN IN"}</button>
    </form>
    {message && <p role="status">{message}</p>}
    <p>New player? <Link href="/register">Create an account</Link></p>
  </main>;
}
