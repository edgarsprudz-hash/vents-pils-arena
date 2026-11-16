"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../components/LanguageProvider";

export default function LoginPage() {
  const { language } = useLanguage();
  const ru = language === "ru", lv = language === "lv";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!supabase) { setMessage(ru ? "Supabase не настроен. Проверьте переменные окружения Vercel." : lv ? "Supabase nav konfigurēts. Pārbaudiet Vercel vides mainīgos." : "Supabase is not configured. Check the Vercel environment variables."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); setMessage(error.message); return; }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) { setBusy(false); setMessage(assuranceError.message); return; }
    if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.find(item => item.status === "verified");
      if (factorError || !factor) { setBusy(false); setMessage(factorError?.message || (ru ? "Не найдено подтверждённое устройство 2FA." : lv ? "Nav atrasta apstiprināta 2FA ierīce." : "No verified 2FA device was found.")); return; }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      setBusy(false);
      if (challengeError) { setMessage(challengeError.message); return; }
      setMfaChallenge({ factorId: factor.id, challengeId: challenge.id });
      setMessage(ru ? "Введи код из Google Authenticator." : lv ? "Ievadi kodu no Google Authenticator." : "Enter the code from Google Authenticator.");
      return;
    }
    setBusy(false);
    setMessage(ru ? "Вход выполнен." : lv ? "Pieteikšanās veiksmīga." : "Signed in successfully.");
    window.location.href = "/";
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !mfaChallenge) return;
    const code = mfaCode.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) { setMessage(ru ? "Введи 6-значный код." : lv ? "Ievadi 6 ciparu kodu." : "Enter the 6-digit code."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.mfa.verify({ factorId: mfaChallenge.factorId, challengeId: mfaChallenge.challengeId, code });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    window.location.href = "/";
  }

  return <main className="event">
    <Link href="/">← {ru ? "НА ГЛАВНУЮ" : lv ? "UZ SĀKUMU" : "HOME"}</Link>
    <h2>{mfaChallenge ? (ru ? "ПОДТВЕРЖДЕНИЕ 2FA" : lv ? "2FA APSTIPRINĀŠANA" : "TWO-FACTOR CHECK") : (ru ? "ВХОД" : lv ? "PIESLĒGTIES" : "SIGN IN")}<em>.</em></h2>
    {mfaChallenge ? <form onSubmit={verifyMfa} style={{display:"grid",gap:14,maxWidth:420}}>
      <p style={{color:"#aaa",fontSize:12,lineHeight:1.7}}>{ru ? "Открой Google Authenticator и введи 6-значный код для VENTSPILS ARENA." : lv ? "Atver Google Authenticator un ievadi VENTSPILS ARENA 6 ciparu kodu." : "Open Google Authenticator and enter the 6-digit code for VENTSPILS ARENA."}</p>
      <label>{ru ? "КОД АУТЕНТИФИКАТОРА" : lv ? "AUTENTIFIKATORA KODS" : "AUTHENTICATOR CODE"}<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" /></label>
      <button type="submit" disabled={busy || mfaCode.length !== 6}>{busy ? "..." : (ru ? "ПОДТВЕРДИТЬ И ВОЙТИ" : lv ? "APSTIPRINĀT UN IEIET" : "VERIFY & SIGN IN")}</button>
      <button type="button" className="profile-secondary-button" onClick={()=>{setMfaChallenge(null);setMfaCode("");void supabase?.auth.signOut();}}>{ru ? "ОТМЕНИТЬ ВХОД" : lv ? "ATCELT PIETEIKŠANOS" : "CANCEL SIGN IN"}</button>
    </form> : <form onSubmit={handleSubmit} style={{display:"grid",gap:14,maxWidth:420}}>
      <label>{ru ? "Электронная почта" : lv ? "E-pasts" : "Email"}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>{ru ? "Пароль" : lv ? "Parole" : "Password"}<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? (ru ? "ВХОД..." : lv ? "PIESLĒDZAS..." : "SIGNING IN...") : (ru ? "ВОЙТИ" : lv ? "PIESLĒGTIES" : "SIGN IN")}</button>
    </form>}
    {message && <p role="status">{message}</p>}
    {!mfaChallenge && <p>{ru ? "Ещё нет аккаунта?" : lv ? "Vēl nav konta?" : "New player?"} <Link href="/register">{ru ? "Создать аккаунт" : lv ? "Izveidot kontu" : "Create an account"}</Link></p>}
  </main>;
}
