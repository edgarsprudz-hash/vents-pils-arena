"use client";
import Link from "next/link";
import { useState } from "react";
import AuthNav from "../components/AuthNav";
import { useLanguage } from "../components/LanguageProvider";

export default function SupportPage() {
  const {language}=useLanguage();
  const tr=language==="ru"?{crumb:"ЦЕНТР ПОДДЕРЖКИ",kicker:"VENTSPILS ARENA · ПОМОЩЬ ИГРОКАМ",title:"ЧЕМ МЫ МОЖЕМ",sub:"ПОМОЧЬ?",desc:"Создай обращение в поддержку. Команда рассмотрит запрос и свяжется с тобой по электронной почте.",aside:"МЫ НА",aside2:"ТВОЕЙ",aside3:"СТОРОНЕ.",asideText:"Проблемы с аккаунтом, вопросы по турнирам или технические неполадки — напиши нам, и команда ответит по электронной почте.",email:"ЭЛЕКТРОННАЯ ПОЧТА",community:"СООБЩЕСТВО",ticket:"НОВОЕ ОБРАЩЕНИЕ",formtitle:"СОЗДАТЬ",formsub:"ОБРАЩЕНИЕ.",required:"Все поля обязательны.",yourEmail:"ТВОЯ ПОЧТА",help:"С ЧЕМ НУЖНА ПОМОЩЬ?",issue:"ОПИШИ ПРОБЛЕМУ",placeholder:"Расскажи, что произошло и какая помощь нужна...",create:"СОЗДАТЬ ОБРАЩЕНИЕ",creating:"СОЗДАЁМ ОБРАЩЕНИЕ...",privacy:"Данные используются только для ответа на обращение.",account:"Аккаунт и вход",reg:"Регистрация на турнир",team:"Управление командой",tech:"Техническая проблема",report:"Жалоба на игрока",other:"Другое"}:language==="lv"?{crumb:"ATBALSTA CENTRS",kicker:"VENTSPILS ARENA · SPĒLĒTĀJU ATBALSTS",title:"KĀ MĒS VARAM",sub:"PALĪDZĒT?",desc:"Izveido atbalsta pieprasījumu. Mūsu komanda to izskatīs un sazināsies ar tevi e-pastā.",aside:"MĒS ESAM",aside2:"TAVĀ",aside3:"PUSĒ.",asideText:"Konta problēmas, jautājumi par turnīriem vai tehniskas kļūmes — raksti mums, un komanda atbildēs e-pastā.",email:"ATBALSTA E-PASTS",community:"KOPIENA",ticket:"JAUNS ATBALSTA PIEPRASĪJUMS",formtitle:"IESNIEGT",formsub:"PIEPRASĪJUMU.",required:"Visi lauki ir obligāti.",yourEmail:"TAVA E-PASTA ADRESE",help:"KĀDĀ JAUTĀJUMĀ VAJADZĪGA PALĪDZĪBA?",issue:"APRAKSTI PROBLĒMU",placeholder:"Apraksti, kas notika un kāda palīdzība nepieciešama...",create:"IZVEIDOT PIEPRASĪJUMU",creating:"IZVEIDO PIEPRASĪJUMU...",privacy:"Tavi dati tiks izmantoti tikai atbildes sniegšanai.",account:"Konts un pieslēgšanās",reg:"Reģistrācija turnīram",team:"Komandas pārvaldība",tech:"Tehniska problēma",report:"Ziņot par spēlētāju",other:"Cits"}:{crumb:{tr.crumb},kicker:"{tr.kicker}",title:"HOW CAN WE",sub:"HELP YOU?",desc:"{tr.desc}",aside:"WE’RE",aside2:"ON YOUR",aside3:"SIDE.",asideText:"{tr.asideText}",email:"{tr.email}",community:"{tr.community}",ticket:"{tr.ticket}",formtitle:"SUBMIT A",formsub:"TICKET.",required:"{tr.required}",yourEmail:"{tr.yourEmail}",help:"{tr.help}",issue:"{tr.issue}",placeholder:"{tr.placeholder}",create:"{tr.create}",creating:"{tr.creating}",privacy:"{tr.privacy}",account:"Account & login",reg:"Tournament registration",team:"Team management",tech:"Technical issue",report:"Report a player",other:"Other"};
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Account & login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [ticket, setTicket] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    setTicket("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setStatus(result.error || "We could not create your ticket. Please try again later.");
      } else {
        setTicket(String(result.ticket_number));
        setStatus("Your ticket has been created. Save its reference number.");
        setEmail("");
        setMessage("");
      }
    } catch {
      setStatus("Connection error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main><header><b>V <span>VENTSPILS ARENA</span></b><nav><Link href="/tournaments">TOURNAMENTS</Link><Link href="/teams">TEAMS</Link><Link href="/rankings">RANKINGS</Link><Link href="/news">NEWS</Link><Link href="/rules">RULES</Link></nav><AuthNav/></header>
  <section className="support-page"><div className="support-shell"><div className="support-crumb"><Link href="/">HOME</Link><b>/</b> SUPPORT CENTER</div>
  <div className="support-heading"><div><span className="support-kicker">{tr.kicker}</span><h1>{tr.title}<br/><em>{tr.sub}</em></h1><p>{tr.desc}</p></div><div className="support-stamp"><strong>VA</strong><small>PLAYER<br/>SUPPORT</small></div></div>
  <div className="support-layout"><aside className="support-aside"><span className="support-kicker">SUPPORT DESK / 01</span><h2>{tr.aside}<br/>{tr.aside2}<br/><em>{tr.aside3}</em></h2><p>{tr.asideText}</p><div className="support-contact"><small>{tr.email}</small><a href="mailto:vcupsupport@gmail.com">VCUPSUPPORT@GMAIL.COM ↗</a></div><div className="support-contact"><small>{tr.community}</small><a href="https://discord.gg/B8AebRKUJJ" target="_blank" rel="noreferrer">JOIN OUR DISCORD ↗</a></div></aside>
  <form className="support-form" onSubmit={submit}><div className="support-form-top"><span>{tr.ticket}</span><small>FORM / 001</small></div><h2>{tr.formtitle} <em>{tr.formsub}</em></h2><p>{tr.required}</p>
  <label>{tr.yourEmail}<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
  <label>{tr.help}<select value={subject} onChange={e=>setSubject(e.target.value)}><option>{tr.account}</option><option>{tr.reg}</option><option>{tr.team}</option><option>{tr.tech}</option><option>{tr.report}</option><option>{tr.other}</option></select></label>
  <label>{tr.issue}<textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} placeholder="{tr.placeholder}"/></label>
  <button disabled={busy}>{busy?"{tr.creating}":"{tr.create}"} <span>↗</span></button>
  {status&&<div className="support-status" role="status">{status}{ticket&&<strong className="ticket-reference">REFERENCE: {ticket}</strong>}</div>}<small className="support-privacy">{tr.privacy}</small></form></div>
  </div></section><footer><span>VENTSPILS ARENA　·　© 2026</span><span>COMPETE • CONNECT • CONQUER</span><Link href="/rules">{tr.community} RULES ↗</Link></footer></main>;
}
