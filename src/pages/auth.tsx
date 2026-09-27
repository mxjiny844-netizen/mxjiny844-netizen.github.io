// 로그인 / 거래처 가입 신청
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { isLocalMode, roleHome } from '@/lib/db'
import { signupCompany, loadMasters, type Masters } from '@/lib/api'
import { Field } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEMO_PASSWORD } from '@/lib/seed'

export function LoginPage() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const s = await signIn(email, password)
      nav(roleHome(s.profile.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50">
      {/* AI Studio 디자인 이식 — 네이비 브랜드 헤더 */}
      <div className="bg-gradient-to-b from-eiden-navy-dark to-eiden-navy px-6 pb-7 pt-16">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-eiden-cyan" />
          <span className="text-[11px] font-bold tracking-wider text-eiden-cyan">EIDEN B2B PARTNER PORTAL</span>
        </div>
        <h1 className="mt-2 text-[22px] font-bold text-white">에이든 파트너 로그인</h1>
        <p className="mt-1 text-xs text-slate-300">발주·견적·재고·부품·AS 및 오류코드 자가진단 통합 시스템</p>
      </div>

      <div className="flex-1 px-6 py-8">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="이메일" required>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="가입 시 등록한 이메일" required />
        </Field>
        <Field label="비밀번호" required>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호" required />
        </Field>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full bg-eiden-navy hover:bg-eiden-navy-light" size="lg" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </Button>
        <p className="text-center text-sm text-slate-500">
          처음 이용하시나요?{' '}
          <Link to="/signup" className="font-semibold text-eiden-blue">거래처 가입 신청</Link>
        </p>
      </form>

      {isLocalMode() && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
          <p className="font-bold">로컬 데모 모드</p>
          <p className="mt-1">Supabase 미연결 상태로 브라우저에 데이터가 저장됩니다. 데모 비밀번호: <b>{DEMO_PASSWORD}</b></p>
          <ul className="mt-2 space-y-0.5">
            <li>거래처: cafe@ondo.kr (카페 온도)</li>
            <li>영업: sales1@eiden.kr (장원준 부장)</li>
            <li>자재: parts1@eiden.kr (김태영 과장)</li>
            <li>기술: tech1@eiden.kr (오성민 차장)</li>
            <li>관리자: admin@eiden.kr</li>
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}

export function SignupPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    name: '', business_no: '', manager: '', phone: '', email: '', region: '', sales_rep_id: '', password: '',
  })
  const [masters, setMasters] = useState<Masters | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { loadMasters().then(setMasters) }, [])
  const salesReps = masters?.employees.filter(e => e.role === 'ROLE_SALES') ?? []

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const m = masters ?? await loadMasters()
      await signupCompany({ ...form, sales_rep_id: form.sales_rep_id || null }, m)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입 신청에 실패했습니다.')
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">✅</p>
          <h2 className="mt-3 text-xl font-bold text-slate-900">가입 신청이 접수되었습니다</h2>
          <p className="mt-2 text-sm text-slate-500">
            EIDEN 담당자가 승인하면 등록하신 이메일과 비밀번호로 로그인할 수 있습니다.
          </p>
          <Button className="mt-6 w-full" onClick={() => nav('/login')}>로그인 화면으로</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-slate-50 px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900">거래처 가입 신청</h1>
      <p className="mt-1 text-sm text-slate-500">승인 후 서비스를 이용할 수 있습니다.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="업체명" required><Input value={form.name} onChange={set('name')} required /></Field>
        <Field label="사업자번호" required><Input value={form.business_no} onChange={set('business_no')} placeholder="000-00-00000" required /></Field>
        <Field label="담당자" required><Input value={form.manager} onChange={set('manager')} required /></Field>
        <Field label="전화번호" required><Input value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" required /></Field>
        <Field label="이메일" required><Input type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label="비밀번호" required>
          <Input type="password" value={form.password} onChange={set('password')}
            placeholder="로그인에 사용할 비밀번호 (6자 이상)" minLength={6} required />
          <p className="mt-1 text-xs text-slate-400">승인 후 이 이메일과 비밀번호로 로그인합니다.</p>
        </Field>
        <Field label="지역" required><Input value={form.region} onChange={set('region')} placeholder="예: 서울 강남구" required /></Field>
        <Field label="담당 영업사원">
          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.sales_rep_id} onChange={set('sales_rep_id')}>
            <option value="">선택 안 함</option>
            {salesReps.map(r => <option key={r.id} value={r.id}>{r.name} {r.title}</option>)}
          </select>
        </Field>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? '신청 중…' : '가입 신청'}
        </Button>
        <p className="text-center text-sm text-slate-500">
          이미 계정이 있으신가요? <Link to="/login" className="font-semibold text-blue-600">로그인</Link>
        </p>
      </form>
    </div>
  )
}
