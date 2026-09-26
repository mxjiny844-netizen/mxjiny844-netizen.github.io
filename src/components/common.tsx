// 공통 UI 컴포넌트
import { type ReactNode } from 'react'
import { STATUS_LABEL, STATUS_COLOR, KIND_LABEL, SALES_TYPE_LABEL } from '@/lib/types'
import type { Ticket, TicketStatus, History, Attachment } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_COLOR[status])}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function KindBadge({ ticket }: { ticket: Ticket }) {
  const label = ticket.kind === 'SALES' && ticket.sales_type
    ? SALES_TYPE_LABEL[ticket.sales_type] : KIND_LABEL[ticket.kind]
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {label}
    </span>
  )
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center">
      <p className="font-medium text-slate-600">{title}</p>
      {desc && <p className="mt-1 text-sm text-slate-400">{desc}</p>}
    </div>
  )
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export function fmtDate(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
export function fmtMoney(n?: number | null) {
  if (n == null) return '-'
  return n.toLocaleString('ko-KR') + '원'
}

const HISTORY_LABEL: Record<string, string> = {
  CREATED: '접수', ASSIGNED: '담당자배정', STATUS_CHANGED: '상태변경', REPLIED: '답변',
  PHONE_CALL: '전화상담', INTERNAL_MEMO: '내부메모', RESOLVED: '처리완료', CLOSED: '종료',
}

export function Timeline({ history, isStaff }: { history: History[]; isStaff: boolean }) {
  const rows = history.filter(h => isStaff || h.visible_to_company)
  if (!rows.length) return null
  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-4">
      {rows.map(h => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{HISTORY_LABEL[h.action] ?? h.action}</span>
            {!h.visible_to_company && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">내부</span>
            )}
            <span className="text-xs text-slate-400">{fmtDateTime(h.created_at)}</span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {h.actor_name}{h.detail ? ` — ${h.detail}` : ''}
          </p>
        </li>
      ))}
    </ol>
  )
}

export function AttachmentList({ items }: { items: Attachment[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(a => (
        <a key={a.id} href={a.file_url || undefined} target="_blank" rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-slate-200">
          {a.file_url && a.file_type === 'image' ? (
            <img src={a.file_url} alt={a.file_name ?? '첨부'} className="h-20 w-20 object-cover" />
          ) : a.file_url && a.file_type === 'video' ? (
            <video src={a.file_url} className="h-20 w-28" controls />
          ) : (
            <span className="flex h-20 w-40 items-center justify-center p-2 text-xs text-slate-500">
              {a.file_name ?? '첨부파일'}
            </span>
          )}
        </a>
      ))}
    </div>
  )
}

// 파일 선택 → dataURL/Storage 업로드 준비물 (pages에서 uploadAttachment 사용)
export function fileToPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}
