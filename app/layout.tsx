import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Domus — каталожный сайт",
  description: "Каталог объектов на Supabase",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b bg-white">
          <div className="container py-4">
            <h1 className="text-xl font-semibold">Domus — каталог</h1>
          </div>
        </header>
        <main className="container my-6">{children}</main>
      </body>
    </html>
  );
}
