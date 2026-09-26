// 관리자가 직원/거래처의 로그인 계정(Auth 사용자 + profiles)을 생성한다.
// 현재 로그인된 관리자 세션을 덮어쓰지 않도록 세션을 저장하지 않는 임시 클라이언트를 사용한다.
// 전제: Supabase 대시보드에서 Confirm email OFF (즉시 세션 발급 상태)
import { createClient } from '@supabase/supabase-js'
import { isLocalMode } from '@/lib/db'
import type { Role } from '@/lib/types'

export interface ProvisionInput {
  email: string
  password: string
  name: string
  role: Role
  company_id?: string | null
  employee_id?: string | null
}

/** 생성된 auth user id를 반환. 로컬 데모 모드에서는 null 반환(별도 처리 불필요). */
export async function provisionAccount(input: ProvisionInput): Promise<string | null> {
  if (isLocalMode()) return null
  const env = (import.meta as any).env ?? {}
  const url = env.VITE_SUPABASE_URL as string
  const key = env.VITE_SUPABASE_ANON_KEY as string
  const tmp = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'eiden-provision' },
  })
  const { data, error } = await tmp.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { name: input.name } },
  })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      throw new Error('이미 가입된 이메일입니다. 기존 계정으로 로그인할 수 있습니다.')
    }
    throw new Error('계정 생성 실패: ' + error.message)
  }
  if (!data.user) throw new Error('계정 생성에 실패했습니다.')
  // 새 사용자 세션(임시 클라이언트)으로 profiles insert — RLS 정책 id = auth.uid() 통과
  const { error: pErr } = await tmp.from('profiles').insert({
    id: data.user.id,
    role: input.role,
    name: input.name,
    company_id: input.company_id ?? null,
    employee_id: input.employee_id ?? null,
  })
  if (pErr && !/duplicate/i.test(pErr.message)) {
    throw new Error('프로필 연결 실패: ' + pErr.message)
  }
  return data.user.id
}
