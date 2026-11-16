"use client";
import { useState } from "react";
import { useLanguage, type Language } from "./LanguageProvider";
export default function LanguageSwitcher(){
  const {language,setLanguage}=useLanguage();
  const [open,setOpen]=useState(false);
  const labels:Record<Language,string>={ru:"Русский",lv:"Latviešu",en:"English"};
  return <div className="language-dock" aria-label="Language selector">
    <button className="language-dock-trigger" type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={`Language: ${labels[language]}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
      <span>{language.toUpperCase()}</span>
    </button>
    {open&&<div className="language-dock-menu">{(["ru","lv","en"] as Language[]).map(code=><button key={code} type="button" onClick={()=>{setLanguage(code);setOpen(false)}} className={language===code?"selected":""} aria-current={language===code?"true":undefined}><b>{code.toUpperCase()}</b><span>{labels[code]}</span></button>)}</div>}
  </div>
}
