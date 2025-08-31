import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Витрина", description: "Каталог объектов на Supabase", icons: { icon: "/icon.svg" } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ru"><body><main className="container py-4">{children}</main></body></html>);
}