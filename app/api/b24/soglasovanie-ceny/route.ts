import { NextRequest } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message
  try { return JSON.stringify(e) } catch { return String(e) }
}

async function serve() {
  const filePath = path.join(process.cwd(), 'public', 'b24', 'soglasovanie-ceny', 'index.html')
  try {
    const html = await readFile(filePath, 'utf8')
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
