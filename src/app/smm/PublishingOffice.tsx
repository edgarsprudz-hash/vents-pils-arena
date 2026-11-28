"use client";

export default function PublishingOffice(){
 return <section className="smm-publish-office">
  <div className="smm-section-head smm-publish-heading"><div><span className="smm-eyebrow">MODULE / 02</span><h2>PUBLISHING HQ</h2><p>THE SOCIAL MEDIA OPERATIONS FLOOR</p></div><span className="smm-office-live"><i/> OFFICE SIMULATION</span></div>
  <div className="smm-building" aria-label="Animated three-floor VENTSPILS ARENA AI office">
   <div className="smm-building-roof"><span>VENTSPILS ARENA</span><b>AI OPERATIONS CENTRE</b><span>EST. 2025</span></div>
   <div className="smm-floor smm-floor-glass"><div className="smm-glass-reflection"/><span className="smm-floor-number">03</span><span className="smm-floor-caption">STRATEGY LEVEL</span></div>
   <div className="smm-floor smm-floor-main">
    <div className="smm-floor-header"><span>02 / PUBLISHING DEPARTMENT</span><span>5 AI EMPLOYEES</span></div>
    <div className="smm-office-interior">
     <div className="smm-office-window"><span>VENTSPILS</span><b>ARENA</b><i/></div>
     <div className="smm-office-room"><div className="smm-wall-shelf"><i/><i/><i/></div><div className="smm-desk"><div className="smm-monitor"><i/></div><div className="smm-keyboard"/></div><div className="smm-agent smm-agent-main"><div className="smm-agent-head"/><div className="smm-agent-body"><i/></div><div className="smm-agent-legs"><i/><i/></div></div><span className="smm-agent-tag">PUBLISHING</span></div>
     <div className="smm-office-room smm-room-centre"><div className="smm-plant"><i/><i/><i/></div><div className="smm-agent smm-agent-walker"><div className="smm-agent-head"/><div className="smm-agent-body"><i/></div><div className="smm-agent-legs"><i/><i/></div></div><div className="smm-agent smm-agent-coffee"><div className="smm-agent-head"/><div className="smm-agent-body"><i/></div><div className="smm-agent-legs"><i/><i/></div><span className="smm-cup"/></div><span className="smm-agent-tag">CONTENT TEAM</span></div>
     <div className="smm-office-room smm-room-right"><div className="smm-desk"><div className="smm-monitor"><i/></div><div className="smm-keyboard"/></div><div className="smm-agent smm-agent-analyst"><div className="smm-agent-head"/><div className="smm-agent-body"><i/></div><div className="smm-agent-legs"><i/><i/></div></div><div className="smm-sofa"><i/></div><div className="smm-agent smm-agent-break"><div className="smm-agent-head"/><div className="smm-agent-body"><i/></div><div className="smm-agent-legs"><i/><i/></div></div><span className="smm-agent-tag">SCHEDULING</span></div>
    </div>
    <div className="smm-floor-footer"><span>CONTENT</span><span>MEDIA</span><span>SCHEDULING</span><span>QUALITY CONTROL</span></div>
   </div>
   <div className="smm-floor smm-floor-glass smm-floor-bottom"><div className="smm-glass-reflection"/><span className="smm-floor-number">01</span><span className="smm-floor-caption">COMMUNITY & SUPPORT</span></div>
   <div className="smm-building-base"><span>VENTSPILS ARENA / DIGITAL CAMPUS</span><span>LATVIA · 2026</span></div>
  </div>
  <div className="smm-agent-console"><div className="smm-agent-console-head"><div><span className="smm-eyebrow">AI WORKFORCE</span><h3>OFFICE ACTIVITY</h3></div><span className="smm-office-live"><i/> ANIMATED PREVIEW</span></div>
   <div className="smm-agent-list">
    {(["Publishing Agent|P|MAIN DESK · RED TIE|AT WORK","Content Agent|C|CONTENT TEAM|WALKING","Media Agent|M|MEDIA DESK|WORKING","Scheduler Agent|S|SCHEDULING|PLANNING","Analytics Agent|A|QUALITY CONTROL|ON BREAK"]).map(x=>{const [name,letter,area,status]=x.split("|");return <article key={name}><span className="smm-agent-avatar">{letter}</span><div><b>{name}</b><small>{area}</small></div><em>{status}</em></article>})}
   </div>
   <p className="smm-office-note">Animated office concept. Character movements are currently visual simulation; real publishing tasks and live agent status will be connected in a later integration stage.</p>
  </div>
 </section>;
}
