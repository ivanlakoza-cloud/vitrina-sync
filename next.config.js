/** @type {import('next').NextConfig} */

const BITRIX_ANCESTORS = [
  "https://*.bitrix24.ru",
  "https://*.bitrix24.by",
  "https://*.bitrix24.kz",
  "https://*.bitrix24.ua",
  "https://*.bitrix24.de",
  "https://*.bitrix24.com",
  "https://*.bitrix24.site",
].join(" ");

const nextConfig = {
  reactStrictMode: false,
  trailingSlash: true, // <— ключевая строка: сохраняем / в конце

  async headers() {
    const common = [
      { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${BITRIX_ANCESTORS}` },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
    ];
    return [
      { source: "/b24", headers: common },
      { source: "/b24/:path*", headers: common },
    ];
  },
};

module.exports = nextConfig;
