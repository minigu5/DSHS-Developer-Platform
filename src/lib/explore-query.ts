// 탐색(/explore) 검색어·필터·정렬 ↔ 주소 쿼리. 새로고침·링크 공유·뒤로 가기에도 같은 결과가 보이게
// 화면 상태를 주소에 남긴다(2026-11-01). 서버 페이지가 읽어 첫 화면부터 거른 목록을 그리고,
// ExploreClient가 바뀔 때마다 history.replaceState로 다시 쓴다. node:test로 검증한다.

import { FEATURES, PLATFORMS, PROJECT_TYPES } from './constants.ts';

export type ExploreSort = 'newest' | 'clicks' | 'hearts';

export interface ExploreQuery {
  q: string;
  types: string[];
  categories: string[];
  platforms: string[];
  sort: ExploreSort;
}

export const EMPTY_EXPLORE_QUERY: ExploreQuery = {
  q: '',
  types: [],
  categories: [],
  platforms: [],
  sort: 'newest',
};

const SORTS: readonly ExploreSort[] = ['newest', 'clicks', 'hearts'];
const Q_MAX = 100;

type Raw = string | string[] | undefined | null;

function first(v: Raw): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

// "a,b" 또는 ?type=a&type=b 둘 다 받는다. 모르는 값·중복은 버리고 목록 순서로 맞춘다.
function pick(v: Raw, allowed: readonly { value: string }[]): string[] {
  const got = new Set(
    (Array.isArray(v) ? v : [v ?? ''])
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return allowed.map((o) => o.value).filter((value) => got.has(value));
}

/** 서버 `searchParams`(값이 배열일 수 있음) 또는 URLSearchParams를 받아 화면 상태로 바꾼다. */
export function parseExploreQuery(params: URLSearchParams | Record<string, Raw>): ExploreQuery {
  const get = (k: string): Raw =>
    params instanceof URLSearchParams ? params.getAll(k) : params[k];
  const sort = first(get('sort')) as ExploreSort;
  return {
    q: first(get('q')).slice(0, Q_MAX),
    types: pick(get('type'), PROJECT_TYPES),
    categories: pick(get('category'), FEATURES),
    platforms: pick(get('platform'), PLATFORMS),
    sort: SORTS.includes(sort) ? sort : 'newest',
  };
}

/** 기본값이 아닌 것만 담은 쿼리 문자열("?q=…&type=…" 또는 ""). 값 순서는 목록 순서로 고정. */
export function exploreQueryString(query: ExploreQuery): string {
  const p = new URLSearchParams();
  const q = query.q.trim();
  if (q) p.set('q', q.slice(0, Q_MAX));
  const types = pick(query.types, PROJECT_TYPES);
  const categories = pick(query.categories, FEATURES);
  const platforms = pick(query.platforms, PLATFORMS);
  if (types.length) p.set('type', types.join(','));
  if (categories.length) p.set('category', categories.join(','));
  if (platforms.length) p.set('platform', platforms.join(','));
  if (query.sort !== 'newest') p.set('sort', query.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}
