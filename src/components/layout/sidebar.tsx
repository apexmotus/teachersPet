'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'
import {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  BookOpen,
  Users,
  LogOut,
  UserCircle,
  School,
  CalendarDays,
  BookMarked,
  Users2,
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard, roles: null },
  { href: '/timetable',     label: 'Timetable',       icon: CalendarDays,    roles: null },
  { href: '/attendance',    label: 'Class Register',  icon: ClipboardList,   roles: null },
  { href: '/announcements', label: 'Announcements',   icon: Megaphone,       roles: null },
  { href: '/lesson-plans',  label: 'Lesson Plans',    icon: BookOpen,        roles: null },
  { href: '/black-book',    label: 'Black Book',      icon: BookMarked,      roles: null },
  { href: '/learners',      label: 'Learners',        icon: Users,           roles: null },
  { href: '/classes',       label: 'Classes',         icon: School,          roles: ['dh','dp','principal'] },
  { href: '/staff',         label: 'Staff',           icon: Users2,          roles: ['dh','dp','principal'] },
]

const ROLE_LABELS: Record<string, string> = {
  teacher:   'Teacher',
  dh:        'Dept. Head',
  dp:        'Deputy Principal',
  principal: 'Principal',
}

export function Sidebar({
  profile,
  unreadCount,
  mobileOpen = false,
  onClose,
}: {
  profile: Profile
  unreadCount: number
  mobileOpen?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick() {
    onClose?.()
  }

  return (
    <aside
      className={`fixed lg:relative z-30 flex flex-col w-64 h-full bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm">
          🐾
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Teacher&apos;s PET</p>
          <p className="text-[10px] text-white/50">Innobuntu Group</p>
        </div>
      </div>

      {/* Profile chip + notification bell (bell hidden on mobile — shown in top bar instead) */}
      <div className="flex items-center border-b border-sidebar-border">
        <Link href="/profile" onClick={handleNavClick} className="flex-1 block px-4 py-4 hover:bg-sidebar-accent transition-colors min-w-0">
          <div className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-white/50 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {profile.name} {profile.surname}
              </p>
              <p className="text-xs text-white/50">{ROLE_LABELS[profile.role] ?? profile.role}</p>
            </div>
          </div>
        </Link>
        <div className="px-3 hidden lg:block">
          <NotificationBell userId={profile.id} initialUnreadCount={unreadCount} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.filter(({ roles }) => !roles || roles.includes(profile.role)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => { onClose?.(); signOut() }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
