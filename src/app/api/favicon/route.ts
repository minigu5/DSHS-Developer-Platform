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
  return NextResponse.json(
    { faviconUrl },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } },
  );
}
