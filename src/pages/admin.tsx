// 관리자 화면 — 거래처/직원/마스터데이터/설정 CRUD (Soft Delete 우선)
import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { getBackend, isLocalMode } from '@/lib/db'
import { provisionAccount } from '@/lib/provision'
import { useAuth } from '@/lib/auth'
import {
  approveCompany, loadMasters, rejectCompany, type Masters,
} from '@/lib/api'
import type {
  AssignMethod, Company, EmpStatus, Employee, ErrorCode, EventItem,
  Faq, MachineModel, Notice, Part, Product,
} from '@/lib/types'
import {
  COMPANY_STATUS_LABEL, EMP_STATUS_LABEL, MACHINE_CATEGORIES, ROLE_LABEL,
} from '@/lib/types'
import { EmptyState, Field, fmtDate, fmtMoney } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const SECTIONS = [
  ['companies', '거래처'], ['employees', '직원'], ['errorcodes', '오류코드'],
  ['events', '이벤트'], ['notices', '공지'], ['faqs', 'FAQ'],
  ['products', '제품'], ['parts', '부품'], ['machines', '머신'], ['settings', '설정'],
] as const

export function AdminPage() {
  const { section = 'companies' } = useParams()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(([k, l]) => (
          <NavLink key={k} to={`/staff/admin/${k}`}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium',
              section === k ? 'bg-eiden-navy text-white' : 'bg-white text-slate-600 border border-slate-200')}>
            {l}
          </NavLink>
        ))}
      </div>
      {section === 'companies' && <CompaniesAdmin />}
      {section === 'employees' && <EmployeesAdmin />}
      {section === 'errorcodes' && <ErrorCodesAdmin />}
      {section === 'events' && <EventsAdmin />}
      {section === 'notices' && <NoticesAdmin />}
      {section === 'faqs' && <FaqsAdmin />}
      {section === 'products' && <ProductsAdmin />}
      {section === 'parts' && <PartsAdmin />}
      {section === 'machines' && <MachinesAdmin />}
      {section === 'settings' && <SettingsAdmin />}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>
}

// ---------- 거래처 ----------
function CompaniesAdmin() {
  const { session } = useAuth()
  const [masters, setMasters] = useState<Masters | null>(null)
  const reload = () => loadMasters().then(setMasters)
  useEffect(() => { reload() }, [])
  if (!masters) return <p className="text-sm text-slate-400">불러오는 중…</p>
  const pending = masters.companies.filter(c => c.status === 'PENDING')
  const approved = masters.companies.filter(c => c.status !== 'PENDING')
  const repName = (id?: string | null) => masters.employees.find(e => e.id === id)?.name ?? '-'

  const act = async (fn: () => Promise<unknown>) => { await fn(); reload() }

  const Row = ({ c }: { c: Company }) => (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-medium">{c.name}</td>
      <td className="px-4 py-3 text-xs">{c.business_no}</td>
      <td className="px-4 py-3">{c.manager}<br /><span className="text-xs text-slate-400">{c.phone}</span></td>
      <td className="px-4 py-3 text-xs">{c.region}</td>
      <td className="px-4 py-3">{repName(c.sales_rep_id)}</td>
      <td className="px-4 py-3">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
          c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
            : c.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
          {COMPANY_STATUS_LABEL[c.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {c.status === 'PENDING' && (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => act(() => approveCompany(c, session!.profile.name))}>승인</Button>
            <Button size="sm" variant="destructive" onClick={() => {
              const reason = window.prompt('반려 사유를 입력하세요') ?? ''
              if (reason) act(() => rejectCompany(c, reason, session!.profile.name))
            }}>반려</Button>
          </div>
        )}
        {c.status !== 'PENDING' && (
          <div className="flex gap-1">
            {c.status === 'APPROVED' && !isLocalMode() && (
              <Button size="sm" variant="secondary" onClick={async () => {
                if (!c.email) { window.alert('거래처에 등록된 이메일이 없습니다.'); return }
                const pw = window.prompt(`${c.name}의 초기 비밀번호 (6자 이상)`, 'demo1234')
                if (!pw) return
                try {
                  await provisionAccount({ email: c.email, password: pw, name: c.name, role: 'ROLE_COMPANY', company_id: c.id })
                  window.alert(`계정 생성 완료 — ${c.email} / ${pw} 로 로그인할 수 있습니다.`)
                } catch (err) {
                  window.alert(err instanceof Error ? err.message : '계정 생성에 실패했습니다.')
                }
              }}>계정 생성</Button>
            )}
            <Button size="sm" variant="outline" onClick={async () => {
              if (window.confirm(`${c.name}을(를) 삭제(숨김)할까요?`)) {
                await getBackend().update('companies', c.id, { deleted_at: new Date().toISOString() })
                reload()
              }
            }}>삭제</Button>
          </div>
        )}
      </td>
    </tr>
  )

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-bold text-slate-900">승인 대기 ({pending.length})</h3>
        {pending.length === 0 ? <p className="mt-2 text-sm text-slate-400">대기 중인 가입 신청이 없습니다.</p> : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2">업체명</th><th className="px-4 py-2">사업자번호</th><th className="px-4 py-2">담당자</th><th className="px-4 py-2">지역</th><th className="px-4 py-2">영업담당</th><th className="px-4 py-2">상태</th><th className="px-4 py-2">처리</th></tr>
            </thead>
            <tbody>{pending.map(c => <Row key={c.id} c={c} />)}</tbody>
          </table>
        )}
      </Card>
      <Card>
        <h3 className="font-bold text-slate-900">전체 거래처 ({approved.length})</h3>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr><th className="px-4 py-2">업체명</th><th className="px-4 py-2">사업자번호</th><th className="px-4 py-2">담당자</th><th className="px-4 py-2">지역</th><th className="px-4 py-2">영업담당</th><th className="px-4 py-2">상태</th><th className="px-4 py-2">처리</th></tr>
          </thead>
          <tbody>{approved.map(c => <Row key={c.id} c={c} />)}</tbody>
        </table>
      </Card>
    </div>
  )
}

