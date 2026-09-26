// 거래처 메인 화면 — 큰 카드 버튼 메뉴 + 진행중 이벤트
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, FileText, PackageSearch, Cog, Wrench, MessageSquareMore,
  ClipboardList, Megaphone, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { loadMasters, type Masters } from '@/lib/api'
import { fmtDate } from '@/components/common'

const MENU = [
  { to: '/inquiry/new?type=ORDER', icon: ShoppingCart, label: '발주 문의', desc: '제품 발주 접수', color: 'bg-blue-500' },
  { to: '/inquiry/new?type=QUOTE', icon: FileText, label: '견적 문의', desc: '견적 요청', color: 'bg-indigo-500' },
  { to: '/inquiry/new?type=STOCK', icon: PackageSearch, label: '재고 문의', desc: '제품 재고 확인', color: 'bg-cyan-500' },
  { to: '/inquiry/part', icon: Cog, label: '부품 문의', desc: '부품 재고·가격', color: 'bg-teal-500' },
  { to: '/as/diagnose', icon: Wrench, label: 'AS 접수', desc: '오류코드 자가진단', color: 'bg-red-500' },
  { to: '/inquiry/new?type=ETC', icon: MessageSquareMore, label: '기타 문의', desc: '일반 문의', color: 'bg-slate-500' },
  { to: '/tickets', icon: ClipboardList, label: '내 문의', desc: '진행상태 확인', color: 'bg-violet-500' },
  { to: '/board', icon: Megaphone, label: '이벤트 / 공지', desc: '행사·공지사항', color: 'bg-amber-500' },
]

export function HomePage() {
  const { session } = useAuth()
  const [masters, setMasters] = useState<Masters | null>(null)
  useEffect(() => { loadMasters().then(setMasters) }, [])

  const today = new Date().toISOString().slice(0, 10)
  const activeEvents = (masters?.events ?? []).filter(
    e => (!e.start_date || e.start_date <= today) && (!e.end_date || e.end_date >= today),
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {session?.company?.name} {session?.profile.name}님
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">무엇을 도와드릴까요?</p>
      </div>

      {activeEvents.length > 0 && (
        <div className="space-y-2">
          {activeEvents.map(ev => (
            <Link key={ev.id} to="/board"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-sm">
              <div>
                <p className="text-xs font-medium opacity-80">진행중 이벤트 · {ev.condition}</p>
                <p className="mt-0.5 font-bold">{ev.title}</p>
                <p className="mt-0.5 text-xs opacity-80">{fmtDate(ev.start_date)} ~ {fmtDate(ev.end_date)}</p>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {MENU.map(m => (
          <Link key={m.label} to={m.to}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
              <m.icon className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="font-bold text-slate-900">{m.label}</p>
              <p className="text-xs text-slate-500">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">긴급한 머신 고장이신가요?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          AS 접수 메뉴에서 오류코드를 입력하면 전화 없이 스스로 해결할 수 있는
          조치 방법을 바로 확인할 수 있습니다.
        </p>
        <Link to="/as/diagnose">
          <span className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-600">
            오류코드 자가진단 바로가기 <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
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
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.color}`}>
            <m.icon className="h-5 w-5 text-white" />
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
