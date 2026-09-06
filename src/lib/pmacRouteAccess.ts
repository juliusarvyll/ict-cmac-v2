export function canCoordinatorAccessPmacPath(path: string) {
  return path.startsWith('/pmac/projects') || path.startsWith('/pmac/polls')
}
