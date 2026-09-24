<div align="center">

# 🏷️ EquipQR

**QR 스캔으로 장비의 현재 사용자를 확인하고 사용자 간 전달을 기록하는 웹 서비스**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[English](./README.md) | **한국어**

</div>

---

## 💭 Developer's Note

> *<!-- TODO: 인용구 한 줄 -->*

<!-- TODO: 개발 동기 -->

---

## ✨ Features

### 📷 QR 대여·반납
- 장비마다 `/scan/equipment/{publicCode}`로 연결되는 고정 QR이 있습니다. publicCode는 자산번호와 별개인 24바이트 랜덤 base64url 문자열입니다
- 스캔하면 장비의 현재 상태와 대여·반납 버튼이 표시됩니다. 자산번호를 직접 입력할 수도 있습니다
- 대여와 반납은 PostgreSQL `Serializable` 트랜잭션으로 처리합니다. 부분 unique 인덱스로 장비당 진행 중인 대여를 하나로 제한합니다
- 프로필에서 스캔 시 동작을 고릅니다: 바로 실행하거나, 확인 후 실행

### 🔁 사용자 간 전달
- **전달 QR (기본)**: 현재 사용자가 10분 뒤 만료되는 일회용 QR을 만들고, 받는 사람이 스캔해서 인수합니다. DB에는 토큰의 SHA-256 해시만 저장합니다
- **장비 QR 즉시 전달 (선택)**: 장비 QR을 스캔한 사람이 전달 QR 없이 바로 인수합니다
- 사용자의 전달 방식은 장비를 받는 시점에 대여 기록에 복사됩니다. 이후 프로필을 바꿔도 이미 가진 장비에는 적용되지 않습니다
- 즉시 전달이 끝나면 두 사용자 모두에게 앱 내 알림이 갑니다. 클라이언트가 `/api/notifications`를 10초마다 조회합니다
- 즉시 전달 뒤 이전 사용자는 장비가 반납되거나 다시 자신에게 돌아올 때까지 내 장비의 "전달한 장비"에서 확인할 수 있습니다

### 🛠️ 관리자 콘솔
- 대시보드: 대여 가능·대여 중·사용 중지 장비 수, 최근 이벤트, 30일 이상 대여 중인 장비, 보유 장비가 많은 사용자 상위 10명
- 사용자 생성, 활성·비활성 전환, 비밀번호 초기화 (12자 이상)
- 장비 등록, 정보 수정, 사용·사용 중지 전환, 사유를 입력한 책임자 변경과 회수
- 감사 이벤트(대여, 반납, 전달, 관리자 작업) 이력을 페이지 단위로 조회하고 장비·사용자로 검색

### 🖨️ QR 라벨 인쇄
- 장비를 선택해 A4 용지에 라벨을 일괄 인쇄합니다
- 라벨 너비는 40~80mm로 조절하고, 높이는 너비의 60%(최소 24mm)로 정해집니다
- 페이지당 라벨 수는 A4 인쇄 영역(190 × 277mm)과 2mm 간격을 기준으로 계산합니다

### 🔐 인증과 운영
- 사번과 비밀번호로 로그인합니다. 비밀번호는 Argon2id(`@node-rs/argon2`)로 해시합니다
- 세션은 랜덤 토큰을 SHA-256 해시로 DB에 저장하고 `httpOnly` 쿠키로 전달합니다. 12시간 뒤 만료됩니다
- 메모리 기반 로그인 횟수 제한: 15분 동안 계정+IP당 10회, IP당 200회
- `/api/health/live`는 프로세스 생존을, `/api/health/ready`는 DB 연결과 활성 관리자 존재를 확인합니다

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) (Compose 포함)
- 외부 API 키는 필요 없습니다. [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) 토큰은 운영 배포에만 필요합니다

### Installation

```bash
# 저장소 받기
git clone https://github.com/Zanviq/EquipQR.git
cd EquipQR

# 환경 변수 (로컬 실행은 기본값 그대로 사용 가능)
cp .env.example .env

# 빌드 후 실행: db → migrate (마이그레이션 + 데모 seed) → web
docker compose up --build
```

`http://localhost:3000`에 접속합니다. `migrate` 서비스가 Prisma 마이그레이션을 적용한 뒤, `SEED_DEMO=true`(기본값)이면 데모 데이터를 넣습니다. 이미 있는 데이터는 건너뛰므로 재시작해도 중복되지 않습니다.

브라우저는 HTTPS에서만 카메라 접근을 허용하므로, `localhost`에서는 카메라 대신 자산번호 입력을 사용합니다.

### Demo Account

| 사번 | 비밀번호 | 권한 |
|---|---|---|
| `demo` | `demo1234` | 관리자 |

seed는 데모 장비 5개(`DEMO-NB-001`, `DEMO-NB-002`, `DEMO-TAB-001`, `DEMO-CAM-001`, `DEMO-PJ-001`)도 등록합니다. 데모 계정은 관리자라서 직원 화면과 관리자 콘솔을 모두 사용할 수 있습니다.

