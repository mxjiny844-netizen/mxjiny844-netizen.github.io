// AS 접수 — 오류코드 자가진단 → 해결 로그 or AS 티켓 자동 전환
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Search, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  createTicket, findErrorCode, loadMasters, logSelfResolution,
  type Masters,
} from '@/lib/api'
import type { ErrorCode } from '@/lib/types'
import { MACHINE_CATEGORIES } from '@/lib/types'
import { Field } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function useMasters() {
  const [masters, setMasters] = useState<Masters | null>(null)
  useEffect(() => { loadMasters().then(setMasters) }, [])
  return masters
}

// ---------- 1단계: 오류코드 자가진단 ----------
export function AsDiagnosePage() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [category, setCategory] = useState(MACHINE_CATEGORIES[2])
  const [code, setCode] = useState('')
  const [result, setResult] = useState<ErrorCode | null | 'NONE'>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSearch(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult((await findErrorCode(code, category)) ?? 'NONE')
    setBusy(false)
  }

  async function onResolved() {
    if (!session?.company || result === 'NONE') return
    await logSelfResolution(result, session.company, category,
      { code, machine_category: category }, true)
    setDone(true)
  }

  function onFailed() {
    if (result === 'NONE') return
    // 입력한 내용을 그대로 AS 접수 폼으로 전달 (재입력 방지)
    nav(`/as/new?code=${encodeURIComponent(code)}&cat=${encodeURIComponent(category)}&self=1`)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">해결되어 다행입니다!</h2>
        <p className="mt-2 text-sm text-slate-500">
          자가해결 기록이 저장되었습니다.<br />같은 증상이 반복되면 AS를 접수해 주세요.
        </p>
        <Button className="mt-6 w-full" onClick={() => nav('/')}>홈으로</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">AS 오류코드 자가진단</h2>
        <p className="mt-1 text-sm text-slate-500">
          머신 화면에 표시된 오류코드를 입력하면 전화 없이 해결 방법을 확인할 수 있습니다.
        </p>
      </div>

      <form onSubmit={onSearch} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="머신 종류" required>
          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={category} onChange={e => setCategory(e.target.value)}>
            {MACHINE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="오류코드" required>
          <div className="flex gap-2">
            <Input value={code} onChange={e => setCode(e.target.value)}
              placeholder="예: 100" inputMode="numeric" required />
            <Button type="submit" disabled={busy}><Search className="h-4 w-4" /></Button>
          </div>
        </Field>
      </form>

      {result === 'NONE' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertTriangle className="h-5 w-5" /> 등록되지 않은 오류코드입니다
          </p>
          <p className="mt-1 text-sm text-amber-700">
            입력하신 코드({code})는 아직 오류코드 DB에 없습니다. AS를 접수해 주시면 기술팀이 확인합니다.
          </p>
          <Button className="mt-3 w-full" variant="outline"
            onClick={() => nav(`/as/new?code=${encodeURIComponent(code)}&cat=${encodeURIComponent(category)}`)}>
            이 내용으로 AS 접수하기
          </Button>
        </div>
      )}

      {result && result !== 'NONE' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold text-blue-600">오류코드 {result.code} · {result.machine_category ?? '공통'}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{result.title}</h3>
          </div>
          {[
            ['예상 원인', result.expected_cause],
            ['고객 확인사항', result.customer_check],
            ['조치 1', result.action1],
            ['조치 2', result.action2],
            ['조치 3', result.action3],
          ].map(([label, text]) => text && (
            <div key={label as string}>
              <p className="text-sm font-semibold text-slate-700">{label}</p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{text}</p>
            </div>
          ))}
          {result.caution && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">⚠️ {result.caution}</p>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onResolved}>
              해결되었습니다
            </Button>
            <Button variant="destructive" onClick={onFailed}>
              해결되지 않았습니다
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-slate-500">
        오류코드가 표시되지 않나요?{' '}
        <Link to="/as/new" className="font-semibold text-blue-600">바로 AS 접수하기</Link>
      </p>
    </div>
  )
}

// ---------- 2단계: AS 접수 폼 ----------
export function NewAsPage() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const masters = useMasters()
  const company = session?.company
  const fromSelf = params.get('self') === '1'

  const [form, setForm] = useState({
    store_name: company?.name ?? '', store_code: '',
    contact_name: company?.manager ?? '', contact_phone: company?.phone ?? '',
    region: company?.region ?? '',
    machine_model_id: '', serial_no: '',
    error_code: params.get('code') ?? '', symptom: '', urgent: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const machines = masters?.machines ?? []
  const setF = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company || !masters) return
    setBusy(true); setError('')
    try {
      const model = machines.find(m => m.id === form.machine_model_id)
      const ticket = await createTicket({
        kind: 'AS', company, requester_id: session!.profile.id,
        contact_name: form.contact_name, contact_phone: form.contact_phone,
        contact_region: form.region,
        store_name: form.store_name, store_code: form.store_code,
        machine_model_id: model?.id ?? null, machine_model_name: model?.name,
        machine_category: model?.category ?? params.get('cat') ?? undefined,
        serial_no: form.serial_no, error_code: form.error_code,
        symptom: form.symptom, urgent: form.urgent,
        self_resolved_attempt: fromSelf,
        title: `AS — ${form.store_name}`,
      }, masters)
      // 자가진단 실패 전환인 경우 실패 로그 기록
      if (fromSelf) {
        const ec = await findErrorCode(form.error_code, model?.category)
        await logSelfResolution(ec, company, model?.category, form, false, ticket.id)
      }
      nav(`/tickets/${ticket.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AS 접수에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">AS 접수</h2>
        {fromSelf && (
          <p className="mt-1 rounded-lg bg-blue-50 p-2 text-sm text-blue-700">
            자가진단에서 입력하신 내용이 그대로 적용되었습니다. 나머지 항목만 입력해 주세요.
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="업체 / 점포" required><Input value={form.store_name} onChange={setF('store_name')} required /></Field>
        <Field label="점포코드"><Input value={form.store_code} onChange={setF('store_code')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="담당자" required><Input value={form.contact_name} onChange={setF('contact_name')} required /></Field>
          <Field label="전화번호" required><Input value={form.contact_phone} onChange={setF('contact_phone')} required /></Field>
        </div>
        <Field label="지역" required><Input value={form.region} onChange={setF('region')} required /></Field>
        <Field label="머신모델" required>
          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.machine_model_id} onChange={setF('machine_model_id')} required>
            <option value="">선택하세요</option>
            {MACHINE_CATEGORIES.map(cat => (
              <optgroup key={cat} label={cat}>
                {machines.filter(m => m.category === cat).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="시리얼번호"><Input value={form.serial_no} onChange={setF('serial_no')} placeholder="머신 뒷면/측면 라벨" /></Field>
        <Field label="오류코드"><Input value={form.error_code} onChange={setF('error_code')} placeholder="화면에 표시된 코드 (예: 100)" /></Field>
        <Field label="증상" required>
          <Textarea rows={4} value={form.symptom} onChange={setF('symptom')} required
            placeholder="언제부터, 어떤 증상인지 자세히 적어 주세요." />
        </Field>
        <label className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <input type="checkbox" checked={form.urgent}
            onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))}
            className="h-4 w-4 accent-red-600" />
          <span className="text-sm font-semibold text-red-700">긴급 — 영업 중단 등 즉시 조치가 필요합니다</span>
        </label>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" size="lg" disabled={busy}>
          {busy ? '접수 중…' : 'AS 접수하기'}
        </Button>
      </form>
    </div>
  )
}
