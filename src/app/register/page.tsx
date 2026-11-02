"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationOpen, setVerificationOpen] = useState(false);
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
      email: email.trim(),
      password,
      options: { data: { nickname: nickname.trim(), display_name: displayName.trim() || nickname.trim() } }
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      window.location.href = "/";
    } else {
      setVerificationOpen(true);
      setMessage("A 6-digit verification code has been sent to your email.");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email"
    });
    setBusy(false);
    if (error) {
      setMessage("Invalid or expired code. Check the code and try again.");
      return;
    }
    window.location.href = "/";
  }

  async function resendCode() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setBusy(false);
    setMessage(error ? error.message : "A new verification code has been sent.");
  }

  return <main className="event">
    <Link href="/">← HOME</Link>
    <h2>REGISTER<em>.</em></h2>
    {!verificationOpen ? (
      <form onSubmit={handleSubmit} style={{display:"grid",gap:14,maxWidth:420}}>
        <label>Nickname<input required minLength={3} maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} /></label>
        <label>Display name<input maxLength={40} value={displayName} onChange={e=>setDisplayName(e.target.value)} /></label>
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}</button>
      </form>
    ) : (
      <section role="dialog" aria-modal="true" aria-labelledby="verify-title" style={{maxWidth:420,padding:24,border:"1px solid #444",borderRadius:12,background:"#111"}}>
        <h3 id="verify-title">VERIFY YOUR EMAIL</h3>
        <p>Enter the 6-digit code sent to {email}.</p>
        <form onSubmit={handleVerify} style={{display:"grid",gap:14}}>
          <label>Verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" /></label>
          <button type="submit" disabled={busy || otp.length !== 6}>{busy ? "VERIFYING..." : "VERIFY CODE"}</button>
        </form>
        <button type="button" onClick={resendCode} disabled={busy} style={{marginTop:12}}>RESEND CODE</button>
      </section>
    )}
    {message && <p role="status">{message}</p>}
    <p>Already registered? <Link href="/login">Sign in</Link></p>
  </main>;
}
