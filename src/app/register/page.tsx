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
  const [legalConsent, setLegalConsent] = useState(false);
  const TERMS_VERSION = "2026-11-02";
  const PRIVACY_VERSION = "2026-11-02";
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
    if (!legalConsent) { setMessage("You must accept the Terms & Conditions and Privacy Policy to create an account."); return; }
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nickname: nickname.trim(), display_name: displayName.trim() || nickname.trim(), legal_consent: true, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION } }
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

  return <main className="auth-page">
    <div className="auth-page-glow" aria-hidden="true" />
    <div className="auth-layout">
      <aside className="auth-visual">
        <Link href="/" className="auth-back">← BACK TO ARENA</Link>
        <div className="auth-visual-mark">VA<span>.</span></div>
        <div className="auth-visual-copy">
          <span className="auth-kicker"><i /> VENTSPILS ARENA / PLAYER ACCESS</span>
          <h1>YOUR<br />GAME.<br /><em>YOUR</em><br />LEGACY.</h1>
          <p>Join the community. Build your profile. Compete with the best.</p>
        </div>
        <div className="auth-visual-footer"><span>COMPETE • CONNECT • CONQUER</span><span>LATVIA / EST. 2026</span></div>
      </aside>
      <section className="auth-card">
        <div className="auth-card-top"><span>ACCOUNT REGISTRATION</span><b>01 <i>/</i> 02</b></div>
        {!verificationOpen ? (
          <>
            <span className="auth-card-kicker">CREATE YOUR PROFILE</span>
            <h2>JOIN THE<br />ARENA<em>.</em></h2>
            <p className="auth-description">Set up your player account to take part in the VENTSPILS ARENA community.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <label>Nickname<input required minLength={3} maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Your gaming nickname" /></label>
              <label>Display name<input maxLength={40} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="How others will see you" /></label>
              <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" /></label>
              <label>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
              <label className="auth-consent"><input type="checkbox" required checked={legalConsent} onChange={e=>setLegalConsent(e.target.checked)} /><span>I agree to the <Link href="/terms" target="_blank">Terms & Conditions</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>. I confirm that I have read both documents.</span></label>
              <button type="submit" disabled={busy || !legalConsent}>{busy ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"} <span>→</span></button>
            </form>
          </>
        ) : (
          <section role="dialog" aria-modal="true" aria-labelledby="verify-title" className="auth-verification">
            <span className="auth-card-kicker">ONE LAST STEP</span>
            <h2 id="verify-title">VERIFY<br />YOUR EMAIL<em>.</em></h2>
            <p className="auth-description">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
            <form onSubmit={handleVerify} className="auth-form">
              <label>6-DIGIT VERIFICATION CODE<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\\D/g,"").slice(0,6))} placeholder="000000" /></label>
              <button type="submit" disabled={busy || otp.length !== 6}>{busy ? "VERIFYING..." : "VERIFY CODE"} <span>→</span></button>
            </form>
            <button type="button" className="auth-resend" onClick={resendCode} disabled={busy}>RESEND CODE</button>
          </section>
        )}
        {message && <p role="status" className="auth-message">{message}</p>}
        <p className="auth-switch">Already have an account? <Link href="/login">SIGN IN <span>→</span></Link></p>
      </section>
    </div>
  </main>;
}
