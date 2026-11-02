"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Tournament = {
  id: string; title: string; game: string; description: string;
  event_date: string | null; location: string; status: string; format: string;
};
const blank = { title: "", game: "CS2", description: "", event_date: "", location: "Ventspils, Latvia", status: "DRAFT", format: "5v5" };

export default function AdminTournamentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Tournament[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);

  async function load() {
    if (!supabase) { setMessage("Supabase is not configured."); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    if (profile?.role !== "SUPER_ADMIN") { setLoading(false); setAllowed(false); return; }
    setAllowed(true);
    const { data, error } = await supabase.from("tournaments").select("*").order("event_date", { ascending: true });
    if (error) setMessage("Database setup required: run the migration SQL from the project repository in Supabase SQL Editor.");
    else setItems(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function edit(item: Tournament) {
    setEditing(item.id);
    setForm({ title: item.title, game: item.game, description: item.description, event_date: item.event_date ? item.event_date.slice(0,16) : "", location: item.location, status: item.status, format: item.format });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setEditing(null); setForm(blank); }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true); setMessage("");
    const payload = { ...form, event_date: form.event_date ? new Date(form.event_date).toISOString() : null, updated_at: new Date().toISOString() };
    const result = editing
      ? await supabase.from("tournaments").update(payload).eq("id", editing)
      : await supabase.from("tournaments").insert(payload);
    if (result.error) setMessage(result.error.message);
    else { setMessage(editing ? "Tournament updated." : "Tournament created."); reset(); await load(); }
    setSaving(false);
  }
  async function remove(id: string) {
    if (!supabase || !window.confirm("Delete this tournament permanently?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    setMessage(error ? error.message : "Tournament deleted.");
    if (!error) await load();
  }

  if (loading) return <main className="admin-page"><div className="admin-loading">LOADING TOURNAMENT CONTROL...</div></main>;
  if (!allowed) return <main className="admin-page"><div className="admin-denied"><h1>ACCESS RESTRICTED.</h1><Link href="/account">BACK TO ACCOUNT ↗</Link></div></main>;

  return <main className="admin-page"><div className="admin-shell">
    <div className="admin-crumb"><Link href="/">HOME</Link><b>/</b><Link href="/admin">ADMIN</Link><b>/</b> TOURNAMENTS</div>
    <div className="admin-heading"><div><span className="admin-eyebrow">VENTSPILS ARENA / MANAGEMENT</span><h1>TOURNAMENT<br/><em>CONTROL.</em></h1><p>Create, edit and manage competition events.</p></div><div className="admin-emblem"><span>VA</span><small>EVENTS</small></div></div>
    <section className="admin-editor">
      <div className="admin-section-title"><div><span>{editing ? "EDIT EVENT" : "NEW EVENT"}</span><h2>{editing ? "UPDATE TOURNAMENT" : "CREATE TOURNAMENT"}</h2></div><small>DATABASE / SUPABASE</small></div>
      <form className="admin-form" onSubmit={submit}>
        <label>TOURNAMENT NAME<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. VENTSPILS ARENA WINTER CUP"/></label>
        <div className="admin-form-grid">
          <label>GAME<input required value={form.game} onChange={e=>setForm({...form,game:e.target.value})}/></label>
          <label>TEAM FORMAT<select required value={form.format} onChange={e=>setForm({...form,format:e.target.value})}><option value="2v2">2 vs 2 — 2 players</option><option value="3v3">3 vs 3 — 3 players</option><option value="5v5">5 vs 5 — 5 players</option></select></label>
          <label>DATE & TIME<input type="datetime-local" value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/></label>
          <label>STATUS<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="DRAFT">DRAFT</option><option value="REGISTRATION">REGISTRATION</option><option value="LIVE">LIVE</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></label>
        </div>
        <label>LOCATION<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
        <label>DESCRIPTION<textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <div className="admin-form-actions"><button disabled={saving}>{saving ? "SAVING..." : editing ? "SAVE CHANGES ↗" : "CREATE TOURNAMENT ↗"}</button>{editing && <button type="button" className="admin-secondary" onClick={reset}>CANCEL</button>}</div>
      </form>
      {message && <p className="admin-feedback">{message}</p>}
    </section>
    <div className="admin-section-title"><div><span>EVENT DATABASE</span><h2>ALL TOURNAMENTS</h2></div><small>{items.length} RECORDS</small></div>
    <div className="admin-list">{items.map(item=><article className="admin-list-row" key={item.id}><div><small>{item.game} / {item.status}</small><h3>{item.title}</h3><p>{item.event_date ? new Date(item.event_date).toLocaleString() : "Date not set"} · {item.location} · {item.format}</p></div><div className="admin-row-actions"><Link href={"/admin/tournaments/"+item.id+"/bracket"}>BRACKET</Link><button onClick={()=>edit(item)}>EDIT</button><button className="admin-delete" onClick={()=>remove(item.id)}>DELETE</button></div></article>)}{!items.length && <div className="admin-empty">No tournaments yet. Create the first event above.</div>}</div>
    <div className="admin-footer-actions"><Link href="/admin">← ADMIN CONTROL</Link><Link href="/tournaments">VIEW PUBLIC TOURNAMENTS ↗</Link></div>
  </div></main>;
}
