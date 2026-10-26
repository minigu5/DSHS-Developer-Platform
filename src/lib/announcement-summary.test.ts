import { test } from 'node:test'
import assert from 'node:assert/strict'
import { announcementSummary } from './announcement-summary.ts'

test('첫 문단의 강조·링크·이미지를 평문으로', () => {
  assert.equal(
    announcementSummary('**베타** 테스터를 [여기](https://x.dev)에서 모아요 ![](a.png)\n\n둘째 문단'),
    '베타 테스터를 여기에서 모아요',
  )
})

test('제목·구분선·코드 블록·이미지만 있는 문단은 건너뜀', () => {
  assert.equal(announcementSummary('## 안내\n\n---\n\n```js\nx()\n```\n\n![](a.png)\n\n본문이에요'), '본문이에요')
})

test('제목 바로 아래 줄은 같은 문단이어도 본문으로', () => {
  assert.equal(announcementSummary('# 업데이트\n새 기능이 나왔어요'), '새 기능이 나왔어요')
})

test('밑줄·물결이 들어간 단어는 그대로', () => {
  assert.equal(announcementSummary('readme_sync 값을 ~3일 안에 켜요'), 'readme_sync 값을 ~3일 안에 켜요')
  assert.equal(announcementSummary('`site_url` 을 _꼭_ 바꿔요'), 'site_url 을 꼭 바꿔요')
})

test('목록·인용 기호 제거, 최대 길이', () => {
  assert.equal(announcementSummary('- 하나\n- 둘\n> 인용'), '하나 둘 인용')
  assert.equal(announcementSummary('가'.repeat(200)).length, 120)
})

test('내용이 없으면 빈 문자열', () => {
  assert.equal(announcementSummary(''), '')
  assert.equal(announcementSummary('## 제목만'), '')
})
