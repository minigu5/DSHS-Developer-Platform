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
  // 기법 7: 1일 엣지 캐시 + 1시간 stale-while-revalidate (기법 8: 재검증)
  return NextResponse.json({ faviconUrl }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } });
}
