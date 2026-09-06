import { describe, expect, it } from 'vitest'
import { resolvePmacAttachmentPath } from './pmacAttachmentStorage'
describe('attachment storage boundaries', () => {
  it.each(['/uploads/pmac/../secret.pdf', '/private/uploads/pmac/2026-07/../../secret.pdf', 'C:\\secret.pdf', '/uploads/other/file.pdf'])('rejects %s', (value) => {
    expect(() => resolvePmacAttachmentPath(value)).toThrow('Invalid attachment storage path')
  })
  it('supports private and legacy roots without moving historical files', () => {
    expect(resolvePmacAttachmentPath('/private/uploads/pmac/2026-07/abc.pdf')).toContain('private')
    expect(resolvePmacAttachmentPath('/uploads/pmac/2026-07/abc.pdf')).toContain('public')
  })
})
