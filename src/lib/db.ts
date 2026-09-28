// ============================================================
// 데이터 백엔드 추상화
// - VITE_SUPABASE_URL/ANON_KEY 설정 시: Supabase(Auth/DB/Storage/RLS) 사용
// - 미설정 시: 로컬 데모 모드 (브라우저 localStorage, Seed 데이터 자동 로드)
// 업무 로직(api.ts)은 두 모드에서 동일하게 동작합니다.
// ============================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Company, Employee, Profile, TicketKind, Role,
} from './types'
import { nowIso, uid } from './types'
import {
  seedCompanies, seedDepartments, seedEmployees, seedErrorCodes,
  seedEvents, seedFaqs, seedMachines, seedNotices, seedParts, seedProducts,
  DEMO_PASSWORD,
} from './seed'

export interface Session {
  profile: Profile
  email: string
  company?: Company | null
  employee?: Employee | null
}

export interface Backend {
  mode: 'local' | 'supabase'
  select<T = any>(table: string): Promise<T[]>
  find<T = any>(table: string, id: string): Promise<T | null>
  insert<T = any>(table: string, row: any): Promise<T>
  /** 로그성 insert — RETURNING 없이 수행 (SELECT 정책과 무관하게 동작) */
  insertOnly(table: string, row: any): Promise<void>
  update<T = any>(table: string, id: string, patch: any): Promise<T>
  remove(table: string, id: string): Promise<void>
  getSetting(key: string): Promise<any>
  setSetting(key: string, value: any): Promise<void>
  nextTicketNo(kind: TicketKind): Promise<string>
  signIn(email: string, password: string): Promise<Session>
  signOut(): Promise<void>
  getSession(): Promise<Session | null>
}

// ---------------- 로컬 데모 백엔드 ----------------
const LS_DB = 'eiden-partner-db-v1'
const LS_SESSION = 'eiden-partner-session-v1'

type LocalDB = Record<string, any>

function freshDB(): LocalDB {
  return {
    departments: [...seedDepartments],
    employees: [...seedEmployees],
    companies: [...seedCompanies],
    profiles: [],
    machine_models: [...seedMachines],
    products: [...seedProducts],
    parts: [...seedParts],
    tickets: [],
    ticket_messages: [],
    ticket_attachments: [],
    ticket_history: [],
    error_codes: [...seedErrorCodes],
    self_resolution_logs: [],
    faqs: [...seedFaqs],
    events: [...seedEvents],
    notices: [...seedNotices],
    notifications: [],
    assignment_logs: [],
    audit_logs: [],
    settings: { assignment_mode: 'LOAD_BALANCED' },
    counters: {},
  }
}

class LocalBackend implements Backend {
  mode = 'local' as const
  db: LocalDB

  constructor() {
    try {
      const raw = localStorage.getItem(LS_DB)
      this.db = raw ? JSON.parse(raw) : freshDB()
    } catch {
      this.db = freshDB()
    }
    if (!rawExists()) this.save()
  }
  save() { localStorage.setItem(LS_DB, JSON.stringify(this.db)) }

  async select<T>(table: string): Promise<T[]> {
    return structuredClone((this.db[table] ?? []) as T[])
  }
  async find<T>(table: string, id: string): Promise<T | null> {
    const row = (this.db[table] ?? []).find((r: any) => r.id === id)
    return row ? structuredClone(row) : null
  }
  async insert<T>(table: string, row: any): Promise<T> {
    const full = { id: uid(), created_at: nowIso(), ...row }
    ;(this.db[table] ??= []).push(full)
    this.save()
    return structuredClone(full)
  }
  async insertOnly(table: string, row: any) {
    await this.insert(table, row)
  }
  async update<T>(table: string, id: string, patch: any): Promise<T> {
    const rows = this.db[table] ?? []
    const i = rows.findIndex((r: any) => r.id === id)
    if (i < 0) throw new Error(`레코드를 찾을 수 없습니다: ${table}/${id}`)
    rows[i] = { ...rows[i], ...patch }
    this.save()
    return structuredClone(rows[i])
  }
  async remove(table: string, id: string) {
    this.db[table] = (this.db[table] ?? []).filter((r: any) => r.id !== id)
    this.save()
  }
  async getSetting(key: string) { return this.db.settings?.[key] }
  async setSetting(key: string, value: any) {
    this.db.settings[key] = value
    this.save()
  }
  async nextTicketNo(kind: TicketKind) {
    const prefix = { SALES: 'EIDEN-SALES-', PART: 'EIDEN-PART-', AS: 'EIDEN-AS-' }[kind]
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const key = `${prefix}${day}`
    const n = (this.db.counters[key] ?? 0) + 1
    this.db.counters[key] = n
    this.save()
    return `${key}-${String(n).padStart(4, '0')}`
  }

