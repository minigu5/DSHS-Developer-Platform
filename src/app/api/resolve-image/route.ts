import { NextResponse, type NextRequest } from 'next/server';

// ibb.co 페이지 URL을 직접 이미지 URL로 변환.
// og:image 메타 태그에서 추출하여 반환.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  try {
    const { hostname } = new URL(url);
    if (hostname !== 'ibb.co') {
      return NextResponse.json({ error: 'ibb.co only' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      next: { revalidate: 3600 },
    });
    const html = await res.text();

    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](https?:\/\/[^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["'](https?:\/\/[^"']+)["'][^>]+property=["']og:image["']/i);

    if (match) {
      // 기법 7: 1일 엣지 캐시 + 1시간 stale-while-revalidate (기법 8: 재검증)
      return NextResponse.json({ imageUrl: match[1] }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
      });
    }
    return NextResponse.json({ error: 'not found' }, { status: 422 });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