### Local Development

Node.js 24가 필요합니다. `db` 서비스를 실행한 상태(`docker compose up -d db`)에서:

```bash
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

### Deployment

운영 배포(Docker Compose + Cloudflare Tunnel)와 백업·복구는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Database** | PostgreSQL 18, Prisma 7 (`@prisma/adapter-pg`) |
| **Auth** | Argon2id (`@node-rs/argon2`), DB 기반 세션 쿠키 |
| **QR** | `@zxing/browser` (스캔), `qrcode` (생성) |
| **Validation** | Zod 4 |
| **Styling** | Tailwind CSS 4, Pretendard |
| **Testing** | Vitest, Testing Library |
| **Infra** | Docker Compose, Cloudflare Tunnel |

---

## 📁 Project Structure

```
EquipQR/
├── 📂 prisma/
│   ├── schema.prisma             # 사용자, 세션, 장비, 대여, 전달 티켓, 감사 이벤트
│   └── 📂 migrations/            # SQL 마이그레이션 (장비당 대여 1건 부분 인덱스 포함)
├── 📂 scripts/
│   ├── create-initial-admin.ts   # 최초 관리자 생성
│   ├── seed-demo.ts              # 데모 계정과 장비 seed
│   ├── backup-db.sh              # checksum을 포함한 pg_dump 백업
│   └── restore-db.sh             # 검증 후 복구
├── 📂 src/
│   ├── 📂 app/
│   │   ├── 📂 (auth)/login/      # 로그인 페이지
│   │   ├── 📂 (employee)/        # 스캔, 내 장비, 프로필, 전달 인수
│   │   ├── 📂 admin/             # 대시보드, 사용자, 장비, 이력, 라벨 인쇄
│   │   └── 📂 api/               # Route handler (인증, 장비, 전달, 관리자, health)
│   ├── 📂 components/            # UI 컴포넌트 (스캐너, 장비 정보, 알림, 인쇄)
│   ├── 📂 server/
│   │   ├── 📂 auth/              # 비밀번호 해시, 세션, 현재 사용자
│   │   ├── 📂 circulation/       # 대여와 반납
│   │   ├── 📂 transfer/          # 전달 티켓, 즉시 전달
│   │   ├── 📂 admin/             # 관리자 작업과 대시보드
│   │   └── 📂 http/              # 요청 제한, 응답 헬퍼, 스키마
│   ├── 📂 lib/                   # 인쇄 배치, 안전한 리다이렉트, 공용 헬퍼
│   └── proxy.ts                  # 세션이 없으면 직원 경로를 /login으로 리다이렉트
├── Dockerfile                    # 멀티스테이지 빌드 (deps → builder → migrator → runner)
├── compose.yaml                  # 로컬: db, migrate (+ 데모 seed), web
└── compose.production.yaml       # 운영: db, migrate, web, tunnel
```

---

## 💡 How to Use

1. **장비 등록**: 관리자 → 장비 관리에서 자산번호와 이름으로 장비를 추가합니다
2. **라벨 인쇄**: 장비를 선택하고 **선택한 QR 인쇄**를 누른 뒤, 라벨 너비를 조절해 A4로 인쇄합니다
3. **대여**: **스캔**에서 장비 QR을 스캔하거나 자산번호를 입력하고 **대여하기**를 누릅니다
4. **전달**: **내 장비**에서 장비를 열고 **전달 QR 만들기**를 누릅니다. 받는 사람이 10분 안에 스캔합니다. 현재 사용자는 **전달 QR 취소**로 취소할 수 있습니다
5. **반납**: 장비 QR을 다시 스캔하고 **반납하기**를 누릅니다
6. **설정 변경**: **프로필**에서 전달 정책(전달 QR 또는 즉시 전달)과 스캔 동작(바로 실행 또는 확인 후 실행)을 고릅니다
7. **이력 확인**: 관리자 → 이용 기록에서 장비명, 자산번호, 사용자 이름, 사번으로 검색합니다

---

## 🎨 Screenshots

<div align="center">

![Scan](image/Scan.png)

<table>
  <tr>
    <td><img src="image/Equipment.png" width="400"/></td>
    <td><img src="image/MyEquipment.png" width="400"/></td>
  </tr>
  <tr>
    <td><img src="image/Transfer.png" width="400"/></td>
    <td><img src="image/Profile.png" width="400"/></td>
  </tr>
  <tr>
    <td><img src="image/AdminDashboard.png" width="400"/></td>
    <td><img src="image/QrPrint.png" width="400"/></td>
  </tr>
</table>
</div>

---

## 📝 License

<!-- TODO: 저장소에 LICENSE 파일이 아직 없습니다. 라이선스를 정해 추가해 주세요. -->

---

<div align="center">

| 👤 **Developer** | ✉️ **Email** |
|:---:|:---:|
| Zanviq | zanviq.dev@gmail.com |

</div>
