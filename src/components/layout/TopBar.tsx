'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Bell, CheckCircle2, Clock, Info, X, XCircle } from 'lucide-react'
import clsx from 'clsx'

import { getNotificationsPage, markAllNotificationsAsRead, markNotificationAsRead } from '@/app/notificationsActions'
import { getRoleLabel } from '@/lib/roles'
import { announceNotificationsRead, NOTIFICATIONS_READ_EVENT, type NotificationsReadDetail } from '@/lib/notificationEvents'
import type { AppNotification } from '@/types/notifications'
import ThemeToggle from '@/components/theme/ThemeToggle'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/requests': 'Service Requests',
  '/new-request': 'New Request',
  '/calendar': 'Event Calendar',
  '/analytics': 'Analytics',
  '/logs': 'CMAC Request Audit',
  '/admin': 'Admin',
  '/coordinator/pmac': 'PMAC Directory',
  '/coordinator/pmac/officers': 'Officer Assignments',
  '/coordinator/pmac/events': 'PMAC Event Oversight',
  '/coordinator/pmac/polls': 'PMAC Poll Oversight',
  '/coordinator/pmac/activity': 'PMAC Activity Oversight',
  '/coordinator/pmac/reports': 'PMAC Reports',
  '/pmac/members': 'PMAC Members',
  '/pmac/director': 'PMAC Director',
  '/pmac/assistant-director': 'PMAC Assistant Director',
  '/pmac/secretary': 'PMAC Secretary',
  '/pmac/executive': 'PMAC Executive',
  '/pmac/member': 'PMAC Member',
  '/pmac/events': 'PMAC Events',
  '/pmac/events/new': 'New PMAC Event',
  '/pmac/projects': 'Branch Projects',
  '/pmac/projects/calendar': 'Project Calendar',
  '/pmac/polls': 'PMAC Polls',
  '/pmac/polls/new': 'New PMAC Poll',
  '/pmac/calendar': 'PMAC Calendar',
  '/pmac/assignments': 'PMAC Assignments',
  '/pmac/attendance': 'PMAC Attendance',
  '/pmac/activity': 'PMAC Activity',
  '/pmac/reports': 'PMAC Reports',
}


function getNotificationIcon(notification: AppNotification) {
  if (notification.tone === 'danger') {
    return <XCircle size={16} />
  }

  if (notification.tone === 'info') {
    return <Info size={16} />
  }

  if (notification.tone === 'success') {
    return <CheckCircle2 size={16} />
  }

  return <Clock size={16} />
}

