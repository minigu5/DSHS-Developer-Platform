// 프로젝트 체크리스트 옵션. 게시 폼 / 필터링에서 공통으로 import.
// 값 추가 시 RLS / DB constraint 와 함께 검토할 것.

export const PROJECT_TYPES = [
  { value: 'website', label: '웹사이트' },
  { value: 'app', label: '응용프로그램(App)' },
  { value: 'extension', label: '확장프로그램' },
  { value: 'cli', label: 'CLI / 스크립트' },
  { value: 'library', label: '라이브러리 / 패키지' },
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

export const LICENSE_FEATURES = [
  { value: 'commercial', label: '상업적 이용' },
  { value: 'modify', label: '수정' },
  { value: 'distribute', label: '배포' },
  { value: 'private', label: '개인적 이용' },
  { value: 'liability', label: '법적 책임' },
  { value: 'warranty', label: '보증' },
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
export type LicenseFeature = (typeof LICENSE_FEATURES)[number]['value'];
export type Feature = (typeof FEATURES)[number]['value'];
export type Visibility = (typeof VISIBILITY)[number]['value'];

export const INTERESTS = [
  { value: 'math', label: '수학' },
  { value: 'physics', label: '물리' },
  { value: 'chemistry', label: '화학' },
  { value: 'biology', label: '생명과학' },
  { value: 'earth-science', label: '지구과학' },
  { value: 'informatics', label: '정보 / 알고리즘' },
  { value: 'web', label: '웹 개발' },
  { value: 'app', label: '앱 개발' },
  { value: 'ai', label: '인공지능' },
  { value: 'game', label: '게임 개발' },
  { value: 'robotics', label: '로보틱스 / HW' },
  { value: 'security', label: '보안' },
  { value: 'design', label: '디자인 / UIUX' },
] as const;

export type Interest = (typeof INTERESTS)[number]['value'];

// 허용 이메일 도메인 — middleware/RLS 와 같은 값을 사용해야 함.
export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN ?? 'ts.hs.kr';

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
