/** @type {import('next').NextConfig} */

// Разрешаем встраивание в iframe со стороны Bitrix24
const BITRIX_ANCESTORS = [
  "https://*.bitrix24.ru",
  "https://*.bitrix24.by",
  "https://*.bitrix24.kz",
  "https://*.bitrix24.ua",
  "https://*.bitrix24.de",
  "https://*.bitrix24.com",
  "https://*.bitrix24.site"
].join(' ');

const nextConfig = {
  reactStrictMode: false,

  async headers() {
    const common = [
      { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${BITRIX_ANCESTORS}` },
      // ВАЖНО: не добавляй X-Frame-Options — он сломает встраивание
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer-when-downgrade" }
    ];

    return [
      // сам узел /b24
      { source: "/b24", headers: common },
      // все вложенные пути и файлы /b24/*
      { source: "/b24/:path*", headers: common }
    ];
  }
};

module.exports = nextConfig;
