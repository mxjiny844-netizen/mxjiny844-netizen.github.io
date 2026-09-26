// 내 문의 목록 + 문의 상세 (거래처 화면)
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { addMessage, listTickets, ticketBundle } from '@/lib/api'
import type { Ticket, TicketMessage, History, Attachment } from '@/lib/types'
import { OPEN_STATUSES } from '@/lib/types'
import {
  StatusBadge, KindBadge, EmptyState, Timeline, AttachmentList,
  fmtDateTime, fmtMoney, Field,
} from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type FilterKey = 'ALL' | 'OPEN' | 'DONE'

export function MyTicketsPage() {
  const { session } = useAuth()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [filter, setFilter] = useState<FilterKey>('ALL')

  useEffect(() => { if (session) listTickets(session).then(setTickets) }, [session])

  const filtered = (tickets ?? []).filter(t => {
    if (filter === 'OPEN') return OPEN_STATUSES.includes(t.status)
    if (filter === 'DONE') return !OPEN_STATUSES.includes(t.status)
    return true
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">내 문의</h2>
      <div className="flex gap-2">
        {([['ALL', '전체'], ['OPEN', '진행중'], ['DONE', '완료']] as [FilterKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium',
              filter === k ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
            {l}
          </button>
        ))}
      </div>
      {!tickets ? <p className="text-sm text-slate-400">불러오는 중…</p>
        : filtered.length === 0 ? <EmptyState title="문의 내역이 없습니다" desc="문의하기 탭에서 새 문의를 접수해 보세요." />
        : (
          <ul className="space-y-2">
            {filtered.map(t => (
              <li key={t.id}>
                <Link to={`/tickets/${t.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.99]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <KindBadge ticket={t} />
                      {t.urgent && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">긴급</span>}
                      <span className="truncate text-xs text-slate-400">{t.ticket_no}</span>
                    </div>
                    <p className="mt-1 truncate font-semibold text-slate-900">{t.title ?? t.symptom}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{fmtDateTime(t.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={t.status} />
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

export function TicketDetailPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const [bundle, setBundle] = useState<{
    ticket: Ticket | null; messages: TicketMessage[]; history: History[]; attachments: Attachment[]
  } | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => { if (id) ticketBundle(id).then(setBundle) }
  useEffect(reload, [id])

  if (!bundle) return <p className="text-sm text-slate-400">불러오는 중…</p>
  const { ticket, messages, history, attachments } = bundle
  if (!ticket) return <EmptyState title="문의를 찾을 수 없습니다" />

  async function onReply(e: FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !session || !ticket) return
    setBusy(true)
    await addMessage(ticket, { kind: 'TEXT', body: reply.trim() },
      { id: session.profile.id, name: session.profile.name }, false)
    setReply('')
    setBusy(false)
    reload()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <KindBadge ticket={ticket} />
          <StatusBadge status={ticket.status} />
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{ticket.title ?? 'AS 접수'}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{ticket.ticket_no} · {fmtDateTime(ticket.created_at)}</p>
        {ticket.content && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{ticket.content}</p>}
        {ticket.symptom && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{ticket.symptom}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {ticket.product_name && <><dt className="text-slate-400">제품</dt><dd>{ticket.product_name}{ticket.quantity ? ` × ${ticket.quantity}` : ''}</dd></>}
          {ticket.part_name && <><dt className="text-slate-400">부품</dt><dd>{ticket.part_name}{ticket.part_no ? ` (${ticket.part_no})` : ''}{ticket.part_qty ? ` × ${ticket.part_qty}` : ''}</dd></>}
          {ticket.machine_model_name && <><dt className="text-slate-400">머신</dt><dd>{ticket.machine_model_name}</dd></>}
          {ticket.serial_no && <><dt className="text-slate-400">시리얼</dt><dd>{ticket.serial_no}</dd></>}
          {ticket.error_code && <><dt className="text-slate-400">오류코드</dt><dd>{ticket.error_code}</dd></>}
          {ticket.quote_amount != null && <><dt className="text-slate-400">견적금액</dt><dd className="font-bold text-blue-700">{fmtMoney(ticket.quote_amount)}</dd></>}
          {ticket.callback_at && <><dt className="text-slate-400">전화예정</dt><dd className="font-semibold text-violet-700">{fmtDateTime(ticket.callback_at)}</dd></>}
        </dl>
        <div className="mt-3"><AttachmentList items={attachments.filter(a => !a.message_id)} /></div>
      </div>

      <section className="space-y-3">
        <h3 className="font-bold text-slate-900">대화</h3>
        {messages.filter(m => m.kind !== 'INTERNAL').map(m => (
          <div key={m.id} className={cn('max-w-[85%] rounded-2xl p-3 text-sm shadow-sm',
            m.author_id === session?.profile.id
              ? 'ml-auto rounded-br-sm bg-blue-600 text-white'
              : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800')}>
            <p className={cn('mb-1 text-xs', m.author_id === session?.profile.id ? 'opacity-70' : 'text-slate-400')}>
              {m.author_name} · {m.kind === 'QUOTE' ? '견적' : m.kind === 'CALLBACK' ? '전화예정' : '답변'} · {fmtDateTime(m.created_at)}
            </p>
            {m.kind === 'QUOTE' && m.quote_amount != null && (
              <p className="mb-1 text-base font-bold">견적금액: {fmtMoney(m.quote_amount)}</p>
            )}
            {m.kind === 'CALLBACK' && m.callback_at && (
              <p className="mb-1 font-semibold">전화 예정: {fmtDateTime(m.callback_at)}</p>
            )}
            <p className="whitespace-pre-line">{m.body}</p>
            <div className="mt-2"><AttachmentList items={attachments.filter(a => a.message_id === m.id)} /></div>
          </div>
        ))}
        {OPEN_STATUSES.includes(ticket.status) ? (
          <form onSubmit={onReply} className="flex gap-2">
            <Textarea rows={2} value={reply} onChange={e => setReply(e.target.value)}
              placeholder="추가 문의나 답변을 입력하세요" className="flex-1" />
            <Button type="submit" disabled={busy || !reply.trim()} className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <Field label=""><p className="rounded-lg bg-slate-100 p-3 text-center text-sm text-slate-500">완료된 문의입니다. 새 문의는 문의하기 탭에서 접수해 주세요.</p></Field>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-bold text-slate-900">진행 이력</h3>
        <Timeline history={history} isStaff={false} />
      </section>
    </div>
  )
}
