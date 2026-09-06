import path from 'path'

export const PMAC_UPLOAD_ROOT = path.join(process.cwd(), 'private', 'uploads', 'pmac')

export function resolvePmacAttachmentPath(filePath: string) {
  const match = /^\/(private\/)?uploads\/pmac\/(\d{4}-\d{2})\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/.exec(filePath)
  if (!match) throw new Error('Invalid attachment storage path.')
  const root = match[1] ? PMAC_UPLOAD_ROOT : path.join(process.cwd(), 'public', 'uploads', 'pmac')
  return path.join(root, match[2], match[3])
}
