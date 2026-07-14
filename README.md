# EquipQR

QR로 장비 대여 현황을 파악하고 사용자 간 전달을 확인하는 사내 웹 서비스입니다.

## 제공 기능

- 사번/비밀번호 로그인과 직원·관리자 권한
- 정적 장비 QR을 이용한 대여와 반납
- 기본 10분 일회용 전달 QR, 선택 가능한 장비 QR 즉시 전달
- 프로필의 전달 정책을 신규 대여 시점에 스냅샷으로 고정
- 내 장비 목록, 카메라 스캔과 자산번호 직접 입력
- 사용자·장비·책임자·운영 상태 관리와 삭제 불가 감사 기록
- A4/50×30mm 장비 QR 라벨 인쇄
- Docker Compose와 Cloudflare Tunnel 기반 사내 서버 배포

## 로컬 개발

Node.js 24와 Docker가 필요합니다.

```bash
cp .env.example .env
# .env의 POSTGRES_PASSWORD와 DATABASE_URL 비밀번호를 동일하게 변경
docker compose up -d db
npm ci
npm run prisma:generate
npx prisma migrate deploy
INITIAL_ADMIN_PASSWORD='12자-이상의-안전한-비밀번호' npm run admin:bootstrap -- --employee-number ADMIN001 --name 관리자
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다. 휴대폰 카메라는 HTTPS 보안 컨텍스트에서 사용해야 하므로 실제 기기 검증은 Tunnel 주소에서 수행합니다.

## 회사 서버 배포

### Ubuntu 서버 최초 세팅

Ubuntu 서버에서는 Docker Engine과 Compose plugin을 설치한 뒤 저장소를 내려받습니다.

```bash
sudo apt update
sudo apt install -y git ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker "$USER"
newgrp docker
```

프로젝트는 새 GitHub 저장소에서 받습니다.

```bash
git clone https://github.com/itop-page/EquipQR.git
cd EquipQR
git checkout main
```

운영 `.env`는 저장소 루트에 생성합니다. `DATABASE_URL`의 host는 Docker Compose 서비스명인 `db`여야 하며, Cloudflare Tunnel public hostname의 service는 `http://web:3000`으로 설정합니다.

```env
POSTGRES_PASSWORD=강한_DB_비밀번호
DATABASE_URL=postgresql://equipqr:강한_DB_비밀번호@db:5432/equipqr
APP_ORIGIN=https://qr.itop.live
CLOUDFLARE_TUNNEL_TOKEN=Cloudflare_Tunnel_Token_값
SESSION_COOKIE_SECURE=true
```

1. Cloudflare Zero Trust에서 Tunnel과 public hostname을 만들고 서비스 주소를 `http://web:3000`으로 지정합니다.
2. 서버에 저장소를 내려받고 `.env`를 생성합니다. `POSTGRES_PASSWORD`, 내부 호스트를 `db`로 지정한 `DATABASE_URL`, `CLOUDFLARE_TUNNEL_TOKEN`, `APP_ORIGIN=https://실제-호스트명`을 반드시 설정합니다.
3. 외부에 포트를 공개하지 않은 채 DB와 마이그레이션을 먼저 실행합니다.

```bash
docker compose -f compose.production.yaml up -d db
docker compose -f compose.production.yaml run --rm --build migrate
```

최초 관리자는 Tunnel을 열기 전에 일회성 컨테이너로 생성합니다. `/api/health/ready`는 DB와 활성 관리자 존재를 모두 확인하므로, 이 단계 전에는 `503`이 정상입니다.

```bash
docker compose -f compose.production.yaml run --rm \
  -e INITIAL_ADMIN_PASSWORD='12자-이상의-안전한-비밀번호' migrate \
  npx tsx scripts/create-initial-admin.ts \
  --employee-number ADMIN001 --name 관리자
```

관리자를 만든 뒤 전체 스택을 실행하고 준비 상태를 확인합니다.

```bash
docker compose -f compose.production.yaml up -d --build
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml exec -T web \
  node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(async r=>{console.log(r.status, await r.text());if(!r.ok)process.exit(1)})"
docker compose -f compose.production.yaml logs -f web tunnel
```

`/api/health/live`는 웹 프로세스 생존만 확인하고, `/api/health/ready`는 DB 연결과 활성 관리자 존재를 확인합니다. 운영 healthcheck와 Tunnel은 `ready`가 `200`일 때만 트래픽을 엽니다.

## 백업과 복구

기본 백업 위치는 저장소 밖의 `/var/backups/equipqr`입니다. 최초 한 번 운영 계정만 접근할 수 있도록 준비합니다.

```bash
sudo install -d -m 700 -o "$USER" -g "$(id -gn)" /var/backups/equipqr
bash scripts/backup-db.sh
```

백업은 임시 파일에 생성되고 gzip 검증 후 원자적으로 게시되며, `.sha256` checksum이 함께 생성됩니다. 디렉터리는 `700`, 파일은 `600`으로 강제됩니다. 다른 위치는 첫 번째 인자 또는 `EQUIPQR_BACKUP_DIR`로 지정할 수 있습니다.

복구는 checksum이 있으면 검증하고, 웹과 Tunnel을 중지한 뒤 현재 DB의 pre-restore 백업을 먼저 생성합니다. 화면에 표시되는 `RESTORE 파일명`을 정확히 입력해야 진행되며, SQL은 단일 transaction으로 적용됩니다. 이후 현재 코드의 migration, readiness 점검, 서비스 재시작까지 수행합니다.

```bash
bash scripts/restore-db.sh /var/backups/equipqr/equipqr-YYYYMMDDTHHMMSSZ.sql.gz
```

백업 파일과 `.sha256`은 서버 밖의 암호화 저장소로 복제하고 정기적으로 복구 리허설을 수행합니다. 백업 성공은 파일 존재만이 아니라 checksum 검증과 복구 후 `/api/health/ready`로 판정합니다.

> `docker compose down -v`, `docker volume rm`, `docker volume prune`, `docker system prune --volumes`는 DB 볼륨을 삭제할 수 있습니다. 데이터 폐기와 검증된 백업이 명시적으로 승인된 경우 외에는 실행하지 마세요. 일반적인 `up -d --build`, `restart`, `down`(단, `-v` 없음)은 named volume을 보존합니다.
