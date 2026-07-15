'use client'

import { useEffect, useId, useState } from 'react'
import { Bell, X, BookOpen, BookMarked, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markAllNotificationsRead } from '@/app/actions/notifications'
import type { Notification, NotificationType } from '@/lib/types/database'
import Link from 'next/link'

interface NotificationBellProps {
  userId: string
  initialUnreadCount: number
}

function notifIcon(type: NotificationType) {
  if (type === 'lesson_plan_submitted' || type === 'lesson_plan_approved') {
    return <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
  }
  if (type === 'black_book_serious') {
    return <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
  }
  return <BookMarked className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
}

function notifLink(n: Notification): string {
  const data = n.data as Record<string, string>
  if (data.lesson_plan_id) return `/lesson-plans/${data.lesson_plan_id}`
  if (data.black_book_entry_id) return `/black-book/${data.black_book_entry_id}`
  return '/dashboard'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell({ userId, initialUnreadCount }: NotificationBellProps) {
  const instanceId = useId().replace(/:/g, '')
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [panelOpen, setPanelOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notif-bell-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => setUnreadCount((prev) => prev + 1)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function openPanel() {
    setPanelOpen(true)
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications((data ?? []) as Notification[])
    setLoading(false)
    // Mark all as read
    if (unreadCount > 0) {
      setUnreadCount(0)
      await markAllNotificationsRead()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={panelOpen ? () => setPanelOpen(false) : openPanel}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setPanelOpen(false)} />
          {/* Panel — drops down, clamped to viewport on the right */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={notifLink(n)}
                    onClick={() => setPanelOpen(false)}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read_at ? 'bg-blue-50/50' : ''}`}
                  >
                    {notifIcon(n.type)}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
