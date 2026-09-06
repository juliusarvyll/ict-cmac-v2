import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('deployment safety', () => {
  it('builds without changing the database schema or seeding application data', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
    const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(vercel.buildCommand).toBe('npm run build')
    expect(scripts.build).toBe('prisma generate && next build')
    expect(scripts.postinstall).toBe('prisma generate')
  })
})
