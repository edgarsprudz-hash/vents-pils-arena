import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "VENTSPILS ARENA Organizer",
  description: "Private match operations for VENTSPILS ARENA organizers.",
  manifest: "/organizer.webmanifest?v=2",
  applicationName: "VENTSPILS ARENA Organizer",
  appleWebApp: {
    capable: true,
    title: "VENTSPILS ARENA",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/organizer-icon-v2.svg",
    apple: "/favicon-64.png"
  },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
