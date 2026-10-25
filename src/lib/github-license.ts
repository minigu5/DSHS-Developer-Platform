// GitHub 라이선스 가져오기용 순수 함수 모음. 서버 라우트(/api/github-license)가 쓴다.
// node:test 로 검증하므로 상대 import 없이 유지.

export interface GithubLicense {
  key: string;
  name: string;
  spdxId: string | null;
}

// GitHub /licenses/{key} 의 permissions 값 → 등록 폼 "허용하는 것" 칩 값(LICENSE_FEATURES 순서).
// 법적 책임·보증은 GitHub 가 limitations 로만 분류하므로 칩을 켜지 않는다.
const PERMISSION_TO_FEATURE: ReadonlyArray<readonly [string, string]> = [
  ['commercial-use', 'commercial'],
  ['modifications', 'modify'],
  ['distribution', 'distribute'],
  ['private-use', 'private'],
];

const LICENSE_KEY_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

export function licenseFeaturesFromPermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  const given = new Set(permissions.filter((p): p is string => typeof p === 'string'));
  return PERMISSION_TO_FEATURE.filter(([permission]) => given.has(permission)).map(([, feature]) => feature);
}

// /repos/{o}/{r}/license 응답에서 라이선스를 식별한다. 못 알아본 라이선스(other·NOASSERTION)나
// 모양이 이상한 응답은 null — 키는 URL 경로에 다시 쓰이므로 문자도 제한한다.
export function parseRepoLicense(body: unknown): GithubLicense | null {
  if (typeof body !== 'object' || body === null) return null;
  const license = (body as { license?: unknown }).license;
  if (typeof license !== 'object' || license === null) return null;

  const { key, name, spdx_id: spdxId } = license as { key?: unknown; name?: unknown; spdx_id?: unknown };
  if (typeof key !== 'string' || typeof name !== 'string') return null;
  if (!LICENSE_KEY_RE.test(key) || key === 'other' || spdxId === 'NOASSERTION') return null;
  return { key, name, spdxId: typeof spdxId === 'string' ? spdxId : null };
}
