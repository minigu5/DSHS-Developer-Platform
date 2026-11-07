// 매일 밤 Worker 예약 작업(/api/favicon-sync/run)과 로컬 scripts/sync-favicons.mts 가 쓰는 파비콘 동기화 판단 로직.
// "URL에서 자동 추출"(icon_type='auto') 프로젝트의 icon_url 을 사이트의 지금 파비콘으로 맞춘다.
// 네트워크는 resolve·check 로 주입받아 node:test 로 검증한다.

import { isFallbackFaviconService } from './favicon.ts';

export interface FaviconSyncRow {
  id: string;
  title: string;
  url: string | null;
  icon_url: string | null;
}

export interface FaviconSyncDeps {
  /** 사이트에서 파비콘을 다시 찾는다(resolveFavicon) */
  resolve: (siteUrl: string) => Promise<string | null>;
  /** 저장된 아이콘 주소가 아직 이미지로 열리는지(isImageOk) */
  check: (iconUrl: string) => Promise<boolean>;
}

export type FaviconSyncOutcome =
  | { kind: 'unchanged' }
  | { kind: 'skipped'; reason: string }
  | { kind: 'updated'; patch: { icon_url: string } };

export async function syncFavicon(row: FaviconSyncRow, deps: FaviconSyncDeps): Promise<FaviconSyncOutcome> {
  if (!row.url) return { kind: 'skipped', reason: '사이트 주소 없음' };

  const next = await deps.resolve(row.url);
  // 못 찾았으면 지우지 않는다 — 사이트가 잠깐 내려갔을 수 있다
  if (!next) return { kind: 'skipped', reason: '파비콘을 찾지 못함(그대로 둠)' };
  if (next === row.icon_url) return { kind: 'unchanged' };

  // 서버 IP는 데이터센터 대역이라 사이트(Cloudflare 보호 등)가 막으면 공개 favicon 서비스로 떨어진다.
  // 원래 사이트에서 직접 받은 아이콘이 아직 열리면 그쪽이 정확하므로 바꾸지 않는다.
  if (
    isFallbackFaviconService(next) &&
    row.icon_url &&
    !isFallbackFaviconService(row.icon_url) &&
    (await deps.check(row.icon_url))
  ) {
    return { kind: 'skipped', reason: '사이트가 직접 요청을 막은 듯함(기존 아이콘 유지)' };
  }

  return { kind: 'updated', patch: { icon_url: next } };
}
