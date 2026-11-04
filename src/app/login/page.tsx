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
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!supabase) { setMessage(ru ? "Supabase не настроен. Проверьте переменные окружения Vercel." : lv ? "Supabase nav konfigurēts. Pārbaudiet Vercel vides mainīgos." : "Supabase is not configured. Check the Vercel environment variables."); return; }
    setBusy(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setBusy(false);
    setMessage(error ? error.message : (ru ? "Вход выполнен." : lv ? "Pieteikšanās veiksmīga." : "Signed in successfully."));
    if (!error) window.location.href = "/";
  }
  return <main className="event">
    <Link href="/">← {ru ? "НА ГЛАВНУЮ" : lv ? "UZ SĀKUMU" : "HOME"}</Link>
    <h2>{ru ? "ВХОД" : lv ? "PIESLĒGTIES" : "SIGN IN"}<em>.</em></h2>
    <form onSubmit={handleSubmit} style={{display:"grid",gap:14,maxWidth:420}}>
      <label>{ru ? "Электронная почта" : lv ? "E-pasts" : "Email"}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>{ru ? "Пароль" : lv ? "Parole" : "Password"}<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? (ru ? "ВХОД..." : lv ? "PIESLĒDZAS..." : "SIGNING IN...") : (ru ? "ВОЙТИ" : lv ? "PIESLĒGTIES" : "SIGN IN")}</button>
    </form>
    {message && <p role="status">{message}</p>}
    <p>{ru ? "Ещё нет аккаунта?" : lv ? "Vēl nav konta?" : "New player?"} <Link href="/register">{ru ? "Создать аккаунт" : lv ? "Izveidot kontu" : "Create an account"}</Link></p>
  </main>;
}