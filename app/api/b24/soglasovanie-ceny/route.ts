import { NextRequest } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message
  try { return JSON.stringify(e) } catch { return String(e) }
}

// Ensures that relative assets inside index.html resolve to /b24/soglasovanie-ceny/*
function injectBaseHref(html: string): string {
  const hasBase = /<base\s+href=/i.test(html)
  if (hasBase) return html
  return html.replace(/<head(\s[^>]*)?>/i, '<head$1><base href="/b24/soglasovanie-ceny/">')
}

async function serve() {
  const filePath = path.join(process.cwd(), 'public', 'b24', 'soglasovanie-ceny', 'index.html')
  try {
    const htmlRaw = await readFile(filePath, 'utf8')
    const html = injectBaseHref(htmlRaw)
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (e: unknown) {
    const msg = 'B24 Widget route error\n' + toErrorMessage(e)
    return new Response(msg, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}

export async function GET(_req: NextRequest) { return serve() }
export async function POST(_req: NextRequest) { return serve() }
