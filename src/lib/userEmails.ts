/**
 * USER_EMAIL_MAP
 * 
 * 이 파일은 학교 구성원의 실명-이메일 매핑을 관리합니다.
 * 보안을 위해 실제 데이터는 'userEmails.private.ts'에 저장하며, Git에 포함되지 않습니다.
 * 빌드 시 해당 파일이 없으면 빈 객체를 기본값으로 사용합니다.
 */

let MAPPED_DATA: Record<string, string> = {};

try {
  // 로컬 개발 환경에서 private 파일이 있으면 로드
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const privateModule = require("./userEmails.private");
  MAPPED_DATA = privateModule.USER_EMAIL_MAP || {};
} catch {
  // Vercel 빌드 환경 등 private 파일이 없는 경우 빈 객체 유지
  MAPPED_DATA = {};
}

export const USER_EMAIL_MAP = MAPPED_DATA;
