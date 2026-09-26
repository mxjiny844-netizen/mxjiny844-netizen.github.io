# EIDEN Partner

EIDEN 거래처와 사내 직원 간의 반복적인 전화·카카오톡 문의를 줄이기 위한 **B2B 업무 시스템(PWA)**입니다.

거래처가 직접 문의를 남기고 진행 상태를 확인하며, 간단한 기술 문제는 오류코드 자가진단으로 전화 없이 해결할 수 있습니다.

## 주요 기능

### 거래처 (모바일 우선)
- 큰 카드 버튼 메뉴: 발주 / 견적 / 재고 / 부품 / AS 접수 / 기타 문의 / 내 문의 / 이벤트·공지
- **AS 오류코드 자가진단**: 오류코드 입력 → 등록된 DB의 원인·조치 1~3 안내 → 해결 시 자가해결 로그 기록, 미해결 시 **입력 내용 그대로 AS 티켓 자동 전환**
- 문의별 대화(텍스트/견적금액/전화예정 확인)와 진행 이력(타임라인) 확인
- 사진·동영상 첨부, 긴급 AS 표시, 진행중 이벤트 배너, 앱 내 알림

### 사내 직원 (PC 사이드바)
- 대시보드: 오늘 접수 / 미처리 / 진행중 / 긴급 AS / 내게 배정된 티켓
- 문의함: 유형·상태·내 담당 필터, 부서별 문의만 표시
- 답변: 텍스트답변 / 견적금액 / 전화예정 / **내부메모(거래처 비공개)** / 완료처리
- 상태 관리: 신규 접수 → 확인중 → 채팅답변 → 전화예정 → 부품확인 → 출장필요 → 처리완료 → 종료
- 통합검색: 업체명·전화번호·문의번호·제품·부품번호·시리얼번호·오류코드·담당자
- 통계: 기간별/유형별/직원별/부서별, 평균처리시간, 머신별 AS, 오류코드별 발생건수, 자가해결 성공·전환율

### 관리자
- 거래처 가입 승인/반려, 직원 추가·부재설정(AWAY/OFF는 자동배정 제외)
- 오류코드 DB, FAQ, 이벤트, 공지, 제품, 부품, 머신 모델 CRUD (Soft Delete 우선)
- 기술팀 자동배정 방식 설정: **LOAD_BALANCED(기본)** / ROUND_ROBIN / MANUAL

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend/DB**: Supabase (Authentication + PostgreSQL + Storage + Row Level Security)
- **PWA**: vite-plugin-pwa (Manifest, 홈 화면 설치, 오프라인 캐시)
- 두 가지 실행 모드:
  - **로컬 데모 모드** (기본): Supabase 미설정 시 브라우저 localStorage에 Seed 데이터로 즉시 체험
  - **Supabase 모드**: `.env`에 프로젝트 키 입력 시 실제 DB/인증으로 동작. 업무 로직은 동일 코드 사용

## 실행 방법

```bash
npm install
npm run dev        # http://localhost:3000
```

### 데모 계정 (비밀번호 공통: `demo1234`)

| 구분 | 이메일 | 이름 |
|---|---|---|
| 거래처 | cafe@ondo.kr | 카페 온도 김민지 |
| 거래처 | brew@lab.kr | 브루잉랩 판교 이승훈 |
| 영업 | sales1@eiden.kr | 장원준 부장 |
| 영업관리 | sa1@eiden.kr | 홍준표 부장 |
| 자재 | parts1@eiden.kr | 김태용 과장 |
| 기술 | tech1@eiden.kr | 오성민 차장 |
| 관리자 | admin@eiden.kr | 시스템관리자 |

> 로컬 데모 모드와 현재 운영 Supabase(projects/EIDEN APP) 양쪽에 동일하게 생성되어 있습니다. 운영 계정 생성은 `npx tsx scripts/create-demo-users.ts`로 재실행 가능합니다(서비스 키 필요).

### Supabase 연결 (운영)

현재 운영 인스턴스: `https://uzckctzkllvkzlzvlete.supabase.co` (마이그레이션 0001~0003 + attachments 버킷 적용 완료, Confirm email OFF)

