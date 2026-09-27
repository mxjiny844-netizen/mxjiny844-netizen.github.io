// 직원용 화면 — 대시보드 / 문의함 / 문의 상세(답변·상태변경·배정)
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, Phone, MessageSquareText, StickyNote, CheckCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  addMessage, changeStatus, listTickets, loadMasters, manualAssign,
  ticketBundle, type Masters,
} from '@/lib/api'
import type {
  Ticket, TicketMessage, History, Attachment, TicketStatus,
} from '@/lib/types'
import {
  KIND_LABEL, OPEN_STATUSES, STATUS_LABEL, EMP_STATUS_LABEL,
} from '@/lib/types'
import {
  StatusBadge, KindBadge, EmptyState, Timeline, AttachmentList,
  fmtDateTime, fmtMoney, Field,
} from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function useMasters() {
  const [masters, setMasters] = useState<Masters | null>(null)
  useEffect(() => { loadMasters().then(setMasters) }, [])
  return masters
}

// 내 부서 코드 (역할 → 부서)
const ROLE_DEPT: Record<string, string> = {
  ROLE_SALES: 'SALES', ROLE_SALES_ADMIN: 'SALES_ADMIN',
  ROLE_PARTS: 'PARTS', ROLE_TECH: 'TECH',
}

// ---------- 대시보드 ----------
export function StaffDashboardPage() {
  const { session } = useAuth()
  const masters = useMasters()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  useEffect(() => { if (session) listTickets(session).then(setTickets) }, [session])

  const myDept = session ? ROLE_DEPT[session.profile.role] : null
  const isAdmin = session?.profile.role === 'ROLE_ADMIN'
  const visible = (tickets ?? []).filter(t => {
    if (isAdmin) return true
    const dept = masters?.departments.find(d => d.id === t.department_id)
    return !dept || dept.code === myDept ||
      (myDept === 'SALES_ADMIN' && dept.code === 'SALES')
  })
  const open = visible.filter(t => OPEN_STATUSES.includes(t.status))
  const urgent = open.filter(t => t.urgent)
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = visible.filter(t => t.created_at.slice(0, 10) === today).length
  const mine = session?.employee ? open.filter(t => t.assignee_id === session.employee!.id) : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['오늘 접수', todayCount, 'text-slate-900'],
          ['미처리(신규)', visible.filter(t => t.status === 'NEW').length, 'text-red-600'],
          ['진행중', open.length, 'text-blue-600'],
          ['긴급 AS', urgent.length, 'text-red-600'],
        ].map(([label, v, color]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={cn('mt-1 text-2xl font-bold', color as string)}>{v as number}</p>
          </div>
        ))}
      </div>

      {session?.employee && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">내게 배정된 티켓 ({mine.length})</h3>
          {mine.length === 0
            ? <p className="mt-2 text-sm text-slate-400">배정된 티켓이 없습니다.</p>
            : (
              <ul className="mt-3 divide-y divide-slate-100">
                {mine.slice(0, 5).map(t => (
                  <li key={t.id}>
                    <Link to={`/staff/tickets/${t.id}`} className="flex items-center gap-3 py-2.5">
                      <KindBadge ticket={t} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                        {t.company_name} — {t.title ?? t.symptom}
                      </span>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">최근 접수</h3>
          <Link to="/staff/tickets" className="text-sm font-medium text-blue-600">전체보기</Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          {visible.slice(0, 8).map(t => (
            <li key={t.id}>
              <Link to={`/staff/tickets/${t.id}`} className="flex items-center gap-3 py-2.5">
                <KindBadge ticket={t} />
                {t.urgent && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">긴급</span>}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                  {t.company_name} — {t.title ?? t.symptom}
                </span>
                <span className="text-xs text-slate-400">{fmtDateTime(t.created_at)}</span>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
          {visible.length === 0 && <li className="py-6 text-center text-sm text-slate-400">접수된 문의가 없습니다.</li>}
        </ul>
      </section>
    </div>
  )
}

// ---------- 문의함 ----------
export function StaffTicketListPage() {
  const { session } = useAuth()
  const masters = useMasters()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') ?? 'ALL'
  const status = params.get('status') ?? 'OPEN'
  const mineOnly = params.get('mine') === '1'

  useEffect(() => { if (session) listTickets(session).then(setTickets) }, [session])

  const myDept = session ? ROLE_DEPT[session.profile.role] : null
  const isAdmin = session?.profile.role === 'ROLE_ADMIN'
  const rows = (tickets ?? []).filter(t => {
    if (!isAdmin && myDept) {
      const dept = masters?.departments.find(d => d.id === t.department_id)
      if (dept && dept.code !== myDept && !(myDept === 'SALES_ADMIN' && dept.code === 'SALES')) return false
    }
    if (kind !== 'ALL' && t.kind !== kind) return false
    if (status === 'OPEN' && !OPEN_STATUSES.includes(t.status)) return false
    if (status === 'DONE' && OPEN_STATUSES.includes(t.status)) return false
    if (mineOnly && t.assignee_id !== session?.employee?.id) return false
    return true
  })

  const setP = (k: string, v: string) => { params.set(k, v); setParams(params, { replace: true }) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'SALES', 'PART', 'AS'] as const).map(k => (
          <button key={k} onClick={() => setP('kind', k)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium',
              kind === k ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
            {k === 'ALL' ? '전체' : KIND_LABEL[k]}
          </button>
        ))}
        <span className="mx-1 border-l border-slate-300" />
        {(['OPEN', 'ALL', 'DONE'] as const).map(s => (
          <button key={s} onClick={() => setP('status', s)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium',
              status === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
            {s === 'OPEN' ? '진행중' : s === 'DONE' ? '완료' : '전체상태'}
          </button>
        ))}
        <button onClick={() => setP('mine', mineOnly ? '0' : '1')}
          className={cn('rounded-full px-4 py-1.5 text-sm font-medium',
            mineOnly ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
          내 담당만
        </button>
      </div>

      {!tickets ? <p className="text-sm text-slate-400">불러오는 중…</p>
        : rows.length === 0 ? <EmptyState title="조건에 맞는 문의가 없습니다" /> : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">문의번호</th><th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3">업체</th><th className="px-4 py-3">제목/증상</th>
                  <th className="px-4 py-3">담당자</th><th className="px-4 py-3">접수시간</th>
                  <th className="px-4 py-3">상태</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{t.ticket_no}</td>
                    <td className="px-4 py-3"><KindBadge ticket={t} />{t.urgent && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-600">긴급</span>}</td>
                    <td className="px-4 py-3">{t.company_name}</td>
                    <td className="max-w-64 truncate px-4 py-3">{t.title ?? t.symptom}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {masters?.employees.find(e => e.id === t.assignee_id)?.name ?? '미배정'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(t.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/staff/tickets/${t.id}`}><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
    </div>
  )
}

// ---------- 문의 상세 (직원) ----------
export function StaffTicketDetailPage() {
  const { id } = useParams()
  const { session, hasRole } = useAuth()
  const masters = useMasters()
  const [bundle, setBundle] = useState<{
    ticket: Ticket | null; messages: TicketMessage[]; history: History[]; attachments: Attachment[]
  } | null>(null)
  const [replyKind, setReplyKind] = useState<'TEXT' | 'QUOTE' | 'CALLBACK' | 'INTERNAL'>('TEXT')
  const [body, setBody] = useState('')
  const [quoteAmount, setQuoteAmount] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [assignee, setAssignee] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => { if (id) ticketBundle(id).then(setBundle) }
  useEffect(reload, [id])
  useEffect(() => { setAssignee(bundle?.ticket?.assignee_id ?? '') }, [bundle?.ticket?.assignee_id])

  if (!bundle || !masters) return <p className="text-sm text-slate-400">불러오는 중…</p>
  const { ticket, messages, history, attachments } = bundle
  if (!ticket) return <EmptyState title="문의를 찾을 수 없습니다" />
  const me = session!.profile.name
  const mm: Masters = masters

  async function onReply(e: FormEvent) {
    e.preventDefault()
    if (!ticket || !body.trim()) return
    setBusy(true)
    await addMessage(ticket, {
      kind: replyKind, body: body.trim(),
      quote_amount: quoteAmount ? Number(quoteAmount) : null,
      callback_at: callbackAt ? new Date(callbackAt).toISOString() : null,
    }, { id: session!.employee?.id ?? session!.profile.id, name: me }, true)
    setBody(''); setQuoteAmount(''); setCallbackAt('')
    setBusy(false); reload()
  }
  async function onStatus(s: TicketStatus) {
    if (!ticket) return
    await changeStatus(ticket, s, me)
    reload()
  }
  async function onAssign() {
    if (!ticket || !assignee) return
    await manualAssign(ticket, assignee, me, mm)
    reload()
  }

  const STATUS_FLOW: TicketStatus[] = ['CHECKING', 'PARTS_CHECK', 'ON_SITE_REQUIRED', 'CALLBACK', 'RESOLVED', 'CLOSED']

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {/* 기본 정보 */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge ticket={ticket} />
            {ticket.urgent && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">긴급</span>}
            {ticket.self_resolved_attempt && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">자가진단 후 전환</span>}
            <StatusBadge status={ticket.status} />
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{ticket.title ?? 'AS 접수'}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{ticket.ticket_no} · {fmtDateTime(ticket.created_at)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
            <><dt className="text-slate-400">업체</dt><dd className="col-span-1 font-medium">{ticket.company_name}</dd></>
            <><dt className="text-slate-400">담당자</dt><dd>{ticket.contact_name} {ticket.contact_phone}</dd></>
            {ticket.region && <><dt className="text-slate-400">지역</dt><dd>{ticket.region}</dd></>}
            {ticket.store_name && <><dt className="text-slate-400">점포</dt><dd>{ticket.store_name}{ticket.store_code ? ` (${ticket.store_code})` : ''}</dd></>}
            {ticket.product_name && <><dt className="text-slate-400">제품</dt><dd>{ticket.product_name}{ticket.quantity ? ` × ${ticket.quantity}` : ''}</dd></>}
            {ticket.part_name && <><dt className="text-slate-400">부품</dt><dd>{ticket.part_name}{ticket.part_no ? ` (${ticket.part_no})` : ''}{ticket.part_qty ? ` × ${ticket.part_qty}` : ''}</dd></>}
            {ticket.machine_model_name && <><dt className="text-slate-400">머신</dt><dd>{ticket.machine_model_name}</dd></>}
            {ticket.serial_no && <><dt className="text-slate-400">시리얼</dt><dd>{ticket.serial_no}</dd></>}
            {ticket.error_code && <><dt className="text-slate-400">오류코드</dt><dd className="font-bold text-red-600">{ticket.error_code}</dd></>}
            {ticket.quote_amount != null && <><dt className="text-slate-400">견적금액</dt><dd className="font-bold text-blue-700">{fmtMoney(ticket.quote_amount)}</dd></>}
          </dl>
          {ticket.content && <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">{ticket.content}</p>}
          {ticket.symptom && <p className="mt-4 whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-900">{ticket.symptom}</p>}
          <div className="mt-3"><AttachmentList items={attachments.filter(a => !a.message_id)} /></div>
        </section>

        {/* 대화 */}
        <section className="space-y-3">
          <h3 className="font-bold text-slate-900">대화</h3>
          {messages.map(m => (
            <div key={m.id} className={cn('rounded-xl border p-4 text-sm shadow-sm',
              m.kind === 'INTERNAL' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white')}>
              <p className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                {m.kind === 'INTERNAL' && <StickyNote className="h-3.5 w-3.5 text-amber-500" />}
                {m.author_name} · {m.kind === 'QUOTE' ? '견적' : m.kind === 'CALLBACK' ? '전화예정' : m.kind === 'INTERNAL' ? '내부메모' : '답변'} · {fmtDateTime(m.created_at)}
              </p>
              {m.kind === 'QUOTE' && m.quote_amount != null && <p className="mb-1 font-bold text-blue-700">견적금액: {fmtMoney(m.quote_amount)}</p>}
              {m.kind === 'CALLBACK' && m.callback_at && <p className="mb-1 font-semibold text-violet-700">전화 예정: {fmtDateTime(m.callback_at)}</p>}
              <p className="whitespace-pre-line">{m.body}</p>
              <div className="mt-2"><AttachmentList items={attachments.filter(a => a.message_id === m.id)} /></div>
            </div>
          ))}

          {/* 답변 작성 */}
          <form onSubmit={onReply} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {([['TEXT', '텍스트답변', MessageSquareText], ['QUOTE', '견적금액', null], ['CALLBACK', '전화예정', Phone], ['INTERNAL', '내부메모', StickyNote]] as const).map(([k, l]) => (
                <button type="button" key={k} onClick={() => setReplyKind(k)}
                  className={cn('rounded-full px-3 py-1.5 text-xs font-semibold',
                    replyKind === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600')}>
                  {l}
                </button>
              ))}
            </div>
            {replyKind === 'QUOTE' && (
              <Field label="견적금액(원)">
                <Input type="number" min="0" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)} required />
              </Field>
            )}
            {replyKind === 'CALLBACK' && (
              <Field label="전화 예정 일시">
                <Input type="datetime-local" value={callbackAt} onChange={e => setCallbackAt(e.target.value)} required />
              </Field>
            )}
            <Textarea rows={3} value={body} onChange={e => setBody(e.target.value)}
              placeholder={replyKind === 'INTERNAL' ? '내부 메모 (거래처에게 보이지 않습니다)' : '답변 내용'} required />
            <Button type="submit" disabled={busy}>{busy ? '등록 중…' : '등록'}</Button>
          </form>
        </section>

        {/* 타임라인 */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-900">작업 이력</h3>
          <Timeline history={history} isStaff />
        </section>
      </div>

      {/* 우측 처리 패널 */}
      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">상태 변경</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {STATUS_FLOW.map(s => (
              <Button key={s} size="sm" variant={ticket.status === s ? 'default' : 'outline'}
                disabled={ticket.status === s || s === 'CLOSED' && !hasRole('ROLE_ADMIN') && ticket.status !== 'RESOLVED'}
                onClick={() => onStatus(s)}>
                {s === 'RESOLVED' && <CheckCheck className="mr-1 h-3.5 w-3.5" />}
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">담당자 배정</h3>
          <select className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={assignee} onChange={e => setAssignee(e.target.value)}>
            <option value="">미배정</option>
            {masters.employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} {e.title} ({EMP_STATUS_LABEL[e.status]})
              </option>
            ))}
          </select>
          <Button className="mt-2 w-full" variant="outline" onClick={onAssign} disabled={!assignee}>
            수동 배정
          </Button>
        </section>
      </div>
    </div>
  )
}
