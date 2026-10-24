import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  README_MAX_CHARS,
  decodeBase64Utf8,
  isSupportedReadmeName,
  parseGithubRepo,
  prepareReadme,
} from './github-readme.ts'

const repo = { owner: 'octo', repo: 'demo' }

test('parseGithubRepo: 여러 형태의 주소를 받는다', () => {
  assert.deepEqual(parseGithubRepo('https://github.com/octo/demo'), repo)
  assert.deepEqual(parseGithubRepo('github.com/octo/demo.git'), repo)
  assert.deepEqual(parseGithubRepo('  https://www.github.com/octo/demo/tree/main/docs  '), repo)
  assert.deepEqual(parseGithubRepo('http://github.com/octo/demo/'), repo)
})

test('parseGithubRepo: GitHub 이 아니거나 모자라면 null', () => {
  assert.equal(parseGithubRepo(''), null)
  assert.equal(parseGithubRepo('https://github.com/octo'), null)
  assert.equal(parseGithubRepo('https://gitlab.com/octo/demo'), null)
  assert.equal(parseGithubRepo('https://github.com.evil.com/octo/demo'), null)
  assert.equal(parseGithubRepo('https://github.com/octo/..'), null)
  assert.equal(parseGithubRepo('ftp://github.com/octo/demo'), null)
  assert.equal(parseGithubRepo('not a url'), null)
})

test('decodeBase64Utf8: 한글을 깨뜨리지 않는다', () => {
  const b64 = Buffer.from('# 안녕하세요\n', 'utf8').toString('base64')
  assert.equal(decodeBase64Utf8(b64.replace(/(.{8})/g, '$1\n')), '# 안녕하세요\n')
})

test('prepareReadme: 상대 이미지·링크를 절대 주소로', () => {
  const out = prepareReadme('![로고](./docs/logo.png)\n[가이드](docs/guide.md) [외부](https://a.com) [앵커](#top)', repo, 'README.md')
  assert.equal(
    out.markdown,
    '![로고](https://raw.githubusercontent.com/octo/demo/HEAD/docs/logo.png)\n' +
      '[가이드](https://github.com/octo/demo/blob/HEAD/docs/guide.md) [외부](https://a.com) [앵커](#top)',
  )
})

test('prepareReadme: README 가 하위 폴더에 있으면 그 폴더 기준, 슬래시 시작은 저장소 루트 기준', () => {
  const out = prepareReadme('![a](img/a.png) ![b](../b.png) ![c](/c.png)', repo, 'docs/README.md')
  assert.equal(
    out.markdown,
    '![a](https://raw.githubusercontent.com/octo/demo/HEAD/docs/img/a.png) ' +
      '![b](https://raw.githubusercontent.com/octo/demo/HEAD/b.png) ' +
      '![c](https://raw.githubusercontent.com/octo/demo/HEAD/c.png)',
  )
})

test('prepareReadme: 링크로 감싼 이미지(배지)도 둘 다 처리', () => {
  const out = prepareReadme('[![빌드](badge.svg)](https://ci.example.com)', repo, 'README.md')
  assert.equal(out.markdown, '[![빌드](https://raw.githubusercontent.com/octo/demo/HEAD/badge.svg)](https://ci.example.com)')
})

test('prepareReadme: HTML img·a·h1·br 을 마크다운으로', () => {
  const html = [
    '<!-- 주석 -->',
    '<h1 align="center">데모</h1>',
    '<p align="center"><a href="https://demo.dev"><img src="logo.png" alt="로고" width="120"></a></p>',
    '첫 줄<br>둘째 줄',
  ].join('\n')
  const out = prepareReadme(html, repo, 'README.md')
  assert.match(out.markdown, /^# 데모/)
  assert.match(out.markdown, /\[!\[로고\]\(https:\/\/raw\.githubusercontent\.com\/octo\/demo\/HEAD\/logo\.png\)\]\(https:\/\/demo\.dev\)/)
  assert.match(out.markdown, /첫 줄\n둘째 줄/)
  assert.doesNotMatch(out.markdown, /<|주석/)
})

test('prepareReadme: 코드 블록·인라인 코드는 그대로', () => {
  const md = '```html\n<div><img src="a.png"></div>\n```\n\n`<p>` 와 `![x](y.png)` 는 그대로'
  assert.equal(prepareReadme(md, repo, 'README.md').markdown, md)
})

test('prepareReadme: 꺾쇠 자동 링크와 제네릭 표기는 지우지 않는다', () => {
  const md = '문의: <https://example.com> 와 Array<string>'
  assert.equal(prepareReadme(md, repo, 'README.md').markdown, md)
})

test('prepareReadme: 너무 길면 줄 단위로 자르고 truncated', () => {
  const line = 'a'.repeat(99) + '\n'
  const out = prepareReadme(line.repeat(500), repo, 'README.md')
  assert.equal(out.truncated, true)
  assert.ok(out.markdown.length <= README_MAX_CHARS)
  assert.ok(!out.markdown.endsWith('\n'))
})

test('isSupportedReadmeName', () => {
  assert.equal(isSupportedReadmeName('README.md'), true)
  assert.equal(isSupportedReadmeName('README'), true)
  assert.equal(isSupportedReadmeName('README.markdown'), true)
  assert.equal(isSupportedReadmeName('README.rst'), false)
})