// ---------- 직원 ----------
function EmployeesAdmin() {
  const [masters, setMasters] = useState<Masters | null>(null)
  const reload = () => loadMasters().then(setMasters)
  useEffect(() => { reload() }, [])
  const empty = { name: '', title: '', department_id: '', role: 'ROLE_SALES', phone: '', email: '', password: 'demo1234' }
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  if (!masters) return <p className="text-sm text-slate-400">불러오는 중…</p>

  async function addEmployee(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setNotice('')
    try {
      const emp = await getBackend().insert<Employee>('employees', {
        name: form.name, title: form.title, department_id: form.department_id,
        role: form.role, phone: form.phone, email: form.email,
        status: 'AVAILABLE', active: true,
      })
      // Supabase 모드: 로그인 계정(Auth + profiles)까지 함께 생성
      const uid = await provisionAccount({
        email: form.email, password: form.password || 'demo1234',
        name: form.name, role: form.role as Employee['role'], employee_id: emp.id,
      })
      if (uid) await getBackend().update('employees', emp.id, { user_id: uid })
      setNotice(isLocalMode()
        ? `${form.name} 직원 추가 완료 — 데모 비밀번호(demo1234)로 바로 로그인 가능합니다.`
        : `${form.name} 직원 계정 생성 완료 — ${form.email} / ${form.password || 'demo1234'} 로 로그인할 수 있습니다.`)
      setForm(empty)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '추가에 실패했습니다.')
    }
    setBusy(false); reload()
  }
  async function setStatus(emp: Employee, status: EmpStatus) {
    await getBackend().update('employees', emp.id, { status })
    reload()
  }

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-bold text-slate-900">직원 목록 ({masters.employees.length}명)</h3>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr><th className="px-4 py-2">이름</th><th className="px-4 py-2">부서</th><th className="px-4 py-2">권한</th><th className="px-4 py-2">연락처</th><th className="px-4 py-2">상태(자동배정)</th><th className="px-4 py-2" /></tr>
          </thead>
          <tbody>
            {masters.employees.map(e => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{e.name} {e.title}</td>
                <td className="px-4 py-3">{masters.departments.find(d => d.id === e.department_id)?.name}</td>
                <td className="px-4 py-3 text-xs">{ROLE_LABEL[e.role]}</td>
                <td className="px-4 py-3 text-xs">{e.phone}<br />{e.email}</td>
                <td className="px-4 py-3">
                  <select value={e.status} onChange={ev => setStatus(e, ev.target.value as EmpStatus)}
                    className={cn('rounded-md border px-2 py-1 text-xs font-semibold',
                      e.status === 'AVAILABLE' ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : e.status === 'BUSY' ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : e.status === 'AWAY' ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-slate-300 bg-slate-100 text-slate-500')}>
                    {(Object.keys(EMP_STATUS_LABEL) as EmpStatus[]).map(s => (
                      <option key={s} value={s}>{EMP_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  {(e.status === 'AWAY' || e.status === 'OFF') && (
                    <p className="mt-1 text-[10px] text-amber-600">자동배정 제외</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (window.confirm(`${e.name} 직원을 비활성화할까요?`)) {
                      await getBackend().update('employees', e.id, { active: false, deleted_at: new Date().toISOString() })
                      reload()
                    }
                  }}>비활성</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h3 className="font-bold text-slate-900">새 직원 추가</h3>
        <form onSubmit={addEmployee} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="이름" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></Field>
          <Field label="직급"><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="과장" /></Field>
          <Field label="부서" required>
            <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.department_id}
              onChange={e => {
                const dep = masters.departments.find(d => d.id === e.target.value)
                setForm(f => ({ ...f, department_id: e.target.value, role: dep ? (`ROLE_${dep.code}` as Employee['role']) : f.role }))
              }} required>
              <option value="">선택</option>
              {masters.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="전화번호"><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="이메일" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></Field>
          <Field label="초기 비밀번호" required><Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} /></Field>
          <div className="flex items-end"><Button type="submit" disabled={busy}>{busy ? '추가 중…' : '추가'}</Button></div>
        </form>
        {notice && <p className="mt-2 text-xs font-medium text-blue-600">{notice}</p>}
        <p className="mt-2 text-xs text-slate-400">추가하면 로그인 계정(이메일 + 초기 비밀번호)이 함께 생성되며, 직원은 즉시 로그인할 수 있습니다.</p>
      </Card>
    </div>
  )
}

// ---------- 오류코드 ----------
function ErrorCodesAdmin() {
  const empty = { machine_category: '', code: '', title: '', expected_cause: '', customer_check: '', action1: '', action2: '', action3: '', caution: '' }
  const [items, setItems] = useState<ErrorCode[] | null>(null)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const reload = () => getBackend().select<ErrorCode>('error_codes').then(r => setItems(r.filter(x => x.active !== false)))
  useEffect(() => { reload() }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    const row = { ...form, machine_category: form.machine_category || null }
    if (editId) await getBackend().update('error_codes', editId, row)
    else await getBackend().insert('error_codes', row)
    setForm(empty); setEditId(null); reload()
  }
  const setF = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-bold text-slate-900">오류코드 DB ({items?.length ?? 0}건)</h3>
        {!items?.length ? <EmptyState title="등록된 오류코드가 없습니다" /> : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2">코드</th><th className="px-4 py-2">머신</th><th className="px-4 py-2">설명</th><th className="px-4 py-2" /></tr>
            </thead>
            <tbody>
              {items.map(ec => (
                <tr key={ec.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-bold">{ec.code}</td>
                  <td className="px-4 py-3 text-xs">{ec.machine_category ?? '공통'}</td>
                  <td className="px-4 py-3">{ec.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditId(ec.id)
                        setForm({
                          machine_category: ec.machine_category ?? '', code: ec.code, title: ec.title,
                          expected_cause: ec.expected_cause ?? '', customer_check: ec.customer_check ?? '',
                          action1: ec.action1 ?? '', action2: ec.action2 ?? '', action3: ec.action3 ?? '',
                          caution: ec.caution ?? '',
                        })
                      }}>수정</Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        if (window.confirm(`오류코드 ${ec.code}를 비활성화할까요?`)) {
                          await getBackend().update('error_codes', ec.id, { active: false }); reload()
                        }
                      }}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card>
        <h3 className="font-bold text-slate-900">{editId ? '오류코드 수정' : '오류코드 추가'}</h3>
        <form onSubmit={save} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="머신 분류">
            <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.machine_category} onChange={setF('machine_category')}>
              <option value="">공통</option>
              {MACHINE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="오류번호" required><Input value={form.code} onChange={setF('code')} required /></Field>
          <Field label="오류 설명" required><Input value={form.title} onChange={setF('title')} required /></Field>
          <Field label="예상 원인"><Input value={form.expected_cause} onChange={setF('expected_cause')} /></Field>
          <Field label="고객 확인사항"><Textarea rows={2} value={form.customer_check} onChange={setF('customer_check')} /></Field>
          <Field label="주의사항"><Textarea rows={2} value={form.caution} onChange={setF('caution')} /></Field>
          {(['action1', 'action2', 'action3'] as const).map((k, i) => (
            <Field key={k} label={`조치 ${i + 1}`}><Textarea rows={2} value={form[k]} onChange={setF(k)} /></Field>
          ))}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{editId ? '수정 저장' : '추가'}</Button>
            {editId && <Button type="button" variant="outline" onClick={() => { setEditId(null); setForm(empty) }}>취소</Button>}
          </div>
        </form>
      </Card>
    </div>
  )
}

// ---------- 공통 단순 CRUD 팩토리 ----------
interface ColDef<T> { label: string; render: (row: T) => React.ReactNode }
function SimpleCrud<T extends { id: string }>({ table, title, columns, FormFields, toRow, softField = 'deleted_at' }: {
  table: string; title: string
  columns: ColDef<T>[]
  FormFields: (props: { form: any; setForm: (f: any) => void }) => React.ReactNode
  toRow: (form: any) => any
  softField?: 'deleted_at' | 'active'
}) {
  const emptyForm: any = {}
  const [items, setItems] = useState<T[] | null>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const reload = () => getBackend().select<any>(table).then(rows =>
    setItems(rows.filter((r: any) => softField === 'active' ? r.active !== false : !r.deleted_at)))
  useEffect(() => { reload() }, [table])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (editId) await getBackend().update(table, editId, toRow(form))
    else await getBackend().insert(table, toRow(form))
    setForm(emptyForm); setEditId(null); setShowForm(false); reload()
  }
  async function remove(row: T) {
    if (!window.confirm('삭제(숨김)할까요?')) return
    await getBackend().update(table, row.id, softField === 'active' ? { active: false } : { deleted_at: new Date().toISOString() })
    reload()
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{title} ({items?.length ?? 0})</h3>
          <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>추가</Button>
        </div>
        {!items?.length ? <p className="mt-2 text-sm text-slate-400">등록된 항목이 없습니다.</p> : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>{columns.map(c => <th key={c.label} className="px-4 py-2">{c.label}</th>)}<th className="px-4 py-2" /></tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  {columns.map(c => <td key={c.label} className="px-4 py-3">{c.render(row)}</td>)}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditId(row.id); setForm({ ...(row as any) }); setShowForm(true) }}>수정</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(row)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {showForm && (
        <Card>
          <h3 className="font-bold text-slate-900">{editId ? '수정' : '추가'}</h3>
          <form onSubmit={save} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormFields form={form} setForm={setForm} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">{editId ? '수정 저장' : '추가'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null) }}>취소</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

const TextF = ({ form, setForm, k, label, required }: any) => (
  <Field label={label} required={required}>
    <Input value={form[k] ?? ''} onChange={(e: any) => setForm({ ...form, [k]: e.target.value })} required={required} />
  </Field>
)
const AreaF = ({ form, setForm, k, label }: any) => (
  <Field label={label}>
    <Textarea rows={2} value={form[k] ?? ''} onChange={(e: any) => setForm({ ...form, [k]: e.target.value })} />
  </Field>
)

function EventsAdmin() {
  return (
    <SimpleCrud<EventItem> table="events" title="이벤트"
      columns={[
        { label: '제목', render: r => <span className="font-medium">{r.title}</span> },
        { label: '행사조건', render: r => r.condition },
        { label: '기간', render: r => `${fmtDate(r.start_date)} ~ ${fmtDate(r.end_date)}` },
      ]}
      toRow={f => ({ title: f.title, content: f.content, image_url: f.image_url, condition: f.condition, start_date: f.start_date, end_date: f.end_date, active: true })}
      FormFields={({ form, setForm }) => (
        <>
          <TextF form={form} setForm={setForm} k="title" label="제목" required />
          <TextF form={form} setForm={setForm} k="condition" label="행사조건 (예: 10+1, 20% 할인)" />
          <AreaF form={form} setForm={setForm} k="content" label="내용" />
          <TextF form={form} setForm={setForm} k="image_url" label="이미지 URL" />
          <Field label="시작일"><Input type="date" value={form.start_date ?? ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="종료일"><Input type="date" value={form.end_date ?? ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></Field>
        </>
      )} />
  )
}
function NoticesAdmin() {
  return (
    <SimpleCrud<Notice> table="notices" title="공지사항"
      columns={[
        { label: '제목', render: r => <span className="font-medium">{r.pinned ? '📌 ' : ''}{r.title}</span> },
        { label: '등록일', render: r => fmtDate(r.created_at) },
      ]}
      toRow={f => ({ title: f.title, content: f.content, pinned: !!f.pinned })}
      FormFields={({ form, setForm }) => (
        <>
          <TextF form={form} setForm={setForm} k="title" label="제목" required />
          <AreaF form={form} setForm={setForm} k="content" label="내용" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} /> 상단 고정
          </label>
        </>
      )} />
  )
}
function FaqsAdmin() {
  return (
    <SimpleCrud<Faq> table="faqs" title="FAQ" softField="active"
      columns={[
        { label: '분류', render: r => r.category },
        { label: '질문', render: r => <span className="font-medium">{r.question}</span> },
      ]}
      toRow={f => ({ category: f.category, question: f.question, answer: f.answer, active: true })}
      FormFields={({ form, setForm }) => (
        <>
          <TextF form={form} setForm={setForm} k="category" label="분류" />
          <TextF form={form} setForm={setForm} k="question" label="질문" required />
          <AreaF form={form} setForm={setForm} k="answer" label="답변" />
        </>
      )} />
  )
}
function ProductsAdmin() {
  return (
    <SimpleCrud<Product> table="products" title="제품"
      columns={[
        { label: '제품명', render: r => <span className="font-medium">{r.name}</span> },
        { label: '분류', render: r => r.category },
        { label: '모델번호', render: r => r.model_no },
        { label: '가격', render: r => fmtMoney(r.price) },
      ]}
      toRow={f => ({ name: f.name, category: f.category, model_no: f.model_no, price: f.price ? Number(f.price) : null, active: true })}
      FormFields={({ form, setForm }) => (
        <>
          <TextF form={form} setForm={setForm} k="name" label="제품명" required />
          <TextF form={form} setForm={setForm} k="category" label="분류" />
          <TextF form={form} setForm={setForm} k="model_no" label="모델번호" />
          <Field label="가격"><Input type="number" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value })} /></Field>
        </>
      )} />
  )
}
function PartsAdmin() {
  return (
    <SimpleCrud<Part> table="parts" title="부품"
      columns={[
        { label: '부품명', render: r => <span className="font-medium">{r.name}</span> },
        { label: '부품번호', render: r => r.part_no },
        { label: '가격', render: r => fmtMoney(r.price) },
        { label: '재고', render: r => <span className={cn('font-bold', r.stock_qty > 0 ? 'text-emerald-600' : 'text-red-600')}>{r.stock_qty}</span> },
      ]}
      toRow={f => ({ name: f.name, part_no: f.part_no, price: f.price ? Number(f.price) : null, stock_qty: Number(f.stock_qty ?? 0), active: true })}
      FormFields={({ form, setForm }) => (
        <>
          <TextF form={form} setForm={setForm} k="name" label="부품명" required />
          <TextF form={form} setForm={setForm} k="part_no" label="부품번호" />
          <Field label="가격"><Input type="number" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="재고수량"><Input type="number" value={form.stock_qty ?? 0} onChange={e => setForm({ ...form, stock_qty: e.target.value })} /></Field>
        </>
      )} />
  )
}
function MachinesAdmin() {
  return (
    <SimpleCrud<MachineModel> table="machine_models" title="머신 모델" softField="active"
      columns={[
        { label: '제조사', render: r => r.manufacturer },
        { label: '모델명', render: r => <span className="font-medium">{r.name}</span> },
        { label: '분류', render: r => r.category },
      ]}
      toRow={f => ({ manufacturer: f.manufacturer, name: f.name, category: f.category, active: true })}
      FormFields={({ form, setForm }) => (
        <>
          <TextF form={form} setForm={setForm} k="manufacturer" label="제조사" />
          <TextF form={form} setForm={setForm} k="name" label="모델명" required />
          <Field label="분류" required>
            <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.category ?? ''} onChange={e => setForm({ ...form, category: e.target.value })} required>
              <option value="">선택</option>
              {MACHINE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </>
      )} />
  )
}

// ---------- 설정 ----------
function SettingsAdmin() {
  const [mode, setMode] = useState<AssignMethod>('LOAD_BALANCED')
  useEffect(() => { getBackend().getSetting('assignment_mode').then(v => v && setMode(v)) }, [])
  return (
    <Card>
      <h3 className="font-bold text-slate-900">기술팀 자동배정 방식</h3>
      <p className="mt-1 text-sm text-slate-500">AS 접수 시 기술팀 직원에게 티켓을 배정하는 방식을 선택합니다. 부재중(AWAY)/퇴근(OFF) 직원은 자동배정에서 제외됩니다.</p>
      <div className="mt-4 space-y-2">
        {([
          ['LOAD_BALANCED', 'LOAD_BALANCED — 현재 진행중 티켓이 가장 적은 직원에게 우선 배정 (기본)'],
          ['ROUND_ROBIN', 'ROUND_ROBIN — 직원에게 순서대로 돌아가며 배정'],
          ['MANUAL', 'MANUAL — 자동배정하지 않고 관리자가 수동 배정'],
        ] as [AssignMethod, string][]).map(([v, label]) => (
          <label key={v} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <input type="radio" name="assign" checked={mode === v} onChange={() => setMode(v)} className="accent-blue-600" />
            {label}
          </label>
        ))}
      </div>
      <Button className="mt-4" onClick={async () => {
        await getBackend().setSetting('assignment_mode', mode)
        window.alert('저장되었습니다.')
      }}>저장</Button>
    </Card>
  )
}
