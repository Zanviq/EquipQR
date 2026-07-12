# EquipQR

qr로 장비 대여 현황 파악 및 전달 확인 가능한 웹 서비스

기술 스택: 미정 (설계 단계에서 결정)

---

## 경로 기준

- Codex 실행 위치: `main/` 또는 기능 worktree 루트
- 실제 코드 저장소: `main/`
- Codex harness: `.codex/`
- 디자인 시스템: `.codex/DESIGN.md`
- 비공개 작업실: `../.agents-workspace/`

필요할 때:

```bash
source .codex/scripts/resolve_paths.sh
```

---

## leader 역할

이 Codex 세션은 leader다.

- 간단한 작업은 직접 처리한다.
- 큰 작업은 subagent에 위임한다.
- subagent 결과를 검토하고 handoff를 중계한다.
- subagent는 서로 직접 대화한다고 가정하지 않는다.
- 커밋과 병합은 leader가 CLI로 직접 처리한다.
- 같은 worktree 안에서 코드 쓰기는 순차로 한다.

---

## 라우팅

| 작업 | 담당 |
|---|---|
| 설계, user-idea, 벤치마킹 | design-planner |
| 디자인 시스템 / DESIGN.md | leader + design-planner, 구현 시 frontend-dev 필수 준수 |
| 백엔드 구현 | backend-dev |
| 프론트엔드 구현 | frontend-dev |
| 코드 리뷰 | code-reviewer 또는 auto_review |
| 실제 화면 테스트 | ui-tester |
| 문서화 | doc-writer |
| 새 agent 생성 | agent-maker |
| git/branch/commit/merge | leader 직접 처리 |

---

## DESIGN.md 정책

`.codex/DESIGN.md`는 agent-facing 디자인 시스템 단일 출처다.

- 프론트엔드 작업 전 frontend-dev는 반드시 `.codex/DESIGN.md`를 읽는다.
- DESIGN.md가 비어 있거나 필요한 token/component가 없으면 임의 스타일을 만들기 전에 leader에게 보고한다.
- UI 구현에서 새 색상, spacing, radius, typography, component pattern이 필요하면 코드보다 DESIGN.md를 먼저 갱신한다.
- 임시 스타일을 썼다면 작업 완료 전 DESIGN.md에 반영하거나 제거한다.
- code-reviewer는 기능 리뷰와 함께 DESIGN.md 준수 여부를 확인한다.
- ui-tester는 실제 화면에서 DESIGN.md와 다른 시각 drift가 보이면 테스트 결과에 기록한다.
- 가능하면 DESIGN.md 수정 후 `bash .codex/scripts/lint_design.sh`를 실행한다.
- 장기 보존·팀 공유가 필요한 확정 디자인 시스템은 `main/docs/design-system.md` 또는 `main/DESIGN.md`로 승격해 커밋한다.

---

## 개발 흐름

1. 사용자 요구를 요약한다.
2. 설계가 필요하면 design-planner에 위임한다.
3. leader가 기능 worktree를 만든다.
4. backend-dev가 필요한 경우 먼저 작업한다.
5. leader가 backend 결과와 API 계약을 정리한다.
6. frontend-dev가 이어서 작업한다.
7. code-reviewer 또는 auto_review로 리뷰한다.
8. 빌드/기동/테스트를 확인한다.
9. 게이트 통과 시 사용자에게 병합 여부를 묻는다.
10. 승인 시 leader가 main에 병합한다.

---

## worktree 생성

```bash
source .codex/scripts/resolve_paths.sh
git -C "$MAIN" worktree add ../{기능폴더} -b feature/{기능명}
```

---

## git 규칙

- subagent는 커밋하지 않는다.
- leader가 CLI로 커밋한다.
- 기본 브랜치에서 직접 기능 커밋 금지.
- 커밋 형식: `[태그]: 요약\n\n상세`
- AI 흔적, Co-Authored-By, Generated with, 🤖 금지.
- 커밋 전 secret scan.
- 커밋 후 commit-log 생성.

---

## 병합 게이트

1. 리뷰 통과
2. 빌드/기동 확인
3. 테스트 통과
4. secret scan 통과
5. 작업 트리 clean
6. DESIGN.md drift 없음 또는 기록됨

통과하면 사용자에게 묻는다.

```text
게이트를 통과했습니다. main에 병합할까요?
```

---

## 보안

비밀 파일을 읽거나 출력하거나 커밋하지 않는다.

금지:

- `.env`
- `.env.local`
- `.env.production`
- `*.pem`
- `*.key`
- `secrets/**`
- `credentials*.json`

외부 레퍼런스 프로젝트는 읽기만 한다.

---

## `.agents-workspace/` 정책

`.agents-workspace/`는 git 밖 비공개 작업실이다.

장기 보존이 필요한 설계 결정이나 문서는 `main/docs/` 또는 `main/README.md`로 승격해 커밋한다.

---

## 세션 시작

```bash
bash .codex/scripts/load_context.sh
```

---

## 세션 종료

```bash
bash .codex/scripts/write_session_note.sh
```

세션 종료 시 확인한다.

- 미커밋 변경
- 미병합 worktree/branch
- DESIGN.md 반영 필요 여부
- 정식 문서 승격 필요 여부
