// 영업 문의(발주/견적/재고/기타) + 부품 문의 작성
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { createTicket, loadMasters, type Masters } from '@/lib/api'
import type { SalesType } from '@/lib/types'
import { SALES_TYPE_LABEL, PRODUCT_CATEGORIES } from '@/lib/types'
import { Field } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function useMasters() {
  const [masters, setMasters] = useState<Masters | null>(null)
  useEffect(() => { loadMasters().then(setMasters) }, [])
  return masters
}

export function NewSalesInquiryPage() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const salesType = (params.get('type') ?? 'ETC') as SalesType
  const masters = useMasters()
  const [form, setForm] = useState({ product_cat: '', quantity: '', title: '', content: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const label = SALES_TYPE_LABEL[salesType] ?? '기타'
  const company = session?.company

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company || !masters) return
    setBusy(true); setError('')
    try {
      const ticket = await createTicket({
        kind: 'SALES', sales_type: salesType, company,
        requester_id: session!.profile.id,
        product_id: null,
        product_name: form.product_cat || undefined,
        quantity: form.quantity ? Number(form.quantity) : null,
        title: form.title || `${label} 문의`, content: form.content,
      }, masters)
      nav(`/tickets/${ticket.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '접수에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">{label} 문의</h2>
      <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
        {company?.name} · {company?.manager} · {company?.phone}
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="제품 분류" required>
          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.product_cat} required
            onChange={e => setForm(f => ({ ...f, product_cat: e.target.value }))}>
            <option value="" disabled>분류를 선택하세요</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-400">커피머신 이름과 상세 내역은 아래 제목과 내용에 직접 적어 주세요.</p>
        </Field>
        {salesType !== 'ETC' && (
          <Field label="수량">
            <Input type="number" min="0" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="예: 10" />
          </Field>
        )}
        <Field label="제목" required>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
            placeholder="예: 제티노 JL30 반자동 머신 2대 발주" />
        </Field>
        <Field label="내용" required>
          <Textarea rows={5} value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required
            placeholder="커피머신 이름(모델명), 수량, 요청 내역 등을 자세히 적어 주세요." />
        </Field>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? '접수 중…' : `${label} 문의 접수`}
        </Button>
      </form>
    </div>
  )
}

export function NewPartInquiryPage() {
  const { session } = useAuth()
  const nav = useNavigate()
  const masters = useMasters()
  const [form, setForm] = useState({
    machine_manufacturer: '', machine_model_name: '', part_name: '',
    part_no: '', part_qty: '', content: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const company = session?.company
  const machines = masters?.machines ?? []
  const setF = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company || !masters) return
    setBusy(true); setError('')
    try {
      const ticket = await createTicket({
        kind: 'PART', company, requester_id: session!.profile.id,
        machine_manufacturer: form.machine_manufacturer,
        machine_model_name: form.machine_model_name,
        part_name: form.part_name, part_no: form.part_no,
        part_qty: form.part_qty ? Number(form.part_qty) : null,
        title: `부품 문의 — ${form.part_name}`, content: form.content,
      }, masters)
      nav(`/tickets/${ticket.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '접수에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">부품 문의</h2>
      <p className="text-sm text-slate-500">자재팀({masters?.employees.find(e => e.role === 'ROLE_PARTS')?.name ?? '담당자'})이 재고와 가격을 확인해 답변드립니다.</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="머신 제조사" required>
          <Input value={form.machine_manufacturer} onChange={setF('machine_manufacturer')} placeholder="예: 씨메, 심발리, 제티노, 기타" required />
        </Field>
        <Field label="모델">
          <Input list="machine-list" value={form.machine_model_name} onChange={setF('machine_model_name')}
            placeholder="예: 씨메 네오, 제티노 29A블랙" />
          <datalist id="machine-list">
            {machines.map(m => <option key={m.id} value={m.name} />)}
          </datalist>
        </Field>
        <Field label="부품명" required><Input value={form.part_name} onChange={setF('part_name')} required /></Field>
        <Field label="부품번호"><Input value={form.part_no} onChange={setF('part_no')} placeholder="알고 있으면 입력" /></Field>
        <Field label="수량">
          <Input type="number" min="1" value={form.part_qty} onChange={setF('part_qty')} />
        </Field>
        <Field label="문의내용" required>
          <Textarea rows={4} value={form.content} onChange={setF('content')} required />
        </Field>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? '접수 중…' : '부품 문의 접수'}
        </Button>
      </form>
    </div>
  )
}
