import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { saveImage } from './imageStore'

// base64 for the bytes "hello"
const HELLO = Buffer.from('hello').toString('base64')

describe('saveImage', () => {
  it('writes the decoded bytes and returns a path with the right extension', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'imgstore-'))
    const p = saveImage(dir, HELLO, 'image/png')
    expect(p.endsWith('.png')).toBe(true)
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p).toString()).toBe('hello')
  })

  it('maps jpeg and webp media types to extensions', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'imgstore-'))
    expect(saveImage(dir, HELLO, 'image/jpeg').endsWith('.jpg')).toBe(true)
    expect(saveImage(dir, HELLO, 'image/webp').endsWith('.webp')).toBe(true)
  })

  it('uses a stable name for identical content', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'imgstore-'))
    expect(saveImage(dir, HELLO, 'image/png')).toBe(saveImage(dir, HELLO, 'image/png'))
  })
})
