/**
 * 데모 계정을 Supabase Auth에 생성하고 profiles/employees를 연결한다.
 * service_role 키를 사용하므로 로컬에서만 실행할 것 (키는 .env에만 저장, 커밋 금지).
 *
 * 실행: npx tsx scripts/create-demo-users.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const URL = env.VITE_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE) throw new Error('.env에 VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요')

const PASSWORD = 'demo1234'
const E = (n: string) => `e0000000-0000-0000-0000-0000000000${n}`

type Account = {
  email: string
  name: string
  role: string
  company_id?: string
  employee_id?: string
}

const ACCOUNTS: Account[] = [
  { email: 'cafe@ondo.kr', name: '카페 온도', role: 'ROLE_COMPANY', company_id: 'f0000000-0000-0000-0000-000000000001' },
  { email: 'brew@lab.kr', name: '브루잉랩 판교', role: 'ROLE_COMPANY', company_id: 'f0000000-0000-0000-0000-000000000002' },
  { email: 'sales1@eiden.kr', name: '장원준', role: 'ROLE_SALES', employee_id: E('01') },
  { email: 'sales2@eiden.kr', name: '강재명', role: 'ROLE_SALES', employee_id: E('02') },
  { email: 'sales3@eiden.kr', name: '유지혁', role: 'ROLE_SALES', employee_id: E('03') },
  { email: 'sa1@eiden.kr', name: '홍준표', role: 'ROLE_SALES_ADMIN', employee_id: E('04') },
  { email: 'sa2@eiden.kr', name: '조현진', role: 'ROLE_SALES_ADMIN', employee_id: E('05') },
  { email: 'sa3@eiden.kr', name: '황여진', role: 'ROLE_SALES_ADMIN', employee_id: E('06') },
  { email: 'parts1@eiden.kr', name: '김태용', role: 'ROLE_PARTS', employee_id: E('07') },
  { email: 'tech1@eiden.kr', name: '오성민', role: 'ROLE_TECH', employee_id: E('08') },
  { email: 'tech2@eiden.kr', name: '배준석', role: 'ROLE_TECH', employee_id: E('09') },
  { email: 'tech3@eiden.kr', name: '신예린', role: 'ROLE_TECH', employee_id: E('0a') },
  { email: 'tech4@eiden.kr', name: '문기철', role: 'ROLE_TECH', employee_id: E('0b') },
  { email: 'tech5@eiden.kr', name: '한솔비', role: 'ROLE_TECH', employee_id: E('0c') },
  { email: 'admin@eiden.kr', name: '시스템관리자', role: 'ROLE_ADMIN', employee_id: E('0d') },
]

const headers = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
}

async function findUserId(email: string): Promise<string | null> {
  // admin list users (페이지네이션 기본 50명이면 충분)
  const res = await fetch(`${URL}/auth/v1/admin/users?page=1&per_page=200`, { headers })
  if (!res.ok) throw new Error(`list users 실패: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { users?: { id: string; email?: string }[] } | { id: string; email?: string }[]
  const users = Array.isArray(data) ? data : data.users ?? []
  return users.find((u) => u.email === email)?.id ?? null
}

async function createUser(a: Account): Promise<string> {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: a.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: a.name },
    }),
  })
  if (res.ok) {
    const u = (await res.json()) as { id: string }
    return u.id
  }
  const body = await res.text()
  if (res.status === 422 || /already|exists|registered/i.test(body)) {
    const id = await findUserId(a.email)
    if (id) return id
  }
  throw new Error(`createUser ${a.email} 실패: ${res.status} ${body}`)
}

async function upsertProfile(a: Account, id: string) {
  const res = await fetch(`${URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id,
      role: a.role,
      name: a.name,
      company_id: a.company_id ?? null,
      employee_id: a.employee_id ?? null,
    }),
  })
  if (!res.ok) throw new Error(`upsertProfile ${a.email} 실패: ${res.status} ${await res.text()}`)
}

async function linkEmployee(a: Account, id: string) {
  if (!a.employee_id) return
  const res = await fetch(`${URL}/rest/v1/employees?id=eq.${a.employee_id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ user_id: id }),
  })
  if (!res.ok) throw new Error(`linkEmployee ${a.email} 실패: ${res.status} ${await res.text()}`)
}

let ok = 0
for (const a of ACCOUNTS) {
  const id = await createUser(a)
  await upsertProfile(a, id)
  await linkEmployee(a, id)
  ok++
  console.log(`OK ${a.email} (${a.role}) -> ${id}`)
}
console.log(`\n${ok}/${ACCOUNTS.length} 계정 생성·연결 완료 (비밀번호: ${PASSWORD})`)
