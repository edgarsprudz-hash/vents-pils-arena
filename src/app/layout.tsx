import "./globals.css";
import "./components/AIHelpWidget.css";
import { LanguageProvider } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import MaintenanceGate from "./components/MaintenanceGate";
import AIHelpWidget from "./components/AIHelpWidget";

export const metadata = {
  metadataBase: new URL("https://ventspilsarena.lat"),
  title: "VENTSPILS ARENA — spēļu turnīri un e-sporta kopiena",
  description:
    "VENTSPILS ARENA ir platforma dažādu spēļu turnīriem Latvijā — piesakies sacensībām, veido komandas, seko rezultātiem un pievienojies spēļu kopienai.",
  applicationName: "VENTSPILS ARENA",
  icons: {
    icon: [
      { url: "/favicon-64.png", type: "image/png", sizes: "64x64" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon-64.png",
    apple: [{ url: "/favicon-64.png", sizes: "64x64", type: "image/png" }],
  },
  openGraph: {
    title: "VENTSPILS ARENA — spēļu turnīri un e-sporta kopiena",
    description:
      "Piedalies dažādu spēļu turnīros, veido komandas, seko rezultātiem un pievienojies VENTSPILS ARENA kopienai.",
    url: "https://ventspilsarena.lat",
    siteName: "VENTSPILS ARENA",
    locale: "lv_LV",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VENTSPILS ARENA — spēļu turnīri un e-sporta kopiena",
    description:
      "Dažādu spēļu turnīri, komandas, rezultāti un spēļu kopiena Latvijā.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lv">
      <body>
        <LanguageProvider>
          <MaintenanceGate>{children}</MaintenanceGate>
          <LanguageSwitcher />
          <AIHelpWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
