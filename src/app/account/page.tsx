"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SteamLink from "./steam-link";
import MyMatches from "./matches";
import { useLanguage } from "../components/LanguageProvider";

type Profile = { nickname: string | null; display_name: string | null; role: string; steam_id?: string | null };
type TotpFactor = { id: string; status?: string; friendly_name?: string };

export default function AccountPage() {
  const { language } = useLanguage();
  const ru = language === "ru";
  const lv = language === "lv";
  const t = {
    loading: ru ? "ЗАГРУЗКА ПРОФИЛЯ..." : lv ? "IELĀDĒ PROFILU..." : "LOADING PROFILE...",
    crumb: ru ? "ЛИЧНЫЙ КАБИНЕТ" : lv ? "PERSONĪGAIS KABINETS" : "PERSONAL CABINET",
    heading: ru ? "ЛИЧНЫЙ" : lv ? "PERSONĪGAIS" : "PERSONAL",
    sub: ru ? "КАБИНЕТ." : lv ? "KABINETS." : "CABINET.",
    overview: ru ? "ОБЗОР АККАУНТА" : lv ? "KONTA PĀRSKATS" : "ACCOUNT OVERVIEW",
    active: ru ? "СЕАНС АКТИВЕН" : lv ? "SESIJA AKTĪVA" : "ACTIVE SESSION",
    welcome: ru ? "С ВОЗВРАЩЕНИЕМ" : lv ? "LAIPNI ATGRIEZIES" : "WELCOME BACK",
    player: ru ? "ИГРОК" : lv ? "SPĒLĒTĀJS" : "PLAYER",
    nickname: ru ? "НИКНЕЙМ ИГРОКА" : lv ? "SPĒLĒTĀJA NIKS" : "PLAYER NICKNAME",
    display: ru ? "ОТОБРАЖАЕМОЕ ИМЯ" : lv ? "ATTĒLOTAIS VĀRDS" : "DISPLAY NAME",
    type: ru ? "ТИП АККАУНТА" : lv ? "KONTA TIPS" : "ACCOUNT TYPE",
    notset: ru ? "НЕ УКАЗАНО" : lv ? "NAV IESTATĪTS" : "NOT SET",
    edit: ru ? "РЕДАКТИРОВАТЬ ПРОФИЛЬ" : lv ? "REDIĢĒT PROFILU" : "EDIT PROFILE",
    close: ru ? "ЗАКРЫТЬ" : lv ? "AIZVĒRT" : "CLOSE",
    save: ru ? "СОХРАНИТЬ ИЗМЕНЕНИЯ" : lv ? "SAGLABĀT IZMAIŅAS" : "SAVE CHANGES",
    saving: ru ? "СОХРАНЕНИЕ..." : lv ? "SAGLABĀ..." : "SAVING...",
    editTitle: ru ? "НАСТРОЙКИ ПРОФИЛЯ" : lv ? "PROFILA IESTATĪJUMI" : "PROFILE SETTINGS",
    editDesc: ru ? "Управляй данными и защитой своего аккаунта." : lv ? "Pārvaldi sava konta datus un drošību." : "Manage your account details and security.",
    basic: ru ? "ОСНОВНАЯ ИНФОРМАЦИЯ" : lv ? "PAMATINFORMĀCIJA" : "PROFILE DETAILS",
    security: ru ? "БЕЗОПАСНОСТЬ" : lv ? "DROŠĪBA" : "SECURITY",
    avatar: ru ? "ФОТО ПРОФИЛЯ" : lv ? "PROFILA ATTĒLS" : "PROFILE PHOTO",
    upload: ru ? "ЗАГРУЗИТЬ ФОТО" : lv ? "AUGŠUPIELĀDĒT" : "UPLOAD PHOTO",
    change: ru ? "ИЗМЕНИТЬ ФОТО" : lv ? "MAINĪT ATTĒLU" : "CHANGE PHOTO",
    remove: ru ? "УДАЛИТЬ" : lv ? "NOŅEMT" : "REMOVE",
    avatarHint: ru ? "JPG, PNG или WEBP · до 5 МБ" : lv ? "JPG, PNG vai WEBP · līdz 5 MB" : "JPG, PNG or WEBP · up to 5 MB",
    twofa: ru ? "ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ" : lv ? "DIVFAKTORU AUTENTIFIKĀCIJA" : "TWO-FACTOR AUTHENTICATION",
    twofaDesc: ru ? "Защити вход в аккаунт кодом из приложения-аутентификатора." : lv ? "Aizsargā kontu ar kodu no autentifikācijas lietotnes." : "Protect sign-in with a code from an authenticator app.",
    enabled: ru ? "2FA ВКЛЮЧЕНА" : lv ? "2FA IESLĒGTA" : "2FA ENABLED",
    disabled: ru ? "2FA НЕ НАСТРОЕНА" : lv ? "2FA NAV IESTATĪTA" : "2FA NOT SET UP",
    setup: ru ? "ПОДКЛЮЧИТЬ GOOGLE AUTHENTICATOR" : lv ? "PIEVIENOT GOOGLE AUTHENTICATOR" : "SET UP GOOGLE AUTHENTICATOR",
    disable: ru ? "ОТКЛЮЧИТЬ 2FA" : lv ? "IZSLĒGT 2FA" : "DISABLE 2FA",
    scan: ru ? "Отсканируй QR-код в Google Authenticator или другом TOTP-приложении." : lv ? "Noskenē QR kodu lietotnē Google Authenticator vai citā TOTP lietotnē." : "Scan this QR code in Google Authenticator or another TOTP app.",
    secret: ru ? "Если настраиваешь 2FA на этом же телефоне, скопируй ключ ниже и выбери в Google Authenticator «Ввести ключ настройки»." : lv ? "Ja iestati 2FA tajā pašā tālrunī, nokopē tālāk redzamo atslēgu un Google Authenticator izvēlies “Ievadīt iestatīšanas atslēgu”." : "If setting up 2FA on this same phone, copy the key below and choose “Enter a setup key” in Google Authenticator.",
    copySecret: ru ? "КОПИРОВАТЬ КЛЮЧ" : lv ? "KOPĒT ATSLĒGU" : "COPY SETUP KEY",
    copiedSecret: ru ? "Ключ скопирован. Открой Google Authenticator → «+» → «Ввести ключ настройки»." : lv ? "Atslēga nokopēta. Atver Google Authenticator → “+” → “Ievadīt iestatīšanas atslēgu”." : "Key copied. Open Google Authenticator → “+” → “Enter a setup key”.",
    code: ru ? "КОД ИЗ ПРИЛОЖЕНИЯ" : lv ? "LIETOTNES KODS" : "AUTHENTICATOR CODE",
    verify: ru ? "ПОДТВЕРДИТЬ И ВКЛЮЧИТЬ" : lv ? "APSTIPRINĀT UN IESLĒGT" : "VERIFY AND ENABLE",
    cancel: ru ? "ОТМЕНА" : lv ? "ATCELT" : "CANCEL",
    space: ru ? "ТВОЁ ПРОСТРАНСТВО" : lv ? "TAVA TELPA" : "YOUR SPACE",
    ready: ru ? "ГОТОВ К ИГРЕ?" : lv ? "GATAVS SACENSTIES?" : "READY TO COMPETE?",
    spaceText: ru ? "Профиль игрока и аккаунт арены — в одном месте." : lv ? "Tavs spēlētāja profils un arēnas konts vienuviet." : "Your player profile and arena account in one place.",
    browse: ru ? "СМОТРЕТЬ ТУРНИРЫ" : lv ? "APSKATĪT TURNĪRUS" : "BROWSE TOURNAMENTS",
    admin: ru ? "ПАНЕЛЬ АДМИНИСТРАТОРА" : lv ? "ADMINISTRĀCIJAS PANELIS" : "ADMIN CONTROL",
    logout: ru ? "ВЫЙТИ" : lv ? "IZIET" : "LOG OUT",
    friendCode: ru ? "ТВОЙ КОД ДРУГА" : lv ? "TAVS DRAUGA KODS" : "YOUR FRIEND CODE",
    copy: ru ? "КОПИРОВАТЬ" : lv ? "KOPĒT" : "COPY CODE",
    friendHint: ru ? "Поделись кодом, чтобы другие игроки могли добавить тебя в друзья." : lv ? "Dalies ar kodu, lai citi spēlētāji varētu pievienot tevi draugiem." : "Share this code so other players can add you as a friend.",
  };

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendCode, setFriendCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [totpFactor, setTotpFactor] = useState<TotpFactor | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ id: string; qr: string; secret: string; challengeId: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpMessage, setTotpMessage] = useState("");

  async function refreshFactors() {
    if (!supabase) return;
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setMessage(error.message); return; }
    const verified = (data?.totp || []).find((factor) => factor.status === "verified");
    setTotpFactor(verified ? { id: verified.id, status: verified.status, friendly_name: verified.friendly_name } : null);
  }

  useEffect(() => {
    async function load() {
      if (!supabase) { setMessage("Authentication is not configured."); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setEmail(session.user.email ?? "");
      setAvatarUrl((session.user.user_metadata?.avatar_url as string | undefined) ?? null);
      const params = new URLSearchParams(window.location.search);
      const steamError = params.get("steam_error");
      if (steamError) setMessage("STEAM: " + steamError);
      else if (params.get("steam") === "linked") setMessage("Steam account connected successfully.");
      const { data } = await supabase.from("profiles").select("nickname, display_name, role, steam_id").eq("id", session.user.id).maybeSingle();
      setProfile(data);
      setNickname(data?.nickname || "");
      setDisplayName(data?.display_name || "");
      const { data: ownCode } = await supabase.rpc("get_my_arena_friend_code");
      setFriendCode((ownCode || "") as string);
      await refreshFactors();
      setLoading(false);
    }
    void load();
  }, [router]);

  async function saveProfile() {
    if (!supabase) return;
    const cleanNick = nickname.trim();
    const cleanDisplay = displayName.trim();
    if (!cleanNick) { setMessage(ru ? "Укажи никнейм." : lv ? "Ievadi spēlētāja niku." : "Enter a nickname."); return; }
    if (cleanNick.length > 24 || cleanDisplay.length > 40) { setMessage(ru ? "Никнейм — до 24 символов, имя — до 40." : lv ? "Niks — līdz 24 rakstzīmēm, vārds — līdz 40." : "Nickname must be 24 characters or less; display name 40 or less."); return; }
    setProfileBusy(true); setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMessage("Please sign in again."); setProfileBusy(false); return; }
    const { data, error } = await supabase.from("profiles").update({ nickname: cleanNick, display_name: cleanDisplay || null }).eq("id", session.user.id).select("nickname, display_name, role, steam_id").single();
    if (error) setMessage(error.message);
    else { setProfile(data); setEditorOpen(false); setMessage(ru ? "Профиль сохранён." : lv ? "Profils saglabāts." : "Profile saved."); }
    setProfileBusy(false);
  }

  async function uploadAvatar(file?: File) {
    if (!file || !supabase) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage(ru ? "Выбери JPG, PNG или WEBP." : lv ? "Izvēlies JPG, PNG vai WEBP." : "Choose a JPG, PNG or WEBP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage(ru ? "Размер файла не должен превышать 5 МБ." : lv ? "Faila izmērs nedrīkst pārsniegt 5 MB." : "The file must be 5 MB or smaller."); return; }
    setAvatarBusy(true); setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = session.user.id + "/" + Date.now() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      setMessage(ru ? "Фото профиля обновлено." : lv ? "Profila attēls atjaunināts." : "Profile photo updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload the image."); }
    finally { setAvatarBusy(false); }
  }

  async function removeAvatar() {
    if (!supabase) return;
    setAvatarBusy(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
    if (error) setMessage(error.message);
    else { setAvatarUrl(null); setMessage(ru ? "Фото удалено." : lv ? "Attēls noņemts." : "Profile photo removed."); }
    setAvatarBusy(false);
  }

  async function beginTotpSetup() {
    if (!supabase || totpBusy) return;
    setTotpBusy(true);
    setTotpMessage("");
    try {
      // Remove abandoned, unverified setup attempts so they cannot block a fresh enrollment.
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const existingVerified = (factors?.totp || []).find((factor) => factor.status === "verified");
      if (existingVerified) {
        setTotpFactor({ id: existingVerified.id, status: existingVerified.status, friendly_name: existingVerified.friendly_name });
        setTotpSetup(null);
        setTotpMessage(ru ? "Google Authenticator уже привязан к аккаунту. 2FA включена." : lv ? "Google Authenticator jau ir piesaistīts kontam. 2FA ir ieslēgta." : "An authenticator is already linked to this account. 2FA is enabled.");
        return;
      }

      const pending = factors?.totp || [];
      for (const factor of pending) {
        const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removeError) throw removeError;
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "VENTSPILS ARENA" });
      if (error) throw error;
      const challenge = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (challenge.error) {
        await supabase.auth.mfa.unenroll({ factorId: data.id });
        throw challenge.error;
      }
      setTotpSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret, challengeId: challenge.data.id });
    } catch (error) {
      setTotpMessage(error instanceof Error ? error.message : (ru ? "Не удалось запустить настройку 2FA." : lv ? "Neizdevās sākt 2FA iestatīšanu." : "Could not start 2FA setup."));
    } finally {
      setTotpBusy(false);
    }
  }

  async function verifyTotp() {
    if (!supabase || !totpSetup) return;
    const code = totpCode.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) { setMessage(ru ? "Введи 6-значный код." : lv ? "Ievadi 6 ciparu kodu." : "Enter the 6-digit code."); return; }
    setTotpBusy(true); setTotpMessage("");
    const { error } = await supabase.auth.mfa.verify({ factorId: totpSetup.id, challengeId: totpSetup.challengeId, code });
    if (error) setTotpMessage(error.message);
    else {
      setTotpSetup(null); setTotpCode(""); await refreshFactors();
      setTotpMessage(ru ? "Двухфакторная защита включена." : lv ? "Divfaktoru aizsardzība ieslēgta." : "Two-factor authentication enabled.");
    }
    setTotpBusy(false);
  }

  async function disableTotp() {
    if (!supabase || !totpFactor) return;
    if (!window.confirm(ru ? "Отключить двухфакторную защиту аккаунта?" : lv ? "Izslēgt divfaktoru aizsardzību?" : "Disable two-factor authentication?")) return;
    setTotpBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
    if (error) setTotpMessage(error.message);
    else { setTotpFactor(null); setTotpMessage(ru ? "2FA отключена." : lv ? "2FA izslēgta." : "2FA disabled."); }
    setTotpBusy(false);
  }

  async function logout() {
    await supabase?.auth.signOut();
    router.replace("/");
  }

  if (loading) return <main className="account-page"><p className="account-loading">{t.loading}</p></main>;

  return (
    <main className="account-page">
      <div className="account-shell">
        <div className="account-breadcrumb"><Link href="/">HOME</Link><span>/</span> {t.crumb}</div>
        <div className="account-heading"><div><span className="account-kicker">VENTSPILS ARENA / PLAYER AREA</span><h1>{t.heading}<br/><em>{t.sub}</em></h1></div><span className="account-mark">VA</span></div>
        <section className="profile-panel">
          <div className="profile-topline"><span>{t.overview}</span><span className="profile-status"><i/> {t.active}</span></div>
          <div className="profile-main">
            <div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile avatar" /> : (profile?.display_name || profile?.nickname || email || "P").slice(0,1).toUpperCase()}</div>
            <div className="profile-identity"><span className="account-kicker">{t.welcome}</span><h2>{profile?.display_name || profile?.nickname || t.player}</h2><p>{email}</p></div>
            <span className="profile-role">{profile?.role === "SUPER_ADMIN" ? "SUPER ADMIN" : t.player}</span>
          </div>
          <div className="profile-details">
            <div><span>{t.nickname}</span><strong>{profile?.nickname || t.notset}</strong></div>
            <div><span>{t.display}</span><strong>{profile?.display_name || t.notset}</strong></div>
            <div><span>{t.type}</span><strong>{profile?.role || t.player}</strong></div>
          </div>
        </section>
        <button type="button" className="profile-edit-trigger" onClick={() => { setEditorOpen(true); setMessage(""); }}>
          <span className="profile-edit-icon">✎</span><span><strong>{t.edit}</strong><small>{t.editDesc}</small></span><b>↗</b>
        </button>
        <section className="friend-code-panel">
          <div className="friend-code-heading">{t.friendCode}</div>
          <div className="friend-code-content"><strong>{friendCode || "— — — — — — — —"}</strong><button type="button" disabled={!friendCode} onClick={() => { void navigator.clipboard.writeText(friendCode); setMessage(ru ? "Код скопирован." : lv ? "Kods nokopēts." : "Code copied."); }}>{t.copy}</button></div>
          <p>{t.friendHint}</p>
        </section>
        <section className="account-actions">
          <div><span className="account-kicker">{t.space}</span><h3>{t.ready}</h3><p>{t.spaceText}</p></div>
          <div className="account-action-links"><Link href="/community">{ru ? "ДРУЗЬЯ И КОМАНДЫ" : lv ? "DRAUGI UN KOMANDAS" : "FRIENDS & TEAMS"} <span>↗</span></Link><Link href="/tournaments">{t.browse} <span>↗</span></Link>{profile?.role === "SUPER_ADMIN" && <Link href="/admin">{t.admin} <span>↗</span></Link>}<button type="button" onClick={logout}>{t.logout} <span>↗</span></button></div>
        </section>
        <SteamLink steamId={profile?.steam_id} />
        <MyMatches />
        {message && <p className="account-message" role="status">{message}</p>}
      </div>

      {editorOpen && <div className="profile-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}>
        <section className="profile-editor-modal" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
          <div className="profile-editor-header"><div><span className="account-kicker">VENTSPILS ARENA / ACCOUNT</span><h2 id="profile-editor-title">{t.editTitle}</h2><p>{t.editDesc}</p></div><button type="button" aria-label={t.close} onClick={() => setEditorOpen(false)}>×</button></div>
          <div className="profile-editor-body">
            <section className="profile-editor-section">
              <div className="profile-editor-section-title"><span>01</span><div><h3>{t.basic}</h3><p>{ru ? "Данные, которые видят другие игроки." : lv ? "Informācija, ko redz citi spēlētāji." : "Details visible to other players."}</p></div></div>
              <label className="profile-field">{t.nickname}<input value={nickname} maxLength={24} onChange={event => setNickname(event.target.value)} placeholder={ru ? "Твой игровой ник" : lv ? "Tavs spēles niks" : "Your player nickname"} /></label>
              <label className="profile-field">{t.display}<input value={displayName} maxLength={40} onChange={event => setDisplayName(event.target.value)} placeholder={ru ? "Имя в профиле" : lv ? "Vārds profilā" : "Name shown on your profile"} /></label>
              <div className="profile-editor-actions"><button type="button" className="profile-primary-button" disabled={profileBusy} onClick={() => void saveProfile()}>{profileBusy ? t.saving : t.save}</button></div>
            </section>
            <section className="profile-editor-section">
              <div className="profile-editor-section-title"><span>02</span><div><h3>{t.avatar}</h3><p>{t.avatarHint}</p></div></div>
              <div className="profile-avatar-settings"><div className="profile-avatar profile-avatar-large">{avatarUrl ? <img src={avatarUrl} alt="Profile avatar" /> : (profile?.display_name || profile?.nickname || email || "P").slice(0,1).toUpperCase()}</div><div className="profile-avatar-controls"><label className="profile-secondary-button">{avatarBusy ? "..." : avatarUrl ? t.change : t.upload}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.currentTarget.value = ""; }} /></label>{avatarUrl && <button type="button" className="profile-text-button" disabled={avatarBusy} onClick={() => void removeAvatar()}>{t.remove}</button>}</div></div>
            </section>
            <section className="profile-editor-section">
              <div className="profile-editor-section-title"><span>03</span><div><h3>{t.security}</h3><p>{t.twofaDesc}</p></div></div>
              {totpMessage && <p className="account-message" role="alert" style={{margin:"0 0 12px",color:"#ff777d"}}>{totpMessage}</p>}
              <div className="profile-security-card"><div className="profile-security-status"><i className={totpFactor ? "is-enabled" : ""}/><div><strong>{t.twofa}</strong><small>{totpFactor ? t.enabled : t.disabled}</small></div></div>{totpFactor ? <button type="button" className="profile-danger-button" disabled={totpBusy} onClick={() => void disableTotp()}>{totpBusy ? "..." : t.disable}</button> : !totpSetup ? <button type="button" className="profile-primary-button" disabled={totpBusy} onClick={() => void beginTotpSetup()}>{totpBusy ? "..." : t.setup}</button> : null}</div>
              {totpSetup && <div className="profile-totp-setup"><p>{t.scan}</p><img src={totpSetup.qr} alt="Authenticator QR code" /><small>{t.secret}</small><code>{totpSetup.secret}</code><button type="button" className="profile-secondary-button" style={{marginTop:10,width:"100%"}} onClick={() => { void navigator.clipboard.writeText(totpSetup.secret).then(() => setTotpMessage(t.copiedSecret)).catch(() => setTotpMessage(ru ? "Не удалось скопировать ключ. Выдели его и скопируй вручную." : lv ? "Neizdevās nokopēt atslēgu. Iezīmē un kopē to manuāli." : "Could not copy the key. Select and copy it manually.")); }}>{t.copySecret}</button><label className="profile-field">{t.code}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totpCode} onChange={event => setTotpCode(event.target.value.replace(/\D/g, "").slice(0,6))} placeholder="000000" /></label><div className="profile-editor-actions"><button type="button" className="profile-primary-button" disabled={totpBusy || totpCode.length !== 6} onClick={() => void verifyTotp()}>{totpBusy ? "..." : t.verify}</button><button type="button" className="profile-text-button" onClick={() => { setTotpSetup(null); setTotpCode(""); }}>{t.cancel}</button></div></div>}
            </section>
          </div>
          <div className="profile-editor-footer"><span>{email}</span><button type="button" onClick={() => setEditorOpen(false)}>{t.close}</button></div>
        </section>
      </div>}
    </main>
  );
}
