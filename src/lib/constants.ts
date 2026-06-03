// 프로젝트 체크리스트 옵션. 게시 폼 / 필터링에서 공통으로 import.
// 값 추가 시 RLS / DB constraint 와 함께 검토할 것.

export const PROJECT_TYPES = [
  { value: 'website', label: '웹사이트' },
  { value: 'app', label: '응용프로그램(App)' },
  { value: 'extension', label: '확장프로그램' },
  { value: 'cli', label: 'CLI / 스크립트' },
  { value: 'library', label: '라이브러리 / 패키지' },
  { value: 'other', label: '기타' },
] as const;

export const PLATFORMS = [
  { value: 'web', label: 'Web' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
] as const;

export const SOURCE_TYPES = [
  { value: 'open', label: 'Open Source' },
  { value: 'closed', label: 'Closed Source' },
] as const;

export const LICENSES = [
  { value: 'mit', label: 'MIT' },
  { value: 'apache-2.0', label: 'Apache 2.0' },
  { value: 'gpl-3.0', label: 'GPL 3.0' },
  { value: 'bsd-3-clause', label: 'BSD 3-Clause' },
  { value: 'custom', label: 'Custom' },
  { value: 'none', label: '라이선스 없음 / 미정' },
] as const;

export const FEATURES = [
  { value: 'document', label: '문서 편집' },
  { value: 'ai', label: 'AI 활용' },
  { value: 'study', label: '학습 도구' },
  { value: 'utility', label: '유틸리티' },
  { value: 'game', label: '게임' },
  { value: 'social', label: '소셜 / 커뮤니티' },
  { value: 'media', label: '미디어 / 콘텐츠' },
  { value: 'productivity', label: '생산성' },
  { value: 'dev-tool', label: '개발자 도구' },
  { value: 'other', label: '기타' },
] as const;

export const VISIBILITY = [
  { value: 'public', label: '공개 (Public)' },
  { value: 'private', label: '비공개 (Private)' },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]['value'];
export type Platform = (typeof PLATFORMS)[number]['value'];
export type SourceType = (typeof SOURCE_TYPES)[number]['value'];
export type License = (typeof LICENSES)[number]['value'];
export type Feature = (typeof FEATURES)[number]['value'];
export type Visibility = (typeof VISIBILITY)[number]['value'];

// 허용 이메일 도메인 — middleware/RLS 와 같은 값을 사용해야 함.
export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN ?? 'ts.hs.kr';

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
