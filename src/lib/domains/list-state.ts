/**
 * 도메인 목록 한 줄을 열 수 없는 경우(방문 주소가 없어 새 주소를 받을 수 없는 프로젝트).
 * 이미 주소가 살아 있는 줄은 방문 주소가 비어 있어도(대곽나루 서버에 붙인 뒤 비운 경우 등) 관리할 수 있어야 한다.
 */
export function rowDisabled(input: { url: string | null | undefined; naruServerId: string | null | undefined; live: boolean }): boolean {
  if (input.live) return false
  return !input.url && !input.naruServerId
}
