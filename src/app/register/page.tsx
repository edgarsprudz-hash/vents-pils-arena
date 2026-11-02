"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured. Check the Vercel environment variables.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname.trim(), display_name: displayName.trim() || nickname.trim() } }
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (data.session) {
      setMessage("Account created. Welcome to VENTSPILS ARENA!");
      window.location.href = "/";
    } else {
      setMessage("Account created. Check your email to confirm registration, then sign in.");
    }
  }

  return <main className="event">
    <Link href="/">← HOME</Link>
    <h2>REGISTER<em>.</em></h2>
    <form onSubmit={handleSubmit} style={{display:"grid",gap:14,maxWidth:420}}>
      <label>Nickname<input required minLength={3} maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} /></label>
      <label>Display name<input maxLength={40} value={displayName} onChange={e=>setDisplayName(e.target.value)} /></label>
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}</button>
    </form>
    {message && <p role="status">{message}</p>}
    <p>Already registered? <Link href="/login">Sign in</Link></p>
  </main>;
}
