import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // важно: Node, не Edge
const WEBHOOK_SECRET = process.env.DIRECTUS_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let evt: any;
  try { evt = await req.json(); } catch { return NextResponse.json({ ok:false, error:'bad-json' }, { status:400 }); }

  return NextResponse.json({ ok: true, received: { collection: evt?.collection, action: evt?.action } });
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'directus-sync' });
}
