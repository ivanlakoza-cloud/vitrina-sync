import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Витрина',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
