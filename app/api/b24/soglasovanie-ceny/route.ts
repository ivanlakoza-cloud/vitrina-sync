import type { NextRequest } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const PUBLIC_BASE = '/b24/soglasovanie-ceny/';

function fixHtml(html: string): string {
  let out = html;

  // 1) Добавляем <base> если его нет
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${PUBLIC_BASE}">`);
  }

  // 2) Переписываем относительные href|src на абсолютные в паблик
  //    (игнорируем абсолютные http/https, абсолютные от корня '/', якоря '#', data:, mailto:)
  out = out.replace(/(\s(?:href|src)=["'])(?!https?:|\/|#|data:|mailto:)([^"']+)/gi, `$1${PUBLIC_BASE}$2`);

  return out;
}

async function serve(): Promise<Response> {
  const p = path.join(process.cwd(), 'public', 'b24', 'soglasovanie-ceny', 'index.html');

  try {
    const html = await readFile(p, 'utf8');
    const fixed = fixHtml(html);
    return new Response(fixed, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (e: unknown) {
    let msg = 'B24 Widget route error';
    if (e instanceof Error) {
      msg += '\n' + (e.message || '');
      if (e.stack) msg += '\n' + e.stack;
    }
    return new Response(msg, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

export async function GET(_req: NextRequest) {
  return serve();
}

export async function POST(_req: NextRequest) {
  return serve();
}

// Не кешировать и не пререндерить
export const dynamic = 'force-dynamic';
export const revalidate = 0;