새 프로젝트에 다시 적용하려면:

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/0001_init.sql` → `0002_seed.sql` → `0003_profiles_storage.sql` 순서로 실행 (버킷·profiles 정책 포함)
3. Authentication → Providers → Email에서 **Confirm email OFF** (관리자 화면 계정 생성이 즉시 로그인 가능한 계정을 만들기 위해 필요)
4. `.env.example`을 복사해 `.env` 생성 후 URL과 anon key 입력

```bash
cp .env.example .env
# VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 입력
```

5. 직원 계정은 관리자 화면 「직원 → 새 직원 추가」에서 이메일+초기 비밀번호로 생성(로그인 계정 자동 생성), 거래처 계정은 「거래처 → 계정 생성」 버튼으로 생성

## 배포 (거래처에 URL/QR 공유)

**현재 운영 URL: https://mxjiny844-netizen.github.io/** (GitHub Pages, `gh-pages` 브랜치)

재배포 절차:

```bash
npm run build
cp dist/index.html dist/404.html   # SPA 딥링크 대응
touch dist/.nojekyll
# dist 내용을 gh-pages 브랜치에 푸시
```

- 배포가 완료되면 **URL을 카카오톡/문자로 보내거나, 앱의 「더보기 → 동료에게 공유하기」 화면의 QR 코드**를 거래처에 전달하면 됩니다.

## 휴대폰 홈 화면 설치 (PWA)

- **Android(Chrome)**: 접속 후 메뉴(⋮) → 「홈 화면에 추가」 또는 설치 배너
- **iPhone(Safari)**: 공유 버튼 → 「홈 화면에 추가」
- 앱 내 「더보기」 화면에서도 설치 안내와 설치 버튼(지원 브라우저)을 제공합니다.
- HTTPS에서만 설치가 가능합니다 (localhost 제외). 배포 시 HTTPS는 자동 적용됩니다.

## 관리자 사용법 요약

1. `admin@eiden.kr`(Supabase 모드: ROLE_ADMIN 계정)으로 로그인 → 좌측 「관리자」
2. **거래처**: 가입 신청 승인/반려, 승인 후 「계정 생성」 버튼으로 거래처 로그인 계정 발급, 삭제(숨김)
3. **직원**: 신규 직원 추가 시 이메일+초기 비밀번호로 **로그인 계정이 자동 생성**되며 즉시 접속 가능, 상태 변경(근무중/처리중/부재중/퇴근) — 부재중·퇴근은 자동배정 제외
4. **오류코드**: 코드·머신분류·예상원인·고객확인사항·조치1~3·주의사항 등록/수정 → 거래처 자가진단에 즉시 반영
5. **설정**: 기술팀 자동배정 방식 변경
6. 문의번호는 `EIDEN-SALES-YYYYMMDD-XXXX` / `EIDEN-PART-...` / `EIDEN-AS-...` 형식으로 자동 부여됩니다.

## 테스트

```bash
npm run smoke     # 자동화 스모크 테스트 (32개 항목)
npm run build     # 타입 검사 + 프로덕션 빌드
```

스모크 테스트(`scripts/smoke.ts`)가 검증하는 흐름: 거래처 생성·중복차단·승인·로그인, 견적/부품 문의 접수와 문의번호 형식, 직원 답변(견적금액·전화예정), 오류코드 100 검색, 자가해결 성공/실패 후 AS 자동 전환, 기술팀 자동배정(LOAD_BALANCED)과 부재 제외, 수동 배정, 상태 흐름(…→종료), 권한별 조회 분리, 타임라인, 알림, 통합검색, 통계, 관리자 오류코드 추가. **현재 32/32 통과.**

## 향후 네이티브 앱 확장

PWA 구조이므로 [Capacitor](https://capacitorjs.com)를 얹으면 동일 코드로 Android/iOS 네이티브 앱을 만들 수 있습니다.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "EIDEN Partner" kr.eiden.partner --web-dir=dist
npm run build && npx cap add android && npx cap add ios
```

React 기반 웹 코드가 그대로 들어가고, 푸시 알림·카메라 등 네이티브 기능은 Capacitor 플러그인으로 추가합니다.

## 향후 개선사항

- 알림 채널 확장: 현재 앱 내 알림만 구현. Notification Service를 추상화해 두었으므로 SMS / 카카오 알림톡 / Email 연동 가능
- 오류코드 AI 검색: 현재는 등록된 오류코드 DB + FAQ만 사용 (AI가 해결법을 임의 생성하지 않음). 검색 인덱스 구조는 마련되어 있어 향후 AI 검색 추가 용이
- Supabase Edge Function으로 승인 알림 메일 발송
- 첨부파일 대용량 동영상: Supabase Storage signed URL + 압축 업로드
- Playwright 기반 E2E 테스트 추가

## 폴더 구조

```
eiden-partner/
├─ supabase/migrations/    # DB 스키마(0001) + Seed(0002), RLS 정책 포함
├─ scripts/smoke.ts        # 자동화 테스트 (npm run smoke)
├─ public/icons/           # PWA 아이콘
├─ src/
│  ├─ lib/                 # types / seed / db(백엔드 추상화) / api(업무로직) / auth
│  ├─ components/          # 공통 UI, 모바일/직원 셸, shadcn/ui
│  └─ pages/               # auth, company, inquiry, as, tickets, board, staff, admin, stats
├─ .env.example            # 환경변수 예시
└─ vite.config.ts          # PWA 설정 포함
```

## 보안 메모

- 실제 Secret(service_role key 등)은 소스코드에 넣지 않습니다. 프론트엔드에는 anon public key만 사용합니다.
- Supabase 모드에서는 Row Level Security가 적용되어 거래처는 자기 회사 문의만, 직원은 역할에 맞는 데이터만 조회합니다.
- 내부메모(INTERNAL)는 RLS와 앱 화면 양쪽에서 거래처에게 숨깁니다.
