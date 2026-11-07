import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveActive } from './nav-active.ts'

test('resolveActive', () => {
  assert.equal(resolveActive('/projects/new'), '/projects/new')
  assert.equal(resolveActive('/projects/abc/edit'), '/projects/new')
  assert.equal(resolveActive('/projects/abc/poster'), '/projects/new')
  assert.equal(resolveActive('/projects/abc/poster/def'), '/projects/new')
  assert.equal(resolveActive('/posters/start'), '/projects/new')
  assert.equal(resolveActive('/projects/abc'), '/explore')
  assert.equal(resolveActive('/explore'), '/explore')
  assert.equal(resolveActive('/developers/x'), '/explore')
  assert.equal(resolveActive('/haejwo/1'), '/tips')
  assert.equal(resolveActive('/domains'), '/domains')
  assert.equal(resolveActive('/guide/web'), '/guide')
  assert.equal(resolveActive('/'), '')
})
