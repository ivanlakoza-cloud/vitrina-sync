import type { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

async function serve(): Promise<Response> {
  const filePath = path.join(process.cwd(), 'public', 'b24', 'soglasovanie-ceny', 'index.html');
  try {
    const html = await readFile(filePath, 'utf8');
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (e: unknown) {
    const err: any = e || {};
    const msg = 'B24 Widget route error\n' + (err.stack || err.message || String(e));
    return new Response(msg, { status: 500 });
  }
}

export async function GET(_req: NextRequest) { return serve(); }
export async function POST(_req: NextRequest) { return serve(); }
