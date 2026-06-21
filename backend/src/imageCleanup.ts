import { unlinkSync } from 'fs'
import type { UsageStore } from './usage'

const DAY = 24 * 60 * 60 * 1000

export function runImageCleanup(
  store: UsageStore,
  retentionDays: number,
  now: number
): { removed: number } {
  const cutoff = now - retentionDays * DAY
  const paths = store.expireImages(cutoff)
  let removed = 0
  for (const p of paths) {
    try {
      unlinkSync(p)
      removed++
    } catch {
      // file may already be gone; ignore
    }
  }
  return { removed }
}
