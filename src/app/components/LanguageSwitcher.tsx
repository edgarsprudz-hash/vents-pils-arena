"use client";
import { useLanguage, type Language } from "./LanguageProvider";
export default function LanguageSwitcher(){const {language,setLanguage}=useLanguage();return <div className="language-switcher" aria-label="Choose language">{(["ru","lv","en"] as Language[]).map(code=><button key={code} type="button" onClick={()=>setLanguage(code)} aria-pressed={language===code} className={language===code?"active":""}>{code.toUpperCase()}</button>)}</div>}
