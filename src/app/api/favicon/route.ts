import { NextResponse, type NextRequest } from 'next/server';
import { resolveFavicon } from '@/lib/favicon';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const faviconUrl = await resolveFavicon(url);
  return NextResponse.json({ faviconUrl }, { headers: { 'Cache-Control': 's-maxage=3600' } });
}
