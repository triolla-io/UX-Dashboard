import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { createUsageStore } from './usage'
import { runImageCleanup } from './imageCleanup'

const DAY = 24 * 60 * 60 * 1000

describe('runImageCleanup', () => {
  it('deletes files older than retention and leaves recent ones', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'cleanup-'))
    const oldFile = path.join(dir, 'old.png')
    const newFile = path.join(dir, 'new.png')
    writeFileSync(oldFile, 'x')
    writeFileSync(newFile, 'y')

    const store = createUsageStore(':memory:')
    const now = 100 * DAY
    store.record({ ip: 'a', at: now - 40 * DAY, imagePath: oldFile })
    store.record({ ip: 'b', at: now - 1 * DAY, imagePath: newFile })

    const result = runImageCleanup(store, 30, now)

    expect(result.removed).toBe(1)
    expect(existsSync(oldFile)).toBe(false)
    expect(existsSync(newFile)).toBe(true)
  })

  it('does not throw when a file is already missing', () => {
    const store = createUsageStore(':memory:')
    const now = 100 * DAY
    store.record({ ip: 'a', at: now - 40 * DAY, imagePath: '/does/not/exist.png' })
    expect(() => runImageCleanup(store, 30, now)).not.toThrow()
  })
})
