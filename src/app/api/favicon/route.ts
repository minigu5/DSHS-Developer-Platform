import { NextResponse, type NextRequest } from 'next/server';

import { resolveFavicon } from '@/lib/favicon';
import { assertSafePublicUrl } from '@/lib/ssrf-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const safe = await assertSafePublicUrl(url);
  if (!safe.ok) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const faviconUrl = await resolveFavicon(safe.url.href);

  // 실패(null) 응답은 캐시하지 않는다 — 이 라우트는 쿠키 없는 응답이라 Vercel CDN이
  // ?url= 쿼리 기준으로 요청자 무관하게 공유 캐시함. 첫 시도가 일시적으로 실패하면
  // 24시간 동안 모든 사용자에게 "아이콘 없음"이 고정되는 문제가 있었음.
  if (!faviconUrl) {
    return NextResponse.json({ faviconUrl }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    { faviconUrl },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } },
  );
}

