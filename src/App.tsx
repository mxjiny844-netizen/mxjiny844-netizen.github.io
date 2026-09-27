// EIDEN Partner — 라우팅 & 권한 가드
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { roleHome } from '@/lib/db'
import type { Role } from '@/lib/types'
import { MobileShell, StaffShell } from '@/components/shells'
import { LoginPage, SignupPage } from '@/pages/auth'
import { HomePage, InquiryMenuPage } from '@/pages/company'
import { NewSalesInquiryPage, NewPartInquiryPage } from '@/pages/inquiry'
import { AsDiagnosePage, NewAsPage } from '@/pages/as'
import { MyTicketsPage, TicketDetailPage } from '@/pages/tickets'
import { BoardPage, MorePage, NotificationsPage } from '@/pages/board'
import { StaffDashboardPage, StaffTicketListPage, StaffTicketDetailPage } from '@/pages/staff'
import { AdminPage } from '@/pages/admin'
import { StatsPage, SearchPage } from '@/pages/stats'

function Guard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-slate-400">불러오는 중…</div>
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (roles && !roles.includes(session.profile.role)) {
    return <Navigate to={roleHome(session.profile.role)} replace />
  }
  return <>{children}</>
}

const STAFF_ROLES: Role[] = ['ROLE_SALES', 'ROLE_SALES_ADMIN', 'ROLE_PARTS', 'ROLE_TECH', 'ROLE_ADMIN']
const ALL_ROLES: Role[] = ['ROLE_COMPANY', ...STAFF_ROLES]

// 거래처 화면은 로그인한 모든 역할이 볼 수 있음 (직원/관리자는 '관리자 모드' 버튼으로 /staff 전환)
const M = (node: React.ReactNode, title?: string) => (
  <Guard roles={ALL_ROLES}><MobileShell title={title}>{node}</MobileShell></Guard>
)
const S = (node: React.ReactNode, title?: string, roles: Role[] = STAFF_ROLES) => (
  <Guard roles={roles}><StaffShell title={title}>{node}</StaffShell></Guard>
)

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* 거래처 (모바일) */}
        <Route path="/" element={M(<HomePage />)} />
        <Route path="/inquiry" element={M(<InquiryMenuPage />, '문의하기')} />
        <Route path="/inquiry/new" element={M(<NewSalesInquiryPage />, '문의 작성')} />
        <Route path="/inquiry/part" element={M(<NewPartInquiryPage />, '부품 문의')} />
        <Route path="/as/diagnose" element={M(<AsDiagnosePage />, '오류코드 자가진단')} />
        <Route path="/as/new" element={M(<NewAsPage />, 'AS 접수')} />
        <Route path="/tickets" element={M(<MyTicketsPage />, '내 문의')} />
        <Route path="/tickets/:id" element={M(<TicketDetailPage />, '문의 상세')} />
        <Route path="/board" element={M(<BoardPage />, '이벤트 / 공지')} />
        <Route path="/more" element={M(<MorePage />, '더보기')} />
        <Route path="/notifications" element={M(<NotificationsPage />, '알림')} />

        {/* 직원 (PC) */}
        <Route path="/staff" element={S(<StaffDashboardPage />, '대시보드')} />
        <Route path="/staff/tickets" element={S(<StaffTicketListPage />, '문의함')} />
        <Route path="/staff/tickets/:id" element={S(<StaffTicketDetailPage />, '문의 상세')} />
        <Route path="/staff/search" element={S(<SearchPage />, '통합검색')} />
        <Route path="/staff/stats" element={S(<StatsPage />, '통계')} />
        <Route path="/staff/notifications" element={S(<NotificationsPage />, '알림')} />
        <Route path="/staff/admin" element={<Navigate to="/staff/admin/companies" replace />} />
        <Route path="/staff/admin/:section" element={S(<AdminPage />, '관리자', ['ROLE_ADMIN'])} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
