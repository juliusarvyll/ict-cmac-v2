// A supplied link is delivery evidence, not proof of recipient access. Do not
// fetch user-provided URLs on the server: that would introduce an SSRF surface.
export function getPmacDeliveryLink(outputs: string | null | undefined): string | null {
  for (const candidate of outputs?.match(/https?:\/\/[^\s<>"']+/gi) ?? []) {
    try {
      const url = new URL(candidate.replace(/[.,;)]+$/, ''))
      const host = url.hostname.toLowerCase()
      if (url.username || url.password || !host.includes('.') || host === 'localhost'
        || host.endsWith('.localhost') || host.endsWith('.local')
        || /^\d+\.\d+\.\d+\.\d+$/.test(host)) continue
      return url.href
    } catch { /* Keep looking for a valid link. */ }
  }
  return null
}
