import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Витрина",
  description: "Объекты на карте и в каталоге",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-neutral-50 text-gray-900 antialiased">
        <div className="max-w-7xl mx-auto p-5">{children}</div>
      </body>
    </html>
  );
}
