import Link from "next/link";

export default function CookiesPage() {
  return <main className="legal-page"><article className="legal-shell">
    <Link href="/" className="legal-back">← VENTSPILS ARENA</Link>
    <span className="legal-kicker">VENTSPILS ARENA / LEGAL</span>
    <h1>COOKIE<br/><em>INFORMATION.</em></h1>
    <p className="legal-updated">Updated: 16 November 2026</p>
    <section><h2>1. ESSENTIAL STORAGE</h2><p>VENTSPILS ARENA uses browser storage to remember your language preference. The website and its authentication provider may also use strictly necessary storage to keep account and security features working. These functions are required to provide the service you request.</p></section>
    <section><h2>2. OPTIONAL COOKIES</h2><p>This page does not describe optional analytics or advertising cookies as enabled. If optional tracking technologies are introduced, this information should be updated and any consent required by law should be requested before they are used.</p></section>
    <section><h2>3. MANAGING STORAGE</h2><p>You can manage or clear cookies and site storage in your browser settings. Blocking essential storage may affect sign-in, language preferences or other website features.</p></section>
    <section><h2>4. CONTACT</h2><p>Questions about privacy or website storage: vcupsupport@gmail.com. Read our <Link href="/privacy">Privacy Policy</Link> for more information.</p></section>
    <div className="legal-footer"><Link href="/privacy">PRIVACY POLICY</Link><Link href="/terms">TERMS & CONDITIONS</Link></div>
  </article></main>;
}
