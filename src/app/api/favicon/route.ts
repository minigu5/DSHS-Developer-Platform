import { NextResponse, type NextRequest } from 'next/server';

// 사이트 URL에서 favicon URL을 서버사이드로 추출.
// <link rel="icon"> 태그 파싱 → 없으면 /favicon.ico 폴백.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; favicon-bot/1.0)' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ faviconUrl: `${origin}/favicon.ico` });
    }

    const html = await res.text();

    // apple-touch-icon → icon → shortcut icon 순서로 우선 탐색
    const relPriority = [
      'apple-touch-icon',
      'apple-touch-icon-precomposed',
      'icon',
      'shortcut icon',
    ];

    for (const rel of relPriority) {
      // rel 순서와 href 순서 모두 커버
      const patterns = [
        new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']`, 'i'),
        new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${rel}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
          try {
            return NextResponse.json({ faviconUrl: new URL(match[1], origin).href });
          } catch {
            // 잘못된 URL이면 다음 패턴으로
          }
        }
      }
    }

    return NextResponse.json({ faviconUrl: `${origin}/favicon.ico` });
  } catch {
    return NextResponse.json({ faviconUrl: `${origin}/favicon.ico` });
  }
}
