/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: false };
// next.config.js
const BITRIX_ANCESTORS = [
  "https://*.bitrix24.ru",
  "https://*.bitrix24.by",
  "https://*.bitrix24.kz",
  "https://*.bitrix24.ua",
  "https://*.bitrix24.de",
  "https://*.bitrix24.com",
  "https://*.bitrix24.site"
].join(' ');

module.exports = {
  async headers() {
    return [
      {
        source: "/b24/:path*",
        headers: [
          // Управляет встраиванием: разрешаем фрейм внутри Bitrix24-доменов и себя
          { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${BITRIX_ANCESTORS}` },
          // ВАЖНО: НЕ выставляй X-Frame-Options здесь вообще.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" }
        ]
      }
    ];
  }
};
async headers() {
  return [{
    source: "/b24/:path*",
    headers: [
      { key: "Content-Security-Policy",
        value: "frame-ancestors 'self' https://*.bitrix24.ru https://*.bitrix24.by https://*.bitrix24.kz https://*.bitrix24.ua https://*.bitrix24.de https://*.bitrix24.com https://*.bitrix24.site" }
    ]
  }];
}
