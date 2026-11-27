import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CLAUDE SMM | VENTSPILS ARENA",
  description: "Private AI-powered social media management for VENTSPILS ARENA.",
  manifest: "/smm.webmanifest",
  applicationName: "CLAUDE SMM",
  appleWebApp: { capable: true, title: "CLAUDE SMM", statusBarStyle: "black-translucent" },
  icons: { icon: "/organizer-icon-v2.svg", apple: "/favicon-64.png" },
  robots: { index: false, follow: false }
};
export const viewport: Viewport = { themeColor: "#08090b", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default function SmmLayout({ children }: { children: React.ReactNode }) { return children; }
