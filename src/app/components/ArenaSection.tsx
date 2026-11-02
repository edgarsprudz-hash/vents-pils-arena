"use client";

import Link from "next/link";

type Card = { tag: string; title: string; description: string; href?: string; action?: string; accent?: string };
type Props = { section: string; title: string; accent: string; description: string; parent?: { label: string; href: string }; cards?: Card[]; emptyTitle?: string; emptyText?: string };

export default function ArenaSection({section,title,accent,description,parent,cards=[],emptyTitle,emptyText}:Props) {
  return <main className="arena-section-page">
    <div className="arena-section-shell">
      <div className="arena-breadcrumb"><Link href="/">ARENA</Link><b>/</b>{parent && <><Link href={parent.href}>{parent.label}</Link><b>/</b></>}{section}</div>
      <div className="arena-section-hero">
        <div className="arena-section-copy"><span className="arena-section-kicker">VENTSPILS ARENA <i/> {section}</span><h1>{title}<em>{accent}</em></h1><p>{description}</p></div>
        <div className="arena-section-stamp"><span>VA</span><small>EST. 2026 · LATVIA</small></div>
      </div>
      <div className="arena-section-rule"><span>EXPLORE THE ARENA</span><i/></div>
      {cards.length ? <div className="arena-content-grid">{cards.map((card,i)=><article className="arena-content-card" key={card.title}>
        <div className="arena-card-top"><span>{card.tag}</span><b>{String(i+1).padStart(2,"0")}</b></div><div className="arena-card-accent">{card.accent || "VA"}</div>
        <h2>{card.title}</h2><p>{card.description}</p>{card.href ? <Link href={card.href}>{card.action || "OPEN SECTION"} <b>↗</b></Link> : <span className="arena-card-soon">DETAILS COMING SOON</span>}
      </article>)}</div> : <div className="arena-empty-state"><div className="arena-empty-symbol">///</div><div><span>ARENA DATABASE</span><h2>{emptyTitle || "THE ARENA IS GETTING READY."}</h2><p>{emptyText || "This section will be updated as verified information becomes available."}</p></div><Link href="/tournaments">VIEW TOURNAMENTS ↗</Link></div>}
      <div className="arena-section-bottom"><Link href="/">← BACK TO ARENA</Link><span>COMPETE <b>•</b> CONNECT <b>•</b> CONQUER</span></div>
    </div>
  </main>;
}
