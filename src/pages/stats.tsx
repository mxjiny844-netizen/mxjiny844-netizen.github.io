// 통계 대시보드 + 통합검색
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { globalSearch, loadStats, type SearchResult } from '@/lib/api'
import type { Ticket } from '@/lib/types'
import { KIND_LABEL, STATUS_LABEL, OPEN_STATUSES } from '@/lib/types'
import { EmptyState, fmtDate } from '@/components/common'
import { Input } from '@/components/ui/input'

function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-slate-600">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn0('h-full rounded-full', color)} style={{ width: `${max ? Math.max(3, (value / max) * 100) : 0}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-slate-800">{value}</span>
    </div>
  )
}
const cn0 = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function StatsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadStats>> | null>(null)
  useEffect(() => { loadStats().then(setData) }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const { tickets, selfRes, masters } = data
    const day = 86400000
    const now = Date.now()
    const inDays = (t: Ticket, n: number) => now - new Date(t.created_at).getTime() < n * day
    const today = new Date().toISOString().slice(0, 10)
    const resolved = tickets.filter(t => t.resolved_at)
    const avgHours = resolved.length
      ? resolved.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0)
        / resolved.length / 3600000
      : 0
    return {
      today: tickets.filter(t => t.created_at.slice(0, 10) === today).length,
      week: tickets.filter(t => inDays(t, 7)).length,
      month: tickets.filter(t => inDays(t, 30)).length,
      byKind: countBy(tickets, t => KIND_LABEL[t.kind]),
      byStatus: countBy(tickets, t => STATUS_LABEL[t.status]),
      openCount: tickets.filter(t => OPEN_STATUSES.includes(t.status)).length,
      avgHours,
      byEmployee: countBy(tickets.filter(t => t.assignee_id), t =>
        masters.employees.find(e => e.id === t.assignee_id)?.name ?? '미배정'),
      byMachine: countBy(tickets.filter(t => t.kind === 'AS'), t => t.machine_category ?? '기타'),
      byError: countBy(tickets.filter(t => t.error_code), t => `${t.error_code}`),
      selfOk: selfRes.filter(l => l.resolved).length,
      selfFail: selfRes.filter(l => !l.resolved).length,
    }
  }, [data])

  if (!stats) return <p className="text-sm text-slate-400">불러오는 중…</p>
  const convRate = stats.selfOk + stats.selfFail > 0
    ? Math.round((stats.selfFail / (stats.selfOk + stats.selfFail)) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['오늘 문의', stats.today], ['이번 주', stats.week],
          ['이번 달', stats.month], ['미처리 건수', stats.openCount],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{l}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="유형별 문의">
          {stats.byKind.map(([l, v]) => <Bar key={l} label={l} value={v} max={stats.byKind[0]?.[1] ?? 1} color="bg-blue-500" />)}
        </Section>
        <Section title="상태별">
          {stats.byStatus.map(([l, v]) => <Bar key={l} label={l} value={v} max={stats.byStatus[0]?.[1] ?? 1} color="bg-slate-500" />)}
        </Section>
        <Section title="직원별 처리 건수">
          {stats.byEmployee.length === 0 ? <EmptyState title="데이터 없음" />
            : stats.byEmployee.map(([l, v]) => <Bar key={l} label={l} value={v} max={stats.byEmployee[0]?.[1] ?? 1} color="bg-violet-500" />)}
        </Section>
        <Section title="머신별 AS">
          {stats.byMachine.length === 0 ? <EmptyState title="데이터 없음" />
            : stats.byMachine.map(([l, v]) => <Bar key={l} label={l} value={v} max={stats.byMachine[0]?.[1] ?? 1} color="bg-red-500" />)}
        </Section>
        <Section title="오류코드별 발생건수">
          {stats.byError.length === 0 ? <EmptyState title="데이터 없음" />
            : stats.byError.map(([l, v]) => <Bar key={l} label={l} value={v} max={stats.byError[0]?.[1] ?? 1} color="bg-orange-500" />)}
        </Section>
        <Section title="자가해결">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-600">{stats.selfOk}</p>
              <p className="text-xs text-slate-500">자가해결 성공</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-600">{stats.selfFail}</p>
              <p className="text-xs text-slate-500">실패 → AS 전환</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-700">{convRate}%</p>
              <p className="text-xs text-slate-500">AS 전환율</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">평균 처리시간: <b>{stats.avgHours.toFixed(1)}시간</b></p>
        </Section>
      </div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

// ---------- 통합검색 ----------
export function SearchPage() {
  const { session } = useAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSearch(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setBusy(true)
    setResults(await globalSearch(q, session))
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <Input value={q} onChange={e => setQ(e.target.value)}
          placeholder="업체명, 전화번호, 문의번호, 제품, 부품번호, 시리얼번호, 오류코드, 담당자" />
        <button type="submit" className="rounded-md bg-blue-600 px-4 text-white" disabled={busy}>
          <Search className="h-4 w-4" />
        </button>
      </form>
      {results && (
        results.length === 0 ? <EmptyState title="검색 결과가 없습니다" /> : (
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={i}>
                <Link to={r.link} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{r.type}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{r.label}</p>
                    {r.sub && <p className="truncate text-xs text-slate-400">{r.sub}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
      <p className="text-xs text-slate-400">검색 기준일: {fmtDate(new Date().toISOString())}</p>
    </div>
  )
}
