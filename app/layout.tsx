import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Domus",
  description: "Каталог объектов на Supabase",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <main className="container my-6">{children}</main>
      </body>
    </html>
  );
}
