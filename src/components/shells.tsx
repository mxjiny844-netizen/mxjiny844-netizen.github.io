// 앱 셸 — 거래처(모바일 Bottom Nav) / 직원(PC Sidebar)
import { type ReactNode, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, ClipboardList, PlusCircle, Menu as MenuIcon, Bell, LogOut,
  LayoutDashboard, Inbox, Search, BarChart3, Settings, Wrench,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { myNotifications } from '@/lib/api'
import { cn } from '@/lib/utils'
import { isLocalMode } from '@/lib/db'

function useUnread() {
  const { session } = useAuth()
  const [count, setCount] = useState(0)
  const loc = useLocation()
  useEffect(() => {
    if (!session) return
    myNotifications(session).then(ns => setCount(ns.filter(n => !n.read).length)).catch(() => {})
  }, [session, loc.pathname])
  return count
}

function BellButton({ to }: { to: string }) {
  const unread = useUnread()
  return (
    <Link to={to} className="relative rounded-full p-2 hover:bg-slate-100" aria-label="알림">
      <Bell className="h-5 w-5 text-slate-600" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}

function ModeTag() {
  if (!isLocalMode()) return null
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">데모</span>
  )
}

// ---------- 거래처 모바일 셸 ----------
export function MobileShell({ children, title }: { children: ReactNode; title?: string }) {
  const { session, signOut } = useAuth()
  const nav = useNavigate()
  const items = [
    { to: '/', icon: Home, label: '홈' },
    { to: '/inquiry', icon: PlusCircle, label: '문의하기' },
    { to: '/tickets', icon: ClipboardList, label: '내 문의' },
    { to: '/more', icon: MenuIcon, label: '더보기' },
  ]
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-eiden-navy" />
          <span className="font-bold text-slate-900">{title ?? 'EIDEN Partner'}</span>
          <ModeTag />
        </div>
        <div className="flex items-center gap-1">
          <BellButton to="/notifications" />
          <button
            onClick={async () => { await signOut(); nav('/login') }}
            className="rounded-full p-2 hover:bg-slate-100" aria-label="로그아웃">
            <LogOut className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      {session && (
        <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
          <div className="grid grid-cols-4">
            {items.map(it => (
              <NavLink key={it.to} to={it.to} end={it.to === '/'}
                className={({ isActive }) => cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs',
                  isActive ? 'font-semibold text-eiden-navy' : 'text-slate-500',
                )}>
                <it.icon className="h-5 w-5" />
                {it.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

// ---------- 직원 PC 셸 (좌측 Sidebar) ----------
export function StaffShell({ children, title }: { children: ReactNode; title?: string }) {
  const { session, signOut, hasRole } = useAuth()
  const nav = useNavigate()
  const menu = [
    { to: '/staff', icon: LayoutDashboard, label: '대시보드', end: true },
    { to: '/staff/tickets', icon: Inbox, label: '문의함' },
    { to: '/staff/search', icon: Search, label: '통합검색' },
    { to: '/staff/stats', icon: BarChart3, label: '통계' },
    ...(hasRole('ROLE_ADMIN') ? [{ to: '/staff/admin', icon: Settings, label: '관리자' }] : []),
  ]
  return (
    <div className="flex min-h-dvh bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Wrench className="h-6 w-6 text-eiden-navy" />
          <div>
            <p className="font-bold leading-tight text-slate-900">EIDEN Partner</p>
            <p className="text-xs text-slate-400">직원용 <ModeTag /></p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {menu.map(m => (
            <NavLink key={m.to} to={m.to} end={m.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                isActive ? 'bg-eiden-navy/10 text-eiden-navy' : 'text-slate-600 hover:bg-slate-50',
              )}>
              <m.icon className="h-4 w-4" />
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-800">
            {session?.employee?.name} {session?.employee?.title}
          </p>
          <p className="text-xs text-slate-400">{session?.email}</p>
          <button onClick={async () => { await signOut(); nav('/login') }}
            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600">
            <LogOut className="h-3.5 w-3.5" /> 로그아웃
          </button>
        </div>
      </aside>
      <div className="ml-60 flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <h1 className="text-lg font-bold text-slate-900">{title ?? ''}</h1>
          <BellButton to="/staff/notifications" />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
