import { NextResponse, type NextRequest } from 'next/server';

import { parseGithubRepo } from '@/lib/github-readme';
import { checkGithubRepo } from '@/lib/github-repo-check';
import { createClient } from '@/lib/supabase/server';

// 등록·수정 폼이 오픈소스 저장소가 공개인지 묻는다 — { status: 'public' | 'missing' | 'unknown' }.
// missing = 비공개이거나 없음(GitHub가 둘 다 404). unknown 이면 폼은 막지 않는다.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  const target = parseGithubRepo(request.nextUrl.searchParams.get('url') ?? '');
  if (!target) {
    return NextResponse.json(
      { error: 'GitHub 저장소 링크를 입력해 주세요. 예: https://github.com/username/repo' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const status = await checkGithubRepo(target, { token: process.env.GITHUB_TOKEN });
  return NextResponse.json({ status }, { headers: { 'Cache-Control': 'no-store' } });
}
