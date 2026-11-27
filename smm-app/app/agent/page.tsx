"use client";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Message = { role: "user" | "assistant"; content: string };
const starters = [
  "Подготовь пост о ближайшем турнире на латышском",
  "Составь контент-план на неделю",
  "Улучши этот текст в стиле VENTSPILS ARENA",
  "Предложи идеи для продвижения EA FC 27"
];

export default function AgentPage() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Я — AI-помощник VENTSPILS ARENA. Помогаю с контентом, коммуникацией и планированием. Пиши задачу на русском, латышском или английском. Перед публикацией проверяй факты и утверждай материалы вручную." }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => setRole(data?.role || null));
  }, [session]);

  async function send(text = input) {
    const prompt = text.trim();
    if (!prompt || busy || !session?.access_token) return;
    const next = [...messages, { role: "user" as const, content: prompt }];
    setMessages(next); setInput(""); setBusy(true); setError("");
    try {
      // Share the saved Instagram Insights with the agent automatically.
      const requestMessages = next.slice(-12);
      try {
        const saved = localStorage.getItem("va-instagram-insights");
        if (saved) {
          const stats = JSON.parse(saved);
          const fields = ["followers", "reach", "views", "likes", "comments", "saves", "shares"];
          const hasMetrics = fields.some((key) => stats[key] !== undefined && String(stats[key]).trim() !== "");
          if (hasMetrics) {
            const labels: Record<string, string> = {
              followers: "Подписчики", reach: "Охват аккаунтов", views: "Просмотры",
              likes: "Лайки", comments: "Комментарии", saves: "Сохранения", shares: "Репосты/отправки"
            };
            const report = fields
              .filter((key) => stats[key] !== undefined && String(stats[key]).trim() !== "")
              .map((key) => labels[key] + ": " + stats[key])
              .join("; ");
            const period = stats.period || "не указан";
            requestMessages[requestMessages.length - 1] = {
              ...requestMessages[requestMessages.length - 1],
              content: requestMessages[requestMessages.length - 1].content +
                "\\n\\nСОХРАНЁННАЯ СТАТИСТИКА INSTAGRAM @ventspilsarena (из раздела Analytics, период: " +
                period + " дней): " + report +
                ". Используй эти данные для анализа, если запрос касается Instagram или статистики. Не проси пользователя прислать их повторно. Отсутствующие показатели не выдумывай."
            };
          }
        }
      } catch {
        // Ignore invalid local browser data and continue with the user's message.
      }
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ messages: requestMessages })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось получить ответ агента");
      setMessages([...next, { role: "assistant", content: result.text }]);
    } catch (e: any) {
      setError(e.message || "Ошибка агента");
    } finally { setBusy(false); }
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const { error } = await supabase!.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) });
    if (error) setError(error.message);
  }

  if (!session) return <main className="login"><div className="loginCard"><div className="mark">VA<span>.</span></div><p className="eyebrow">PRIVATE AI WORKSPACE</p><h1>VENTSPILS<br/>ARENA <em>AGENT</em></h1><form onSubmit={login}><label>Email</label><input name="email" type="email" required/><label>Password</label><input name="password" type="password" required/><button>Sign in</button></form>{error && <p className="error">{error}</p>}</div></main>;
  if (role !== "SUPER_ADMIN") return <main className="login"><div className="loginCard"><h1>ACCESS DENIED</h1><p className="muted">Только SUPER_ADMIN может использовать агента.</p><button onClick={() => supabase?.auth.signOut()}>Sign out</button></div></main>;

  return <main className="agentShell">
    <header className="agentHeader"><a href="/" className="agentBack">← SMM WORKSPACE</a><div><span className="eyebrow">VENTSPILS ARENA / INTELLIGENCE</span><h1>AI <em>AGENT</em></h1></div><span className="agentStatus">PRIVATE · SUPER ADMIN</span></header>
    <section className="agentLayout">
      <aside className="agentAside"><span className="eyebrow">YOUR ASSISTANT</span><h2>One workspace.<br/><em>Clear direction.</em></h2><p>Контент, стратегия и коммуникация VENTSPILS ARENA в одном диалоге.</p><div className="agentRules"><b>РАБОЧИЕ ПРИНЦИПЫ</b><ul><li>Латышский — основной язык публикаций</li><li>Минимализм, чёрный и красный</li><li>Не выдумывать даты, цены и партнёров</li><li>Никаких публикаций без твоего подтверждения</li></ul></div><button className="secondary" onClick={() => supabase?.auth.signOut()}>Sign out</button></aside>
      <section className="chatPanel"><div className="chatTop"><div><b>VA / AGENT</b><small>CONTENT & STRATEGY ASSISTANT</small></div><span className="online"/> </div>
        <div className="chatMessages">{messages.map((m,i)=><div className={"bubble "+m.role} key={i}><small>{m.role==="assistant"?"VENTSPILS ARENA AGENT":"YOU"}</small><p>{m.content}</p></div>)}{busy&&<div className="bubble assistant"><small>AGENT</small><p>Думаю…</p></div>}</div>
        {error&&<p className="error chatError">{error}</p>}
        {messages.length===1&&<div className="starterGrid">{starters.map(s=><button className="starter" key={s} onClick={()=>send(s)}>{s} ↗</button>)}</div>}
        <form className="chatComposer" onSubmit={e=>{e.preventDefault();send();}}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Опиши задачу для агента…" rows={2}/><button disabled={busy||!input.trim()}>Отправить ↗</button></form>
        <p className="chatFoot">AI-ответы могут содержать ошибки. Проверяй факты, даты и условия перед использованием.</p>
      </section>
    </section>
  </main>;
}
