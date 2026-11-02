/**
 * 도메인 목록 한 줄을 열 수 없는 경우(방문 주소가 없어 새 주소를 받을 수 없는 프로젝트).
 * 이미 주소가 살아 있는 줄은 방문 주소가 비어 있어도(대곽나루 서버에 붙인 뒤 비운 경우 등) 관리할 수 있어야 한다.
 */
export function rowDisabled(input: { url: string | null | undefined; naruServerId: string | null | undefined; live: boolean }): boolean {
  if (input.live) return false
  return !input.url && !input.naruServerId
}

/**
 * `/domains?naru=` 로 들어왔을 때 목록 위 안내 종류.
 * none: ?naru= 없음 / no-project: 웹사이트 프로젝트 없음 / limit: 주소를 이미 한도(max)만큼 씀(새 프로젝트를 만들어도 못 받음) /
 * new-project: 한도 안인데 주소를 받을 수 있는 프로젝트가 없음 / pick: 고를 프로젝트가 있음
 */
export type NaruGuideKind = 'none' | 'no-project' | 'limit' | 'new-project' | 'pick'

export function naruGuideKind(input: { naruServerId: string | null; rowCount: number; candidates: number; used: number; max: number }): NaruGuideKind {
  if (input.naruServerId === null) return 'none'
  if (input.rowCount === 0) return 'no-project'
  if (input.candidates === 0) return input.used >= input.max ? 'limit' : 'new-project'
  return 'pick'
}
