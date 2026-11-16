"use client";

import Link from "next/link";
import { useLanguage } from "../components/LanguageProvider";

export default function AboutPage() {
  const { language } = useLanguage();
  const copy = language === "ru" ? {
    back: "НА ГЛАВНУЮ", eyebrow: "НЕЗАВИСИМЫЙ ТУРНИРНЫЙ ПРОЕКТ · ВЕНТСПИЛС, ЛАТВИЯ",
    title: "О НАС", intro: "VENTSPILS ARENA — независимый киберспортивный проект из Вентспилса, Латвия, созданный в 2026 году.",
    missionTitle: "НАША ЦЕЛЬ", mission: "Мы создаём площадку, где игроки могут соревноваться, находить единомышленников и становиться частью игрового сообщества.",
    workTitle: "ЧЕМ МЫ ЗАНИМАЕМСЯ", work: "Организуем онлайн-турниры, открываем регистрацию на соревнования, помогаем игрокам объединяться в команды и предоставляем единое пространство с календарём событий, рейтингами, новостями и поддержкой участников.",
    approachTitle: "НАШ ПОДХОД", approach: "Честная конкуренция, понятные правила, доступность и уважение к каждому участнику. Мы развиваем проект шаг за шагом вместе с нашим сообществом.",
    base: "ОСНОВАНЫ", baseValue: "2026 · ВЕНТСПИЛС, ЛАТВИЯ", focus: "НАПРАВЛЕНИЕ", focusValue: "ТУРНИРЫ И ИГРОВОЕ СООБЩЕСТВО", platform: "ПЛАТФОРМА", platformValue: "ОНЛАЙН-СОРЕВНОВАНИЯ",
    cta: "СМОТРЕТЬ ТУРНИРЫ ↗"
  } : language === "lv" ? {
    back: "UZ SĀKUMU", eyebrow: "NEATKARĪGS TURNĪRU PROJEKTS · VENTSPILS, LATVIJA",
    title: "PAR MUMS", intro: "VENTSPILS ARENA ir neatkarīgs esporta projekts no Ventspils, Latvijā, kas dibināts 2026. gadā.",
    missionTitle: "MŪSU MĒRĶIS", mission: "Mēs veidojam platformu, kurā spēlētāji var sacensties, atrast domubiedrus un kļūt par daļu no spēļu kopienas.",
    workTitle: "KO MĒS DARĀM", work: "Organizējam tiešsaistes turnīrus, atveram reģistrāciju sacensībām, palīdzam spēlētājiem veidot komandas un nodrošinām vienotu vidi ar pasākumu kalendāru, rangiem, jaunumiem un dalībnieku atbalstu.",
    approachTitle: "MŪSU PIEEJA", approach: "Godīga konkurence, skaidri noteikumi, pieejamība un cieņa pret katru dalībnieku. Attīstām projektu soli pa solim kopā ar mūsu kopienu.",
    base: "DIBINĀTS", baseValue: "2026 · VENTSPILS, LATVIJA", focus: "DARBĪBAS JOMA", focusValue: "TURNĪRI UN SPĒĻU KOPIENA", platform: "PLATFORMA", platformValue: "TIEŠSAISTES SACENSĪBAS",
    cta: "APSKATĪT TURNĪRUS ↗"
  } : {
    back: "BACK TO HOME", eyebrow: "INDEPENDENT TOURNAMENT PROJECT · VENTSPILS, LATVIA",
    title: "ABOUT US", intro: "VENTSPILS ARENA is an independent esports project based in Ventspils, Latvia, founded in 2026.",
    missionTitle: "OUR PURPOSE", mission: "We are building a platform where players can compete, meet like-minded people and become part of a gaming community.",
    workTitle: "WHAT WE DO", work: "We organize online tournaments, open competition registrations, help players build teams and provide one place for event calendars, rankings, news and participant support.",
    approachTitle: "OUR APPROACH", approach: "Fair competition, clear rules, accessibility and respect for every participant. We are growing the project step by step together with our community.",
    base: "ESTABLISHED", baseValue: "2026 · VENTSPILS, LATVIA", focus: "FOCUS", focusValue: "TOURNAMENTS & GAMING COMMUNITY", platform: "FORMAT", platformValue: "ONLINE COMPETITIONS",
    cta: "EXPLORE TOURNAMENTS ↗"
  };
  return <main className="about-page">
    <div className="about-shell">
      <Link className="about-back" href="/">{copy.back}</Link>
      <div className="about-hero">
        <img className="about-logo" src="/vents-arena-logo.svg" alt="VENTSPILS ARENA" />
        <span className="about-eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}<i>.</i></h1>
        <p className="about-intro">{copy.intro}</p>
      </div>
      <div className="about-facts">
        <div><span>{copy.base}</span><strong>{copy.baseValue}</strong></div>
        <div><span>{copy.focus}</span><strong>{copy.focusValue}</strong></div>
        <div><span>{copy.platform}</span><strong>{copy.platformValue}</strong></div>
      </div>
      <div className="about-content">
        <section><span>01 / VISION</span><div><h2>{copy.missionTitle}</h2><p>{copy.mission}</p></div></section>
        <section><span>02 / ACTIVITY</span><div><h2>{copy.workTitle}</h2><p>{copy.work}</p></div></section>
        <section><span>03 / PRINCIPLES</span><div><h2>{copy.approachTitle}</h2><p>{copy.approach}</p></div></section>
      </div>
      <Link className="about-cta" href="/tournaments">{copy.cta}</Link>
      <div className="about-bottom"><span>VENTSPILS ARENA</span><span>VENTSPILS, LATVIA · EST. 2026</span></div>
    </div>
  </main>;
}
