import type { ReactNode } from "react";
import AdminLocale from "./AdminLocale";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLocale>{children}</AdminLocale>;
}
