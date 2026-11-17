import "./globals.css";
import "./components/AIHelpWidget.css";
import { LanguageProvider } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import MaintenanceGate from "./components/MaintenanceGate";
import AIHelpWidget from "./components/AIHelpWidget";
export const metadata={
 title:"VENTSPILS ARENA",
 description:"An independent platform for competitive tournaments and gaming communities.",
 icons:{icon:"/icon.svg",shortcut:"/icon.svg",apple:"/icon.svg"}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><LanguageProvider><MaintenanceGate>{children}</MaintenanceGate><LanguageSwitcher /><AIHelpWidget /></LanguageProvider></body></html>}