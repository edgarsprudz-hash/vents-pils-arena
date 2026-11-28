"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../components/LanguageProvider";
import styles from "./instagram.module.css";

type Media = { id: string; caption?: string; media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"; media_url?: string; permalink?: string; thumbnail_url?: string; timestamp?: string };
type ApiData = { connected: boolean; profile?: { id: string; username: string }; media?: Media[]; error?: string };

export default function InstagramAdminPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const ru = language === "ru";
  const lv = language === "lv";
  const t = (en: string, r: string, l: string) => ru ? r : lv ? l : en;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { setDenied(true); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (profile?.role !== "SUPER_ADMIN") { setDenied(true); setLoading(false); return; }
      await loadData(false);
    })();
    return () => { active = false; };
  }, [router]);

  async function loadData(manual: boolean) {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/instagram", { cache: "no-store" });
      const result = await response.json();
      setData(result);
    } catch {
      setData({ connected: false, error: "Could not load Instagram data. Check your connection and try again." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const media = data?.media || [];
  const visible = useMemo(() => filter === "ALL" ? media : media.filter(item => item.media_type === filter), [filter, media]);
  const videos = media.filter(item => item.media_type === "VIDEO").length;
  const images = media.filter(item => item.media_type !== "VIDEO").length;

  if (loading) return <main className={styles.page}><div className={styles.loading}>VENTSPILS ARENA / {t("LOADING CONTROL PANEL", "ЗАГРУЗКА ПАНЕЛИ", "IELĀDĒ PANELI")}</div></main>;
  if (denied) return <main className={styles.page}><div className={styles.denied}>{t("ACCESS RESTRICTED", "ДОСТУП ЗАКРЫТ", "PIEKĻUVE LIEGTA")}<Link href="/account">{t("BACK TO ACCOUNT", "ВЕРНУТЬСЯ В АККАУНТ", "ATGRIEZTIES KONTĀ")}</Link></div></main>;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.breadcrumb}><Link href="/admin">{t("ADMIN CONTROL", "ПАНЕЛЬ АДМИНИСТРАТОРА", "ADMIN PANELIS")}</Link><span>/</span> INSTAGRAM</div>
        <header className={styles.heading}>
          <div><div className={styles.kicker}>VENTSPILS ARENA / SOCIAL MEDIA CONTROL</div><h1>INSTAGRAM <em>STUDIO.</em></h1><p>{t("Your Instagram content, collected in one control room.", "Контент Instagram в едином центре управления.", "Instagram saturs vienā pārvaldības panelī.")}</p></div>
          <div className={styles.mark}>IG<span>01 / SOCIAL</span></div>
        </header>

        <section className={styles.account}>
          <div className={styles.accountLeft}><div className={styles.avatar}>IG</div><div><span className={styles.label}>{t("CONNECTED ACCOUNT", "ПОДКЛЮЧЁННЫЙ АККАУНТ", "PIEVIENOTAIS KONTS")}</span><h2>@{data?.profile?.username || "ventspilsarena"}</h2><p>{t("Instagram Graph API · Unified Login", "Instagram Graph API · Unified Login", "Instagram Graph API · Unified Login")}</p></div></div>
          <div className={styles.connection}><i />{data?.connected ? t("CONNECTED", "ПОДКЛЮЧЕНО", "SAVIENOJUMS AKTĪVS") : t("CONNECTION ERROR", "ОШИБКА ПОДКЛЮЧЕНИЯ", "SAVIENOJUMA KĻŪDA")}</div>
        </section>

        {data?.connected ? <>
          <section className={styles.stats}>
            <div><span>{t("LOADED POSTS", "ЗАГРУЖЕНО ПУБЛИКАЦИЙ", "IELĀDĒTĀS PUBLIKĀCIJAS")}</span><strong>{media.length.toString().padStart(2, "0")}</strong><small>{t("Latest items from your profile", "Последние публикации профиля", "Jaunākās profila publikācijas")}</small></div>
            <div><span>{t("IMAGES", "ИЗОБРАЖЕНИЯ", "ATTĒLI")}</span><strong>{images.toString().padStart(2, "0")}</strong><small>{t("Photos and carousels", "Фото и карусели", "Fotoattēli un karuseļi")}</small></div>
            <div><span>{t("REELS / VIDEO", "REELS / ВИДЕО", "REELS / VIDEO")}</span><strong>{videos.toString().padStart(2, "0")}</strong><small>{t("Video publications", "Видеопубликации", "Video publikācijas")}</small></div>
            <div><span>{t("ACCOUNT ID", "ID АККАУНТА", "KONTA ID")}</span><strong className={styles.idValue}>{data.profile?.id || "—"}</strong><small>Meta Business asset</small></div>
          </section>

          <div className={styles.sectionHead}><div><span className={styles.kicker}>{t("CONTENT LIBRARY", "БИБЛИОТЕКА КОНТЕНТА", "SATURA BIBLIOTĒKA")}</span><h2>{t("LATEST PUBLICATIONS", "ПОСЛЕДНИЕ ПУБЛИКАЦИИ", "JAUNĀKĀS PUBLIKĀCIJAS")}</h2></div><button onClick={() => loadData(true)} disabled={refreshing}>{refreshing ? "…" : "↻"} {t("REFRESH", "ОБНОВИТЬ", "ATJAUNOT")}</button></div>

          <div className={styles.toolbar}><div className={styles.filters}><button className={filter === "ALL" ? styles.active : ""} onClick={() => setFilter("ALL")}>{t("ALL", "ВСЕ", "VISI")} <b>{media.length}</b></button><button className={filter === "IMAGE" ? styles.active : ""} onClick={() => setFilter("IMAGE")}>{t("IMAGES", "ФОТО", "ATTĒLI")} <b>{images}</b></button><button className={filter === "VIDEO" ? styles.active : ""} onClick={() => setFilter("VIDEO")}>REELS <b>{videos}</b></button></div><span>{t("SHOWING", "ПОКАЗАНО", "REDZAMI")} {visible.length} / {media.length}</span></div>

          <div className={styles.grid}>{visible.map((item, index) => <article className={styles.post} key={item.id}>
            <a className={styles.thumb} href={item.permalink || "#"} target="_blank" rel="noreferrer">
              {(item.thumbnail_url || item.media_url) ? <img src={item.thumbnail_url || item.media_url} alt={item.caption?.slice(0, 80) || "Instagram publication"} loading="lazy" /> : <div className={styles.noImage}>VENTSPILS ARENA</div>}
              <span className={styles.type}>{item.media_type === "VIDEO" ? "REEL / VIDEO" : item.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL" : "IMAGE"}</span><span className={styles.open}>↗</span>
            </a>
            <div className={styles.postBody}><div className={styles.postMeta}><span>POST / {(index + 1).toString().padStart(2, "0")}</span><time>{item.timestamp ? new Date(item.timestamp).toLocaleDateString(language === "ru" ? "ru-RU" : language === "lv" ? "lv-LV" : "en-GB") : "—"}</time></div><p>{item.caption || t("No caption", "Без описания", "Bez apraksta")}</p><a className={styles.view} href={item.permalink || "#"} target="_blank" rel="noreferrer">{t("OPEN ON INSTAGRAM", "ОТКРЫТЬ В INSTAGRAM", "ATVĒRT INSTAGRAM")} ↗</a></div>
          </article>)}</div>
          <div className={styles.note}><span>01</span><p>{t("This is the visual content library. Publishing, scheduling, comment moderation and analytics will be added as the next modules.", "Это визуальная библиотека контента. Публикация, планирование, модерация комментариев и аналитика будут добавлены следующими модулями.", "Šī ir vizuālā satura bibliotēka. Publikāciju veidošana, plānošana, komentāru moderēšana un analītika tiks pievienota nākamajos moduļos.")}</p></div>
        </> : <section className={styles.error}><span>CONNECTION / ERROR</span><h2>{t("Instagram is not responding", "Instagram не отвечает", "Instagram neatbild")}</h2><p>{data?.error || "Unknown API error"}</p><button onClick={() => loadData(true)}>{t("TRY AGAIN", "ПОВТОРИТЬ", "MĒĢINĀT VĒLREIZ")}</button></section>}
        <footer className={styles.footer}><Link href="/admin">← {t("BACK TO CONTROL CENTER", "НАЗАД В ЦЕНТР УПРАВЛЕНИЯ", "ATPAKAĻ UZ VADĪBAS CENTRU")}</Link><span>VENTSPILS ARENA / DIGITAL OPERATIONS</span></footer>
      </div>
    </main>
  );
}
