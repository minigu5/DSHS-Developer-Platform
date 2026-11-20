import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasActiveSvgContent } from './svg-safety.ts'

test('평범한 아이콘 SVG 는 통과', () => {
  assert.equal(hasActiveSvgContent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#fff"/></svg>'), false)
})

test('스크립트·이벤트 속성·javascript: 링크·foreignObject 는 거절', () => {
  for (const bad of [
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><a href="javascript:alert(1)"><rect/></a></svg>',
    '<svg><foreignObject><div/></foreignObject></svg>',
    '<svg><SCRIPT>x</SCRIPT></svg>',
    '<svg ONLOAD = "x"></svg>',
  ]) assert.equal(hasActiveSvgContent(bad), true, bad)
})
