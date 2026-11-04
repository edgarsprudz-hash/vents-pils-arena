import "./globals.css";
import { LanguageProvider } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
export const metadata={
 title:"VENTSPILS ARENA",
 description:"CS2 esports in Ventspils, Latvia",
 icons:{icon:"/icon.svg",shortcut:"/icon.svg",apple:"/icon.svg"}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><LanguageProvider>{children}<LanguageSwitcher /></LanguageProvider></body></html>}