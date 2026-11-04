"use client";
import Link from "next/link";
import { useState } from "react";
import AuthNav from "../components/AuthNav";
import { useLanguage } from "../components/LanguageProvider";

export default function SupportPage() {
  const { language } = useLanguage();
  const tr = language === "ru" ? {
    crumb:"ЦЕНТР ПОДДЕРЖКИ", kicker:"VENTSPILS ARENA · ПОМОЩЬ ИГРОКАМ", title:"ЧЕМ МЫ МОЖЕМ", sub:"ПОМОЧЬ?",
    desc:"Создай обращение в поддержку. Команда рассмотрит запрос и свяжется с тобой по электронной почте.",
    aside:"МЫ НА", aside2:"ТВОЕЙ", aside3:"СТОРОНЕ.", asideText:"Проблемы с аккаунтом, вопросы по турнирам или технические неполадки — напиши нам, и команда ответит по электронной почте.",
    email:"ЭЛЕКТРОННАЯ ПОЧТА", community:"СООБЩЕСТВО", ticket:"НОВОЕ ОБРАЩЕНИЕ", formtitle:"СОЗДАТЬ", formsub:"ОБРАЩЕНИЕ.",
    required:"Все поля обязательны.", yourEmail:"ТВОЯ ПОЧТА", help:"С ЧЕМ НУЖНА ПОМОЩЬ?", issue:"ОПИШИ ПРОБЛЕМУ",
    placeholder:"Расскажи, что произошло и какая помощь нужна...", create:"СОЗДАТЬ ОБРАЩЕНИЕ", creating:"СОЗДАЁМ ОБРАЩЕНИЕ...",
    privacy:"Данные используются только для ответа на обращение.", account:"Аккаунт и вход", reg:"Регистрация на турнир",
    team:"Управление командой", tech:"Техническая проблема", report:"Жалоба на игрока", other:"Другое",
    connection:"Ошибка соединения. Попробуй ещё раз.", failed:"Не удалось создать обращение. Попробуй позже.",
    success:"Обращение создано. Сохрани его номер.", ref:"НОМЕР ОБРАЩЕНИЯ:"
  } : language === "lv" ? {
    crumb:"ATBALSTA CENTRS", kicker:"VENTSPILS ARENA · SPĒLĒTĀJU ATBALSTS", title:"KĀ MĒS VARAM", sub:"PALĪDZĒT?",
    desc:"Izveido atbalsta pieprasījumu. Mūsu komanda to izskatīs un sazināsies ar tevi e-pastā.",
    aside:"MĒS ESAM", aside2:"TAVĀ", aside3:"PUSĒ.", asideText:"Konta problēmas, jautājumi par turnīriem vai tehniskas kļūmes — raksti mums, un komanda atbildēs e-pastā.",
    email:"ATBALSTA E-PASTS", community:"KOPIENA", ticket:"JAUNS ATBALSTA PIEPRASĪJUMS", formtitle:"IESNIEGT", formsub:"PIEPRASĪJUMU.",
    required:"Visi lauki ir obligāti.", yourEmail:"TAVA E-PASTA ADRESE", help:"KĀDĀ JAUTĀJUMĀ VAJADZĪGA PALĪDZĪBA?", issue:"APRAKSTI PROBLĒMU",
    placeholder:"Apraksti, kas notika un kāda palīdzība nepieciešama...", create:"IZVEIDOT PIEPRASĪJUMU", creating:"IZVEIDO PIEPRASĪJUMU...",
    privacy:"Tavi dati tiks izmantoti tikai atbildes sniegšanai.", account:"Konts un pieslēgšanās", reg:"Reģistrācija turnīram",
    team:"Komandas pārvaldība", tech:"Tehniska problēma", report:"Ziņot par spēlētāju", other:"Cits",
    connection:"Savienojuma kļūda. Mēģini vēlreiz.", failed:"Neizdevās izveidot pieprasījumu. Mēģini vēlāk.",
    success:"Pieprasījums izveidots. Saglabā tā numuru.", ref:"PIEPRASĪJUMA NUMURS:"
  } : {
    crumb:"SUPPORT CENTER", kicker:"VENTSPILS ARENA · PLAYER SUPPORT", title:"HOW CAN WE", sub:"HELP YOU?",
    desc:"Create a support ticket. Our team will review your request and contact you by email.",
    aside:"WE’RE", aside2:"ON YOUR", aside3:"SIDE.", asideText:"Account problems, tournament questions or technical issues — send us a message and our team will reply by email.",
    email:"SUPPORT EMAIL", community:"COMMUNITY", ticket:"NEW SUPPORT TICKET", formtitle:"SUBMIT A", formsub:"TICKET.",
    required:"All fields are required.", yourEmail:"YOUR EMAIL", help:"WHAT DO YOU NEED HELP WITH?", issue:"DESCRIBE THE ISSUE",
    placeholder:"Tell us what happened and how we can help...", create:"CREATE SUPPORT TICKET", creating:"CREATING TICKET...",
    privacy:"Your details will only be used to respond to this request.", account:"Account & login", reg:"Tournament registration",
    team:"Team management", tech:"Technical issue", report:"Report a player", other:"Other",
    connection:"Connection error. Please try again.", failed:"We could not create your ticket. Please try again later.",
    success:"Your ticket has been created. Save its reference number.", ref:"REFERENCE:"
  };
  const [email,setEmail]=useState(""); const [subject,setSubject]=useState(tr.account);
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState(""); const [ticket,setTicket]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setStatus("");setTicket("");
    try{
      const response=await fetch("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,subject,message})});
      const result=await response.json();
      if(!response.ok||!result.ok)setStatus(result.error||tr.failed);
      else{setTicket(String(result.ticket_number));setStatus(tr.success);setEmail("");setMessage("");}
    }catch{setStatus(tr.connection);}finally{setBusy(false);}
  }
  return <main><header><b>V <span>VENTSPILS ARENA</span></b><nav><Link href="/tournaments">TOURNAMENTS</Link><Link href="/teams">TEAMS</Link><Link href="/rankings">RANKINGS</Link><Link href="/news">NEWS</Link><Link href="/rules">RULES</Link></nav><AuthNav/></header>
    <section className="support-page"><div className="support-shell"><div className="support-crumb"><Link href="/">HOME</Link><b>/</b> {tr.crumb}</div>
      <div className="support-heading"><div><span className="support-kicker">{tr.kicker}</span><h1>{tr.title}<br/><em>{tr.sub}</em></h1><p>{tr.desc}</p></div><div className="support-stamp"><strong>VA</strong><small>PLAYER<br/>SUPPORT</small></div></div>
      <div className="support-layout"><aside className="support-aside"><span className="support-kicker">SUPPORT DESK / 01</span><h2>{tr.aside}<br/>{tr.aside2}<br/><em>{tr.aside3}</em></h2><p>{tr.asideText}</p><div className="support-contact"><small>{tr.email}</small><a href="mailto:vcupsupport@gmail.com">VCUPSUPPORT@GMAIL.COM ↗</a></div><div className="support-contact"><small>{tr.community}</small><a href="https://discord.gg/B8AebRKUJJ" target="_blank" rel="noreferrer">JOIN OUR DISCORD ↗</a></div></aside>
      <form className="support-form" onSubmit={submit}><div className="support-form-top"><span>{tr.ticket}</span><small>FORM / 001</small></div><h2>{tr.formtitle} <em>{tr.formsub}</em></h2><p>{tr.required}</p>
        <label>{tr.yourEmail}<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label>{tr.help}<select value={subject} onChange={e=>setSubject(e.target.value)}><option>{tr.account}</option><option>{tr.reg}</option><option>{tr.team}</option><option>{tr.tech}</option><option>{tr.report}</option><option>{tr.other}</option></select></label>
        <label>{tr.issue}<textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} placeholder={tr.placeholder}/></label>
        <button disabled={busy}>{busy?tr.creating:tr.create} <span>↗</span></button>
        {status&&<div className="support-status" role="status">{status}{ticket&&<strong className="ticket-reference">{tr.ref} {ticket}</strong>}</div>}
        <small className="support-privacy">{tr.privacy}</small></form></div></div></section>
    <footer><span>VENTSPILS ARENA　·　© 2026</span><span>COMPETE • CONNECT • CONQUER</span><Link href="/rules">{tr.community} RULES ↗</Link></footer></main>;
}