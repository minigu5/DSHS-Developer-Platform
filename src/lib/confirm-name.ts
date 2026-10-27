/** 되돌리기 어려운 작업 확인 — 앞뒤 공백만 무시하고 프로젝트 이름을 똑같이 적었는지. 화면과 서버 액션이 같이 쓴다. */
export function nameMatches(typed: string, name: string): boolean {
  return name.trim() !== "" && typed.trim() === name.trim();
}