export default function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showRecentNotifs, setShowRecentNotifs] = useState(false)
  const [popNotification, setPopNotification] = useState<AppNotification | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [notificationError, setNotificationError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const seenNotificationIdsRef = useRef<Set<string>>(new Set())
  const initializedNotificationsRef = useRef(false)
  const userId = session?.user?.id

  useEffect(() => {
    setNotifications([])
    setUnreadCount(0)
    setPage(1)
    setPopNotification(null)
    seenNotificationIdsRef.current = new Set()
    initializedNotificationsRef.current = false
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    const fetchNotifs = async () => {
      try {
        const result = await getNotificationsPage(page, showRecentNotifs)
        if (!active) return
        const nextNotifications = result.items
        if (initializedNotificationsRef.current && page === 1 && !showRecentNotifs) {
          const incoming = nextNotifications.find(item => !item.isRead && !seenNotificationIdsRef.current.has(item.id))
          if (incoming && !showNotifs) setPopNotification(incoming)
        }
        seenNotificationIdsRef.current = new Set(nextNotifications.map(item => item.id))
        initializedNotificationsRef.current = true
        setNotifications(nextNotifications)
        setUnreadCount(result.unreadCount)
        setTotalPages(result.totalPages)
        setPage(result.page)
        setNotificationError('')
      } catch {
        if (active) setNotificationError('Notifications could not refresh. Please try again.')
      }
    }
    void fetchNotifs()
    const refreshIfVisible = () => { if (document.visibilityState === 'visible') void fetchNotifs() }
    const interval = setInterval(refreshIfVisible, 60000)
    document.addEventListener('visibilitychange', refreshIfVisible)
    window.addEventListener('focus', refreshIfVisible)
    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      window.removeEventListener('focus', refreshIfVisible)
    }
  }, [userId, page, showRecentNotifs, showNotifs, refreshVersion])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowNotifs(false)
    }
    const handleNotificationsRead = (event: Event) => {
      const readIds = new Set((event as CustomEvent<NotificationsReadDetail>).detail?.ids ?? [])
      setNotifications(previous => previous.map(item => readIds.has(item.id) ? { ...item, isRead: true } : item))
      setPopNotification(current => current && readIds.has(current.id) ? null : current)
      setRefreshVersion(value => value + 1)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead)
    }
  }, [])

  useEffect(() => {
    if (!popNotification) return
    const timeout = window.setTimeout(() => setPopNotification(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [popNotification])

  const visibleNotifs = notifications.filter(item => !item.isRead)
  const displayedNotifs = showRecentNotifs ? notifications : visibleNotifs
  const hasHighPriorityNotification = visibleNotifs.some(item => item.priority === 'critical' || item.priority === 'high')

  const saveRead = async (notification: AppNotification) => {
    try {
      const result = await markNotificationAsRead(notification.id, notification.module)
      if (!result.success) throw new Error(result.error)
      announceNotificationsRead([notification.id])
      return true
    } catch {
      setNotificationError('Could not mark the notification read. Please try again.')
      return false
    }
  }

  const handleDismiss = (event: ReactMouseEvent, id: string) => {
    event.preventDefault()
    event.stopPropagation()
    const notification = notifications.find(item => item.id === id) ?? (popNotification?.id === id ? popNotification : null)
    if (notification) void saveRead(notification)
  }

  const handleNotifClick = async (notification: AppNotification) => {
    await saveRead(notification)
    setPopNotification(null)
    setShowNotifs(false)
    router.push(notification.href)
  }

  const pageTitle = PAGE_TITLES[pathname]
    ?? (pathname.startsWith('/pmac/events/')
      ? 'PMAC Event Workspace'
      : pathname.startsWith('/pmac/polls/')
        ? 'PMAC Poll Workspace'
        : 'ICT CMAC')

  return (
    <header className="app-topbar flex h-20 flex-shrink-0 items-center justify-between gap-3 border-b border-emerald-100/50 bg-white/80 px-4 shadow-sm backdrop-blur-md sm:px-6 lg:px-10 z-20 print:hidden">
      <h1 className="min-w-0 truncate font-display text-base text-[var(--text-dark)] font-extrabold uppercase tracking-tight sm:text-xl">
        {pathname === '/' ? 'Dashboard Overview' : pageTitle}
      </h1>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
        {notificationError ? <button type="button" role="alert" onClick={() => setRefreshVersion(value => value + 1)} className="max-w-48 text-xs text-red-600">{notificationError}</button> : null}
        <ThemeToggle />
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
            className={clsx(
              'relative p-2.5 rounded-2xl transition-all duration-300',
              showNotifs ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50',
              unreadCount ? 'shadow-sm ring-1 ring-emerald-100' : '',
              hasHighPriorityNotification ? 'text-amber-600 ring-amber-200' : ''
            )}
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className={clsx(
                'absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 px-1 text-[10px] font-black text-white shadow-sm',
                hasHighPriorityNotification && 'motion-safe:animate-pulse'
              )}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-3 w-84 bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden animate-fade-in z-50" style={{ width: '340px' }}>
              <div className="p-5 border-b border-emerald-50 bg-emerald-50/20 flex items-center justify-between">
                <h3 className="font-black text-[10px] text-emerald-800 uppercase tracking-[0.2em]">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const result = await markAllNotificationsAsRead()
                        if (!result.success) throw new Error(result.error)
                        setPopNotification(null)
                        setUnreadCount(0)
                        announceNotificationsRead(visibleNotifs.map(item => item.id))
                      } catch {
                        setNotificationError('Could not mark notifications read. Please try again.')
                      }
                    }}
                    className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {displayedNotifs.length > 0 ? (
                  displayedNotifs.map((notification) => (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotifClick(notification)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleNotifClick(notification)
                        }
                      }}
                      className={clsx(
                        'group flex w-full cursor-pointer items-start gap-3 border-b border-emerald-50/50 p-4 text-left transition-colors hover:bg-emerald-50/50',
                        notification.isRead && 'opacity-70',
                      )}
                    >
                      <div className={clsx(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        notification.tone === 'success' ? 'bg-emerald-100 text-emerald-600'
                        : notification.tone === 'info' ? 'bg-sky-100 text-sky-600'
                        : notification.tone === 'danger' ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-600'
                      )}>
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="line-clamp-1 text-xs font-bold text-slate-800 transition-colors group-hover:text-emerald-700">{notification.title}</p>
                          {!notification.isRead ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /> : null}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{notification.description}</p>
                      </div>
                      <button
                        onClick={(event) => handleDismiss(event, notification.id)}
                        aria-label="Mark notification read"
                        className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      {showRecentNotifs ? 'No recent notifications' : 'No new notifications'}
                    </p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setPage(1); setShowRecentNotifs(current => !current) }}
                className="block w-full p-4 text-center text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-colors hover:bg-emerald-50"
              >
                {showRecentNotifs ? 'Show Unread Only' : 'View Recent Notifications'}
              </button>
              {totalPages > 1 ? (
                <nav aria-label="Notification pages" className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="disabled:opacity-40">Previous</button>
                  <span>{page} / {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className="disabled:opacity-40">Next</button>
                </nav>
              ) : null}
            </div>
          )}

          {popNotification && !showNotifs ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleNotifClick(popNotification)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleNotifClick(popNotification)
                }
              }}
              className="absolute right-0 top-14 z-50 w-80 rounded-3xl border border-emerald-100 bg-white p-4 text-left shadow-2xl ring-1 ring-emerald-100 animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                  popNotification.tone === 'success' ? 'bg-emerald-100 text-emerald-600'
                  : popNotification.tone === 'info' ? 'bg-sky-100 text-sky-600'
                  : popNotification.tone === 'danger' ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
                )}>
                  {getNotificationIcon(popNotification)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">New notification</p>
                  <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-800">{popNotification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{popNotification.description}</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => handleDismiss(event, popNotification.id)}
                  className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden h-10 w-px bg-emerald-100/50 sm:block"></div>
        <Link href="/profile" className="flex items-center gap-4 group cursor-pointer" onClick={() => setShowNotifs(false)}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[var(--text-dark)] leading-none group-hover:text-emerald-700 transition-colors">{session?.user?.name || 'User Name'}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1.5 flex items-center justify-end gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
              {getRoleLabel(session?.user?.role)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300 dark:from-[#5eead4] dark:to-[#2dd4bf] dark:text-[var(--sidebar)]">
            {session?.user?.name?.[0] || 'U'}
          </div>
        </Link>
      </div>
    </header>
  )
}
