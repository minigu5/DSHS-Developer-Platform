import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixOldAddresses, oldAddressPrefixes } from './old-address.ts'

test('옛 주소 후보: 사이트 원래 주소·바꾸기 전 주소·바로가기 target', () => {
  assert.deepEqual(
    oldAddressPrefixes({ name: 'labtime', host: 'firebase', target: 'labflow-hackathon-1025.web.app', siteUrl: 'https://labflow-hackathon-1025.web.app/', previousUrl: 'https://labflow-hackathon-1025.web.app/' }),
    ['labflow-hackathon-1025.web.app'],
  )
  // GitHub Pages 는 경로까지, target(내아이디.github.io)은 안 넣는다. 해시는 뗀다
  assert.deepEqual(
    oldAddressPrefixes({ name: 'despacito', host: 'github-pages', target: 'matwaetle.github.io', siteUrl: 'https://matwaetle.github.io/satisfying-specimens/', previousUrl: 'https://matwaetle.github.io/satisfying-specimens/#/' }),
    ['matwaetle.github.io/satisfying-specimens'],
  )
  // Vercel target 은 CNAME 값이라 안 넣는다. 옛 행은 site_url 이 없을 수 있다
  assert.deepEqual(
    oldAddressPrefixes({ name: 'hwip', host: 'vercel', target: 'ec9b28a1abbf2940.vercel-dns-017.com', siteUrl: null, previousUrl: 'https://hwip.vercel.app/' }),
    ['hwip.vercel.app'],
  )
  // dshs.dev 주소·이상한 값은 빼고, 긴 것부터
  assert.deepEqual(
    oldAddressPrefixes({ name: 'a', host: 'netlify', target: null, siteUrl: 'https://octo.netlify.app/', previousUrl: 'https://a.dshs.dev' }),
    ['octo.netlify.app'],
  )
  assert.deepEqual(
    oldAddressPrefixes({ name: 'a', host: null, target: null, siteUrl: 'not a url', previousUrl: 'javascript:alert(1)' }),
    [],
  )
})

test('설명 속 옛 주소를 새 주소로 바꾸고 바뀌는 줄을 돌려준다', () => {
  const r = fixOldAddresses('# LabTime\n\n접속 주소: https://labflow-hackathon-1025.web.app\n\n설명', ['labflow-hackathon-1025.web.app'], 'labtime')
  assert.equal(r.text, '# LabTime\n\n접속 주소: https://labtime.dshs.dev\n\n설명')
  assert.equal(r.count, 1)
  assert.deepEqual(r.lines, [{ before: '접속 주소: https://labflow-hackathon-1025.web.app', after: '접속 주소: https://labtime.dshs.dev' }])
})

test('경로·해시·마크다운 링크·스킴 없는 주소', () => {
  const p = ['matwaetle.github.io/satisfying-specimens']
  assert.equal(
    fixOldAddresses('[사이트](https://matwaetle.github.io/satisfying-specimens/#/play) http://MATWAETLE.github.io/satisfying-specimens', p, 'despacito').text,
    '[사이트](https://despacito.dshs.dev/#/play) https://despacito.dshs.dev',
  )
  assert.equal(fixOldAddresses('주소는 `site.web.app` 이에요', ['site.web.app'], 'x').text, '주소는 `x.dshs.dev` 이에요')
  const both = fixOldAddresses('[https://site.web.app](https://site.web.app/)', ['site.web.app'], 'x')
  assert.equal(both.text, '[https://x.dshs.dev](https://x.dshs.dev/)')
  assert.equal(both.count, 2)
})

test('다른 주소의 일부는 건드리지 않는다', () => {
  const p = ['site.web.app']
  for (const s of ['https://my-site.web.app', 'https://a.site.web.app', 'https://site.web.app.evil.com', 'https://site.web.apps', 'https://x.com/site.web.app', 'me@site.web.app']) {
    assert.equal(fixOldAddresses(s, p, 'x').count, 0, s)
  }
  assert.equal(fixOldAddresses('https://octo.github.io/satisfying-specimens2', ['octo.github.io/satisfying-specimens'], 'x').count, 0)
  // 문장 끝 마침표는 주소가 아니다
  assert.equal(fixOldAddresses('여기: https://site.web.app.', p, 'x').text, '여기: https://x.dshs.dev.')
})

test('옛 주소가 없으면 그대로', () => {
  assert.deepEqual(fixOldAddresses('설명', ['site.web.app'], 'x'), { text: '설명', count: 0, lines: [] })
  assert.deepEqual(fixOldAddresses('https://site.web.app', [], 'x'), { text: 'https://site.web.app', count: 0, lines: [] })
})
