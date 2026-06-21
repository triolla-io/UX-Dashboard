import { mkdirSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import path from 'path'

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export function saveImage(dir: string, base64: string, mediaType: string): string {
  mkdirSync(dir, { recursive: true })
  const ext = EXT[mediaType] ?? 'bin'
  const name = createHash('sha256').update(base64).digest('hex').slice(0, 32)
  const filePath = path.resolve(dir, `${name}.${ext}`)
  writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return filePath
}
