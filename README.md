# TETRIS — Retro Edition

> 🤖 이 프로젝트는 **Anthropic Claude Opus 4.7** 가 처음부터 끝까지 작성한 완전 플레이 가능한 테트리스입니다.
> 기획(PRD) · 아키텍처 · 구현 · 테스트 · 버그 수정 · 폴리시 전 과정이 Claude Code 세션 한 번에 완성되었습니다.

![stack](https://img.shields.io/badge/stack-Vanilla%20JS%20%2B%20Canvas%202D-ffd54a?style=flat-square)
![audio](https://img.shields.io/badge/audio-Web%20Audio%20API-ff8a8a?style=flat-square)
![persistence](https://img.shields.io/badge/persistence-localStorage-a000f0?style=flat-square)
![fps](https://img.shields.io/badge/fps-60-00f000?style=flat-square)

---

## 🎮 실행

브라우저에 정적 파일을 서빙하면 바로 플레이할 수 있습니다.

```bash
npx http-server . -p 5173
# → http://localhost:5173
```

ES Modules 를 사용하므로 `file://` 로 직접 열면 동작하지 않습니다.

### 조작
| 키 | 동작 |
| --- | --- |
| ← → | 이동 |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ / X | 시계 회전 |
| Z | 반시계 회전 |
| Shift / C | Hold |
| P / Esc | 일시정지 |
| R | 재시작 (게임오버) |

---

## ✨ 구현된 기능

- 🎯 **클래식 테트리스 규칙**: 10×20 보드, 7종 테트로미노, 7-bag 랜덤화, SRS 회전(월킥 포함)
- 🌀 **모던 피처**: Hold, Next 5 미리보기, Ghost Piece, Lock Delay (0.5s / 최대 15회 리셋)
- 🏆 **모던 스코어링**: T-Spin(Full/Mini × 0~3라인), Back-to-Back (×1.5), Combo (+50×n×lv), Perfect Clear 보너스
- 🎨 **레트로 픽셀 스타일**: `Press Start 2P` 폰트, 도트 그림자 블록, CRT 스캔라인 토글
- 💥 **시각 이펙트**: 라인 클리어 플래시 애니메이션, 화면 흔들림(Tetris/T-Spin/PC), 레벨업 노랑 플래시, 스코어 틱커
- 🎵 **오디오**: Web Audio API 합성 SFX 10종 + 32-step 칩튠 BGM (외부 에셋 0개)
- 📊 **로컬 리더보드**: 상위 10개, 3글자 이니셜 입력, 신기록 하이라이트, CLEAR SCORES 확인 다이얼로그
- ⚙️ **설정 영속화**: 시작 레벨, SFX/BGM 볼륨·ON·OFF, 고스트 피스, CRT 스캔라인
- 🖼️ **풀 씬 시스템**: 타이틀 / How to Play / Settings / Leaderboard / 신기록 입력 / 일시정지 / 게임오버 / 확인

---

## 🗺️ 이 테트리스가 만들어진 과정

한 번의 Claude Code 세션 안에서 PRD 작성 → 5개 마일스톤 구현 → 버그 수정 → 폴리시까지 진행되었습니다. 각 단계에서 유저가 요청한 원문과 Claude 가 수행한 작업은 다음과 같습니다.

### 📝 단계 0 — 기획 (PRD)

> 👤 유저: **"테트리스를 만들고 싶어. 우선 PRD를 작성해보자. 질문해줘"**

Claude 는 바로 코드를 치는 대신 4개의 질문을 던져 요구사항을 좁혔습니다.

- 플랫폼 → **웹 브라우저 (Vanilla HTML/CSS/JS)**
- 기능 범위 → **풀 피처** (모던 + 리더보드)
- 플레이 방식 → **싱글 플레이어 (키보드)**
- 비주얼 → **클래식 픽셀/레트로 스타일**

이어서 랭킹 저장(localStorage), 스코어링(모던), 키 매핑(표준) 까지 확정한 뒤 [`PRD.md`](PRD.md) 에 다음 항목을 문서화했습니다.

- 기술 스택 / 게임플레이 요구사항 / 스코어링 공식 / 화면 구성 / 사운드 / 리더보드 스키마 / 파일 구조 / 5개 마일스톤 / 비목표 / 성공 지표

### 🟦 단계 1 — M1 "코어 게임플레이"

> 👤 유저: **"M1 개발 진행"**

- `config.js`, `piece.js`, `bag.js` (7-bag)
- `srs.js` (SRS 월킥 테이블), `board.js` (충돌·이동·회전·락·클리어)
- `input.js` (DAS 170ms / ARR 50ms)
- `renderer.js` (Canvas 2D + 고스트 피스)
- `game.js` 상태 머신, `main.js` 엔트리 포인트
- 프리뷰 서버에서 첫 스모크 테스트 → 60fps 렌더링 확인

### 🟪 단계 2 — M2 "모던 피처"

> 👤 유저: **"M2 진행"**

- T-Spin 판정 (3-corner rule + 5번째 킥 예외)
- Back-to-Back 연쇄 × 1.5 배율
- Combo 체인 점수
- Perfect Clear 감지 및 보너스
- 보드 중앙 플래시 팝업 ("TETRIS • B2B • +1,250" 식)

단위 테스트 9종으로 Single / Tetris / B2B / T-Spin Double / Combo / PC / 레벨업을 모두 검증.

### 🟨 단계 3 — M3 "UI/UX"

> 👤 유저: **"진행해줘"**

- 타이틀 / How to Play / Settings / 일시정지 / 게임오버 5개 씬
- 라인 클리어 8Hz 스트로브 애니메이션
- 화면 흔들림 (강도·지속 시간 클리어 크기에 따라 차등)
- 레벨업 시 보드 오버레이 + 노랑 테두리 글로우
- CRT 스캔라인 CSS 오버레이 (설정에서 토글)
- localStorage 설정 영속화

### 🟥 단계 4 — M4 "사운드 & 리더보드"

> 👤 유저: **"진행"**

- Web Audio API 합성 엔진 (`tone`, `sweep`, `noiseBurst` 프리미티브)
- SFX 10종: move / rotate / lock / hardDrop / hold / lineClear(n) / tSpin / levelUp / gameOver / perfectClear
- 32-step 칩튠 BGM 루프 (멜로디 + 베이스)
- 브라우저 autoplay 정책 대응 (첫 입력 시 AudioContext resume)
- Game → 이벤트 큐 → Main 드레인 파이프라인
- 리더보드: 상위 10개, 3글자 이니셜, 신기록 씬 + 자동 리더보드 이동 + 행 하이라이트
- CLEAR SCORES 확인 다이얼로그

### 🐛 단계 5 — 유저 발견 버그 수정

> 👤 유저: **"블럭이 다 안사라지고 저렇게 막히는 버그가 있어"** (스크린샷 첨부)

Claude 가 보드 상태 덤프 → 재현 테스트 → 원인을 특정했습니다.

```js
// Before (BUG) — splice + unshift in same loop shifts indices
for (let i = rows.length - 1; i >= 0; i--) {
  this.board.grid.splice(rows[i], 1);
  this.board.grid.unshift(Array(COLS).fill(null)); // ← 문제
}
```

4행 Tetris 클리어 시 `splice(21)` 직후 `unshift()` 때문에 인덱스가 한 칸씩 밀려 실제로는 2행만 제거되고 2행이 바닥에 남는 현상.

**수정**: 모든 splice 를 먼저 끝내고 unshift 를 마지막에 일괄 실행.

```js
for (let i = rows.length - 1; i >= 0; i--) this.board.grid.splice(rows[i], 1);
for (let i = 0; i < rows.length; i++) this.board.grid.unshift(Array(COLS).fill(null));
```

3개 시나리오 (Tetris 인접 4행 / 인접 2행 / 비인접 2행) 에 대해 재현 테스트로 수정 확인.

### 🎨 단계 6 — M5 "버그 감사 + 마감 폴리시"

> 👤 유저: **"좋아 이제 다음 스텝 진행"**

재발 방지를 위해 광범위한 엣지 케이스 감사를 수행했습니다.

- 7-bag 통계 공정성 (7000 회 시뮬)
- SRS 킥 테이블 크기 검증
- 피스 셀 수 (모든 회전 상태 4셀)
- Hold / Lock Delay 캡 / 블록아웃 / 숨김 행 / Pause 중 애니메이션 동결 등 13종

추가 폴리시:
- CLEAR SCORES + 확인 다이얼로그
- 스코어 증가 시 틱커 펄스 애니메이션
- 60.3 fps, P99 프레임 16.80ms, 드롭 프레임 0 — PRD 목표 달성 확인

---

## 📁 프로젝트 구조

```
tetris-game/
├── PRD.md                  # 초기 기획 문서
├── README.md               # 이 파일
├── index.html              # 씬 HTML + 캔버스
├── styles/main.css         # 레트로 픽셀 스타일
├── src/
│   ├── main.js             # 엔트리, 씬 매니저, 오디오/리더보드 배선
│   ├── game.js             # 상태 머신, T-Spin, 애니메이션, 흔들림
│   ├── board.js            # 충돌, 이동, 회전, 락, 라인 클리어
│   ├── piece.js            # 테트로미노 7종 + 4회전 정의
│   ├── bag.js              # 7-bag 랜덤화
│   ├── srs.js              # SRS 월킥 오프셋 테이블
│   ├── scoring.js          # 스코어링, B2B, Combo, PC
│   ├── input.js            # 키보드 + DAS/ARR
│   ├── renderer.js         # 캔버스 렌더, 고스트, 플래시
│   ├── audio.js            # Web Audio API SFX + BGM
│   ├── leaderboard.js      # localStorage 상위 10
│   ├── settings.js         # localStorage 설정
│   └── config.js           # 상수 (DAS / ARR / 중력 공식 등)
└── .claude/launch.json     # 프리뷰 서버 설정
```

---

## 🧠 Built with Claude Opus 4.7

이 프로젝트의 **모든 코드·CSS·HTML·기획 문서**는 Anthropic 의 [Claude Opus 4.7](https://www.anthropic.com/claude) 이 Claude Code 세션 안에서 작성했습니다.

세션 내에서 일어난 일:
- ✅ 유저와 대화하며 **요구사항 기획** (PRD 작성)
- ✅ **아키텍처 설계** 및 12개 모듈로 분리된 Vanilla JS 구현
- ✅ 단계마다 **스모크 테스트 + 단위 테스트** 실행
- ✅ 라이브 프리뷰 서버에서 **스크린샷 검증**
- ✅ 유저가 찾은 버그 **근본 원인 분석** 및 수정
- ✅ 13종 **엣지 케이스 감사** 및 **성능 프로파일링**

> 게임 한 개를 PRD 부터 버그 수정까지, 사람이 직접 코드를 한 줄도 타이핑하지 않고 완성한 사례입니다.
> — Made with Claude Opus 4.7
