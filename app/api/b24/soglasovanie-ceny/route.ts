// app/api/b24/soglasovanie-ceny/route.ts
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// текущая папка роута
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// читаем файлы из той же папки
function safeRead(rel: string, fallback = '') {
  try { return readFileSync(join(__dirname, rel)) } catch { return Buffer.from(fallback) }
}

// предварительно подгружаем контент (Vercel ok в nodejs runtime)
const html = safeRead('index.html')
const css  = safeRead('styles.css')
const js   = safeRead('app.js') // если не используешь отдельный JS — просто не подключай в index.html
const xlsx = safeRead('reestr_sopostavleniya.xlsx')

type Asset = { body: Buffer | string; type: string; extraHeaders?: Record<string,string> }

function pickAsset(url: URL): Asset {
  const a = (url.searchParams.get('asset') || '').toLowerCase()

  if (a === 'styles.css') return { body: css,  type: 'text/css; charset=utf-8' }
  if (a === 'app.js')     return { body: js,   type: 'application/javascript; charset=utf-8' }
  if (a === 'reestr_sopostavleniya.xlsx') {
    return {
      body: xlsx,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extraHeaders: { 'Content-Disposition': 'attachment; filename="reestr_sopostavleniya.xlsx"' }
    }
  }
  // по умолчанию HTML
  return { body: html, type: 'text/html; charset=utf-8' }
}

function respond(asset: Asset) {
  return new NextResponse(asset.body, {
    headers: {
      'Content-Type': asset.type,
      'Cache-Control': 'no-store',
      'X-Widget': 'b24-soglasovanie-v18',
      ...(asset.extraHeaders || {}),
    },
  })
}

export async function GET (req: Request)  { return respond(pickAsset(new URL(req.url))) }
export async function POST(req: Request)  { return respond(pickAsset(new URL(req.url))) }
