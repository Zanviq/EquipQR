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

1. Cloudflare Zero Trust에서 Tunnel과 public hostname을 만들고 서비스 주소를 `http://web:3000`으로 지정합니다.
2. 서버에 저장소를 내려받고 `.env`를 생성합니다. `POSTGRES_PASSWORD`, 내부 호스트를 `db`로 지정한 `DATABASE_URL`, `CLOUDFLARE_TUNNEL_TOKEN`, `APP_ORIGIN=https://실제-호스트명`을 반드시 설정합니다.
3. 외부에 포트를 공개하지 않은 채 실행합니다.

```bash
docker compose -f compose.production.yaml up -d --build
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml logs -f web tunnel
```

최초 관리자는 일회성 컨테이너로 생성합니다.

```bash
docker compose -f compose.production.yaml run --rm \
  -e INITIAL_ADMIN_PASSWORD='12자-이상의-안전한-비밀번호' migrate \
  npx tsx scripts/create-initial-admin.ts \
  --employee-number ADMIN001 --name 관리자
```

> 운영 비밀번호와 Tunnel 토큰은 저장소에 커밋하지 말고 서버의 권한 제한된 `.env` 또는 별도 secret store에 둡니다.

## 백업과 복구

```bash
bash scripts/backup-db.sh /secure-backups/equipqr
bash scripts/restore-db.sh /secure-backups/equipqr/equipqr-YYYYMMDDTHHMMSSZ.sql.gz
```

백업 파일은 서버 밖의 암호화 저장소로 복제하고 정기적으로 복구 리허설을 수행합니다. 배포 전에는 `npm run check`와 `docker compose -f compose.production.yaml config`를 실행합니다.
