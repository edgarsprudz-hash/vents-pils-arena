import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "VENTSPILS ARENA — SMM", description: "Private social media workspace for VENTSPILS ARENA" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="lv"><body>{children}</body></html>; }
