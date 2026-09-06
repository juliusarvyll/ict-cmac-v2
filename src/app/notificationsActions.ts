'use server'

import { getAuthenticatedSession } from '@/lib/security'


import { getCompleteNotificationFeed, getNotificationFeed, getNotificationPage, markNotificationRead, markNotificationsRead } from "@/lib/notifications"

export async function getNotificationsPage(page = 1, includeRead = false) {
  const session = await getAuthenticatedSession()
  if (!session) throw new Error('Please sign in again to load notifications.')
  return getNotificationPage(session.user, page, includeRead)
}

export async function getNotifications() {
  const session = await getAuthenticatedSession()
  if (!session || !session.user) return []

  try {
    return await getNotificationFeed(session.user, 8)
  } catch (error) {
    console.error('GET_NOTIFICATIONS_ERROR:', error)
    return []
  }
}

export async function markNotificationAsRead(notificationId: string, module: 'CORE' | 'PMAC') {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.' }
  }

  try {
    await markNotificationRead(session.user.id, notificationId, module)
    return { success: true }
  } catch (error) {
    console.error('MARK_NOTIFICATION_READ_ERROR:', error)
    return { success: false, error: 'Unable to save notification read state.' }
  }
}

export async function markAllNotificationsAsRead(notifications?: Array<{ id: string; module: 'CORE' | 'PMAC' }>) {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required.' }
  }

  try {
    const targets = notifications ?? (await getCompleteNotificationFeed(session.user)).filter(item => !item.isRead)
    await markNotificationsRead(session.user.id, targets)
    return { success: true }
  } catch (error) {
    console.error('MARK_ALL_NOTIFICATIONS_READ_ERROR:', error)
    return { success: false, error: 'Unable to save notification read state.' }
  }
}
