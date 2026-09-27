// 거래처 메인 화면 — Google AI Studio 앱 디자인 이식 (네이비 브랜드 헤더 + 원클릭 메뉴)
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, FileText, PackageSearch, Cog, MessageSquareMore,
  ClipboardList, Megaphone, ChevronRight, Wrench, PhoneCall, User,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { listTickets, loadMasters, type Masters } from '@/lib/api'
import { OPEN_STATUSES, type Ticket } from '@/lib/types'

const MENU = [
  { to: '/inquiry/new?type=ORDER', icon: ShoppingCart, label: '발주 문의', desc: '원두·부자재·장비', color: '#0077B6' },
  { to: '/inquiry/new?type=QUOTE', icon: FileText, label: '견적 문의', desc: '머신 신규·추가 설치', color: '#0284C7' },
  { to: '/inquiry/new?type=STOCK', icon: PackageSearch, label: '재고 문의', desc: '실시간 입고·수량', color: '#0D9488' },
  { to: '/inquiry/part', icon: Cog, label: '부품 문의', desc: '사진만으로도 문의 가능', color: '#D97706' },
  { to: '/as/diagnose', icon: Wrench, label: 'AS 접수', desc: 'CU S15·제티노·반자동', color: '#DC2626', highlight: true, topBadge: '핵심접수' },
  { to: '/inquiry/new?type=ETC', icon: MessageSquareMore, label: '기타 문의', desc: '매장 이전·교육·계약', color: '#475569' },
  { to: '/tickets', icon: ClipboardList, label: '진행 중 문의', desc: '실시간 처리현황 추적', color: '#059669', count: true },
  { to: '/board', icon: Megaphone, label: '공지 / 이벤트', desc: '10+1 행사·특가 할인', color: '#8B5CF6' },
]

export function HomePage() {
  const { session } = useAuth()
  const [masters, setMasters] = useState<Masters | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  useEffect(() => { loadMasters().then(setMasters) }, [])
  useEffect(() => { if (session) listTickets(session).then(setTickets).catch(() => {}) }, [session])

  const today = new Date().toISOString().slice(0, 10)
  const activeEvents = (masters?.events ?? []).filter(
    e => (!e.start_date || e.start_date <= today) && (!e.end_date || e.end_date >= today),
  )
  const repName = masters?.employees.find(e => e.id === session?.company?.sales_rep_id)?.name
  const ongoingCount = tickets.filter(t => OPEN_STATUSES.includes(t.status)).length

  return (
    <div className="space-y-4">
      {/* 1. 네이비 브랜드 헤더 + 담당자 카드 */}
      <div className="-mx-4 -mt-4 bg-gradient-to-b from-eiden-navy-dark to-eiden-navy px-5 pb-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-eiden-cyan" />
              <span className="text-xs font-bold tracking-wider text-eiden-cyan">EIDEN B2B PARTNER</span>
            </div>
            <h2 className="mt-1.5 text-[22px] font-extrabold text-white">
              {session?.company?.name ?? 'EIDEN 파트너스'}
            </h2>
          </div>
        </div>
        <div className="mt-3.5 flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[13px] text-slate-200">
            <User className="h-4 w-4" /> 담당자: {session?.profile.name}님
          </span>
          {repName && (
            <span className="text-[13px] font-semibold text-eiden-amber-light">거래 담당: {repName}</span>
          )}
        </div>
      </div>

      {/* 2. 오류코드 AI 자가진단 배너 */}
      <Link to="/as/diagnose"
        className="block rounded-2xl bg-gradient-to-r from-eiden-blue to-eiden-cyan p-[1.5px] shadow-sm transition active:scale-[0.99]">
        <div className="flex items-center gap-3.5 rounded-2xl bg-blue-50 p-4">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-eiden-navy p-3">
            <Wrench className="h-7 w-7 text-white" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[17px] font-bold text-eiden-navy">오류코드 AI 자가진단</p>
              <span className="rounded bg-eiden-amber px-1 py-0.5 text-[10px] font-bold text-white">전화 전 필수</span>
            </div>
            <p className="mt-1 text-[13px] text-slate-600">100, 200, 300 등 코드 입력 시 1분 내 즉시 해결 조치 안내</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-eiden-blue" />
        </div>
      </Link>

      {/* 3. 히어로 프로모션 카드 */}
      {activeEvents.length > 0 && (
        <Link to="/board" className="block overflow-hidden rounded-2xl bg-white shadow-sm transition active:scale-[0.99]">
          <div className="relative h-32">
            <img src="images/hero.jpg" alt="EIDEN 쇼룸" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-eiden-navy-dark/80" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="rounded-md bg-eiden-amber px-2 py-0.5 text-[11px] font-bold text-white">진행중 프로모션</span>
              <span className="max-w-52 truncate text-[13px] font-semibold text-white">{activeEvents[0].title}</span>
            </div>
          </div>
        </Link>
      )}

      {/* 4. 섹션 타이틀 */}
      <div className="flex items-end justify-between px-1 pt-1">
        <h3 className="text-lg font-bold text-slate-900">원클릭 파트너 업무 메뉴</h3>
        <span className="text-xs text-slate-400">필요한 업무를 터치하세요</span>
      </div>

      {/* 5. 8개 대형 메뉴 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {MENU.map(m => (
          <Link key={m.label} to={m.to}
            className={
              m.highlight
                ? 'relative flex h-[118px] flex-col justify-between rounded-2xl border-2 border-eiden-red/70 bg-red-50 p-3.5 shadow-sm transition active:scale-[0.98]'
                : 'relative flex h-[118px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition active:scale-[0.98]'
            }>
            {m.topBadge && (
              <span className="absolute right-3 top-3 rounded bg-eiden-red px-1.5 py-0.5 text-[10px] font-bold text-white">{m.topBadge}</span>
            )}
            {m.count && ongoingCount > 0 && (
              <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-eiden-green px-1.5 text-[11px] font-bold text-white">
                {ongoingCount}
              </span>
            )}
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px]"
              style={{ backgroundColor: `${m.color}1F` }}>
              <m.icon className="h-6 w-6" style={{ color: m.color }} />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">{m.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-600">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 6. 기술지원 안내 */}
      <div className="rounded-xl bg-slate-200/60 p-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-eiden-navy">
          <PhoneCall className="h-4 w-4" /> EIDEN 기술지원 및 긴급 AS 안내
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          전국 대표번호: 1588-8282 (평일 09:00 ~ 18:00)<br />
          앱을 통해 접수하시면 기술팀 담당자가 즉시 배정되어 신속히 답변 또는 전화 회신을 드립니다.
        </p>
      </div>
    </div>
  )
}

// 문의하기 탭 — 6가지 문의 유형 선택
export function InquiryMenuPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">문의하기</h2>
      {MENU.slice(0, 6).map(m => (
        <Link key={m.label} to={m.to}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.99]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${m.color}1F` }}>
            <m.icon className="h-5 w-5" style={{ color: m.color }} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-slate-900">{m.label}</p>
            <p className="text-xs text-slate-500">{m.desc}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </Link>
      ))}
    </div>
  )
}
