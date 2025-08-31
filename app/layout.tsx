
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vitrina",
  description: "Каталог коммерческой недвижимости",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <strong>Vitrina</strong>
            <span className="site-header__build">build 2025-08-31 07:41:10</span>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
