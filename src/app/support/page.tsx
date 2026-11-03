"use client";
import Link from "next/link";
import { useState } from "react";
import AuthNav from "../components/AuthNav";

export default function SupportPage() {
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
  <div className="support-heading"><div><span className="support-kicker">VENTSPILS ARENA · PLAYER SERVICES</span><h1>HOW CAN WE<br/><em>HELP YOU?</em></h1><p>Create a support ticket. Our team will review your request and contact you by email.</p></div><div className="support-stamp"><strong>VA</strong><small>PLAYER<br/>SUPPORT</small></div></div>
  <div className="support-layout"><aside className="support-aside"><span className="support-kicker">SUPPORT DESK / 01</span><h2>WE’RE<br/>ON YOUR<br/><em>SIDE.</em></h2><p>Account issues, tournament questions or technical problems — send us a message and our team will get back to you by email.</p><div className="support-contact"><small>SUPPORT EMAIL</small><a href="mailto:vcupsupport@gmail.com">VCUPSUPPORT@GMAIL.COM ↗</a></div><div className="support-contact"><small>COMMUNITY</small><a href="https://discord.gg/B8AebRKUJJ" target="_blank" rel="noreferrer">JOIN OUR DISCORD ↗</a></div></aside>
  <form className="support-form" onSubmit={submit}><div className="support-form-top"><span>NEW SUPPORT TICKET</span><small>FORM / 001</small></div><h2>SUBMIT A <em>TICKET.</em></h2><p>All fields are required.</p>
  <label>YOUR EMAIL<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
  <label>WHAT DO YOU NEED HELP WITH?<select value={subject} onChange={e=>setSubject(e.target.value)}><option>Account & login</option><option>Tournament registration</option><option>Team management</option><option>Technical issue</option><option>Report a player</option><option>Other</option></select></label>
  <label>DESCRIBE YOUR ISSUE<textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what happened and what you need help with..."/></label>
  <button disabled={busy}>{busy?"CREATING TICKET...":"CREATE SUPPORT TICKET"} <span>↗</span></button>
  {status&&<div className="support-status" role="status">{status}{ticket&&<strong className="ticket-reference">REFERENCE: {ticket}</strong>}</div>}<small className="support-privacy">Your details will only be used to respond to this support request.</small></form></div>
  </div></section><footer><span>VENTSPILS ARENA　·　© 2026</span><span>COMPETE • CONNECT • CONQUER</span><Link href="/rules">COMMUNITY RULES ↗</Link></footer></main>;
}
