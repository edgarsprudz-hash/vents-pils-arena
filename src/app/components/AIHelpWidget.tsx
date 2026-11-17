"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

type Message = { role: "user" | "assistant"; content: string };
const copy = {
  en: { open: "Open AI help", title: "ARENA ASSISTANT", subtitle: "Website & tournament support", welcome: "Hi! I'm the VENTSPILS ARENA assistant. Tell me what went wrong and I'll help you.", placeholder: "Write a message...", send: "SEND", thinking: "THINKING...", error: "Couldn't send your message. Please try again.", privacy: "Never share passwords or 2FA codes.", close: "Close chat" },
  ru: { open: "Открыть ИИ-помощника", title: "ПОМОЩНИК ARENA", subtitle: "Помощь по сайту и турнирам", welcome: "Привет! Я помощник VENTSPILS ARENA. Расскажи, что произошло, и я постараюсь помочь.", placeholder: "Напишите сообщение...", send: "ОТПРАВИТЬ", thinking: "ДУМАЮ...", error: "Не удалось отправить сообщение. Попробуйте ещё раз.", privacy: "Не отправляйте пароли и коды 2FA.", close: "Закрыть чат" },
  lv: { open: "Atvērt MI palīgu", title: "ARENA PALĪGS", subtitle: "Vietnes un turnīru atbalsts", welcome: "Sveiki! Es esmu VENTSPILS ARENA palīgs. Pastāstiet, kas noticis, un es centīšos palīdzēt.", placeholder: "Rakstiet ziņu...", send: "SŪTĪT", thinking: "DOMĀJU...", error: "Neizdevās nosūtīt ziņu. Mēģiniet vēlreiz.", privacy: "Nesūtiet paroles vai 2FA kodus.", close: "Aizvērt tērzēšanu" },
} as const;

export default function AIHelpWidget() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const t = copy[language] || copy.en;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy, open]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, language, page: pathname || "/" }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || t.error);
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
      if (data.ticketCreated && typeof data.ticketNumber === "number") setTicketNumber(data.ticketNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="va-ai-root">
      {open && <section className="va-ai-panel" aria-label={t.title}>
        <header className="va-ai-header">
          <span className="va-ai-mark">VA</span>
          <div><strong>{t.title}</strong><small>{t.subtitle}</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label={t.close}>×</button>
        </header>
        <div className="va-ai-messages" aria-live="polite">
          {messages.length === 0 && <div className="va-ai-bubble assistant">{t.welcome}</div>}
          {messages.map((message, index) => <div key={index} className={"va-ai-bubble " + message.role}>{message.content}</div>)}
          {busy && <div className="va-ai-thinking">{t.thinking}</div>}
          {ticketNumber !== null && <div className="va-ai-ticket">SUPPORT TICKET #{ticketNumber}</div>}
          {error && <div className="va-ai-error">{error}</div>}
          <div ref={bottomRef} />
        </div>
        <form className="va-ai-compose" onSubmit={send}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.placeholder} maxLength={2000} disabled={busy} aria-label={t.placeholder} />
          <button type="submit" disabled={busy || !draft.trim()}>{busy ? "…" : "↗"}</button>
        </form>
        <p className="va-ai-privacy">{t.privacy}</p>
      </section>}
      <button className={"va-ai-launcher" + (open ? " is-open" : "")} type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? t.close : t.open}>
        {open ? "×" : <><span className="va-ai-launcher-dot" />AI</>}
      </button>
    </div>
  );
}