  // 로컬 데모 인증: Seed 계정 + 데모 비밀번호 (README 참고, 데모 전용)
  async signIn(email: string, password: string): Promise<Session> {
    if (password !== DEMO_PASSWORD) throw new Error('비밀번호가 올바르지 않습니다. (데모 비밀번호: demo1234)')
    const e = email.trim().toLowerCase()
    const employee = this.db.employees.find((x: Employee) => x.email?.toLowerCase() === e && x.active !== false)
    if (employee) {
      const profile: Profile = {
        id: `local-${employee.id}`, role: employee.role, name: employee.name,
        employee_id: employee.id,
      }
      const s: Session = { profile, email: e, employee }
      localStorage.setItem(LS_SESSION, JSON.stringify(s))
      return s
    }
    const company = this.db.companies.find((x: Company) => x.email?.toLowerCase() === e && !x.deleted_at)
    if (company) {
      if (company.status === 'PENDING') throw new Error('가입 승인 대기 중입니다. EIDEN 담당자 승인 후 이용 가능합니다.')
      if (company.status === 'REJECTED') throw new Error(`가입이 반려되었습니다. ${company.reject_reason ?? ''}`)
      const profile: Profile = {
        id: `local-${company.id}`, role: 'ROLE_COMPANY', name: company.manager ?? company.name,
        company_id: company.id,
      }
      const s: Session = { profile, email: e, company }
      localStorage.setItem(LS_SESSION, JSON.stringify(s))
      return s
    }
    throw new Error('등록되지 않은 이메일입니다. 거래처 가입 신청을 먼저 진행해 주세요.')
  }
  async signOut() { localStorage.removeItem(LS_SESSION) }
  async getSession(): Promise<Session | null> {
    try {
      const raw = localStorage.getItem(LS_SESSION)
      if (!raw) return null
      const s: Session = JSON.parse(raw)
      // 최신 회사/직원 정보로 갱신
      if (s.employee) s.employee = this.db.employees.find((e: Employee) => e.id === s.employee!.id) ?? s.employee
      if (s.company) s.company = this.db.companies.find((c: Company) => c.id === s.company!.id) ?? s.company
      if (s.employee) s.profile.name = s.employee.name
      return s
    } catch { return null }
  }
}
function rawExists() { return !!localStorage.getItem(LS_DB) }

// ---------------- Supabase 백엔드 ----------------
class SupabaseBackend implements Backend {
  mode = 'supabase' as const
  sb: SupabaseClient
  constructor(url: string, key: string) { this.sb = createClient(url, key) }

  private q(table: string) { return this.sb.from(table) }
  async select<T>(table: string): Promise<T[]> {
    const { data, error } = await this.q(table).select('*')
    if (error) throw new Error(error.message)
    return (data ?? []) as T[]
  }
  async find<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await this.q(table).select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data as T | null
  }
  async insert<T>(table: string, row: any): Promise<T> {
    const { data, error } = await this.q(table).insert(row).select().single()
    if (error) throw new Error(error.message)
    return data as T
  }
  async insertOnly(table: string, row: any) {
    const { error } = await this.q(table).insert(row)
    if (error) throw new Error(error.message)
  }
  async update<T>(table: string, id: string, patch: any): Promise<T> {
    const { data, error } = await this.q(table).update(patch).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as T
  }
  async remove(table: string, id: string) {
    const { error } = await this.q(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
  async getSetting(key: string) {
    const { data } = await this.q('settings').select('value').eq('key', key).maybeSingle()
    return data?.value
  }
  async setSetting(key: string, value: any) {
    const { error } = await this.q('settings').upsert({ key, value })
    if (error) throw new Error(error.message)
  }
  async nextTicketNo(kind: TicketKind) {
    const { data, error } = await this.sb.rpc('gen_ticket_no', { p_kind: kind })
    if (error) throw new Error(error.message)
    return data as string
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error('로그인 실패: 이메일/비밀번호를 확인해 주세요.')
    return this.buildSession(data.user!.id, email)
  }
  private async buildSession(userId: string, email: string): Promise<Session> {
    const profile = await this.find<Profile>('profiles', userId)
    if (!profile) throw new Error('프로필이 없습니다. 관리자에게 문의하세요.')
    const company = profile.company_id ? await this.find<Company>('companies', profile.company_id) : null
    const employee = profile.employee_id ? await this.find<Employee>('employees', profile.employee_id) : null
    if (company && company.status === 'PENDING') throw new Error('가입 승인 대기 중입니다.')
    return { profile, email, company, employee }
  }
  async signOut() { await this.sb.auth.signOut() }
  async getSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getUser()
    if (!data.user) return null
    try { return await this.buildSession(data.user.id, data.user.email ?? '') }
    catch { return null }
  }
}

// ---------------- 싱글턴 ----------------
let backend: Backend | null = null
export function getBackend(): Backend {
  if (!backend) {
    const env = (import.meta as any).env ?? {}
    const url = env.VITE_SUPABASE_URL as string | undefined
    const key = env.VITE_SUPABASE_ANON_KEY as string | undefined
    const usable = url && key && !url.includes('your-project')
    backend = usable ? new SupabaseBackend(url, key) : new LocalBackend()
  }
  return backend
}

export const isLocalMode = () => getBackend().mode === 'local'
/** Supabase 클라이언트 직접 접근 (비밀번호 재설정 등 Auth 기능용). 로컬 모드면 null */
export function sbClient(): SupabaseClient | null {
  const backend = getBackend()
  return backend.mode === 'supabase' ? (backend as SupabaseBackend).sb : null
}
// 로그인 후 모든 역할이 동일한 홈 화면으로 이동 (직원/관리자는 홈 우측 상단 '관리자 모드'로 전환)
export const roleHome = (_role: Role) => '/'
