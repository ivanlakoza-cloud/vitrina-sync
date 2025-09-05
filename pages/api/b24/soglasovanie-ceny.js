// pages/api/b24/soglasovanie-ceny.js
// Ответит HTML на любой метод (POST/GET/HEAD) — чтобы Bitrix24 мог слать POST в виджет.
// Кладём этот файл в репозиторий по пути pages/api/b24/soglasovanie-ceny.js

import fs from "fs";
import path from "path";

const BITRIX_ANCESTORS = [
  "https://*.bitrix24.ru",
  "https://*.bitrix24.by",
  "https://*.bitrix24.kz",
  "https://*.bitrix24.ua",
  "https://*.bitrix24.de",
  "https://*.bitrix24.com",
  "https://*.bitrix24.site",
].join(" ");

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), "public", "b24", "soglasovanie-ceny", "index.html");
  try {
    const html = fs.readFileSync(filePath, "utf8");

    // Заголовки для корректного отображения в iframe Битрикс24
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Security-Policy", `frame-ancestors 'self' ${BITRIX_ANCESTORS}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");

    // Разрешим preflight/OPTIONS если вдруг попадёт
    res.setHeader("Allow", "GET,POST,HEAD,OPTIONS");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    return res.status(200).send(html);
  } catch (e) {
    console.error("Handler error:", e);
    return res.status(500).send("Internal error");
  }
}
