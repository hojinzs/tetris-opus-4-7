# Tetris — AI Model Evaluation PRD

> 본 문서는 **AI 모델별 구현 품질 평가**를 목적으로 하는 특수 PRD 입니다.
> 동일한 스펙을 서로 다른 AI 모델이 구현하고, 그 결과물을 **누적 플레이 시간** 과 **플레이어 별점** 으로 비교합니다.

---

## 0. 문서의 목적 (Why this PRD exists)

### 0.1 평가 대상
- 동일 PRD 를 입력으로 받아 각 AI 모델이 **처음부터 끝까지** 구현한 웹 테트리스 빌드

### 0.2 평가 지표 (Scoring)
1. **누적 플레이 시간 (Cumulative Play Time)**
   - 단위: 초 (집계 시 분/시간으로 환산)
   - 측정 범위: `GameState.Playing` 상태가 유지된 실시간 경과 시간의 합
   - Paused / Menu / GameOver 상태는 제외
   - 세션 수가 아닌 **총 플레이 길이** 를 집계하여 몰입도·재플레이 가치를 측정
2. **플레이어 별점 (Player Rating)**
   - 1 ~ 5 별 (정수)
   - 게임오버 씬에서 수집
   - 집계: 평균, 중앙값, 표본 수(n) 을 함께 보고

### 0.3 공정성 원칙 (Fairness Principle)
- 아래 **§2 ~ §7** 에 정의된 모든 기능·수치·UI 는 **모델 간 동일하게 구현** 되어야 함
- 모델별 창의성은 **§8 Dance 영역** 에서만 허용됨
- 성능/입력 지연/프레임 레이트는 모든 모델이 동일한 기준을 만족해야 함
- 외부 에셋(이미지·사운드 파일) 사용 금지 → 합성 SFX / 벡터 렌더링으로만 구성

---

## 1. 기술 스택 (고정)

| 항목 | 선택 | 비고 |
| --- | --- | --- |
| 플랫폼 | 데스크톱 웹 브라우저 | Chrome / Firefox / Edge / Safari 최신 2개 버전 |
| 언어 | HTML5 / CSS3 / Vanilla JavaScript (ES2020+) | **번들러 / 프레임워크 금지** |
| 모듈 | ES Modules (`<script type="module">`) | |
| 렌더링 | Canvas 2D API | WebGL / SVG 금지 |
| 저장소 | `localStorage` | IndexedDB / 서버 저장 금지 |
| 사운드 | Web Audio API (합성만) | 외부 오디오 파일 금지 |
| 폰트 | Google Fonts `Press Start 2P` | 이 폰트만 허용 |
| 에셋 | **외부 이미지/오디오 파일 0개** | 스프라이트는 코드로 정의 |

---

## 2. 게임플레이 요구사항 (고정)

### 2.1 보드
- 플레이필드: **10열 × 20행** (가시) + 상단 **2행 숨김 버퍼**
- 셀 크기: **30px**
- 블록: 7종 표준 테트로미노 (I, O, T, S, Z, J, L)

### 2.2 피스 생성
- **7-Bag 랜덤화** (한 세트에 7종이 정확히 한 번씩 등장)

### 2.3 조작 매핑 (고정)
| 키 | 동작 |
| --- | --- |
| ← / → | 좌/우 이동 |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ / X | 시계 방향 회전 |
| Z | 반시계 방향 회전 |
| Shift / C | Hold |
| P / Esc | 일시정지 |
| R | 재시작 (게임오버 후) |

### 2.4 입력 타이밍 (고정 수치)
- **DAS (Delayed Auto Shift)**: `170ms`
- **ARR (Auto Repeat Rate)**: `50ms`
- **Soft Drop Factor**: 중력의 `20×`

### 2.5 회전 시스템
- **SRS (Super Rotation System)** 표준 구현
- 벽차기(Wall Kick) 테이블: SRS 표준 (I 피스 별도 테이블)

### 2.6 모던 피처 (고정)
- **Hold**: 피스 고정 전까지 세션당 1회 사용 가능
- **Next Queue**: 다음 **5개** 미리보기
- **Ghost Piece**: 반투명으로 하드 드롭 위치 표시 (설정 토글 가능)
- **Lock Delay**: `500ms` 유예, 이동/회전 시 리셋, 최대 **15회**

---

## 3. 스코어링 & 레벨 (고정 공식)

### 3.1 레벨 진행
- 시작 레벨: 1 (설정에서 1 ~ 15 선택 가능)
- 레벨업: 매 **10라인** 클리어 시 +1
- 중력 공식:
  ```js
  gravityMs(level) = Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000
  ```

### 3.2 라인 클리어 점수
| 라인 | 기본 점수 |
| --- | --- |
| Single | `100 × level` |
| Double | `300 × level` |
| Triple | `500 × level` |
| Tetris | `800 × level` |

### 3.3 T-Spin 점수
| 동작 | 점수 |
| --- | --- |
| T-Spin (no lines) | `400 × level` |
| T-Spin Single | `800 × level` |
| T-Spin Double | `1200 × level` |
| T-Spin Triple | `1600 × level` |
| T-Spin Mini | `100 × level` |
| T-Spin Mini Single | `200 × level` |

T-Spin 판정: **3-Corner Rule + 5번째 킥 예외** 규칙을 적용.

### 3.4 Back-to-Back (B2B)
- Tetris 또는 T-Spin 라인 클리어 **연속 성공** 시 해당 점수 × `1.5`
- 일반 1~3라인 클리어로 끊어짐

### 3.5 콤보
- 연속 라인 클리어 시 `50 × combo × level` 추가
- 라인 클리어가 0인 고정에서 리셋

### 3.6 기타 점수
- Soft Drop: 이동 셀당 `+1`
- Hard Drop: 이동 셀당 `+2`
- Perfect Clear 보너스:
  - Single: `800 × level`
  - Double: `1200 × level`
  - Triple: `1800 × level`
  - Tetris: `2000 × level`

---

## 4. 화면 구성 (고정)

### 4.1 레이아웃
```
┌─────────────────────────────────────────────────┐
│                    TETRIS                       │
├──────────────┬───────────────────┬──────────────┤
│   HOLD       │                   │    NEXT      │
│  (120×90)    │                   │  (120×450)   │
├──────────────┤   PLAY FIELD      │              │
│   SCORE      │   (300×600)       │  5 pieces    │
│   LEVEL      │   10 × 20 cells   │              │
│   LINES      │                   │              │
│   TIME       │                   │              │
├──────────────┤                   │              │
│  DANCER      │                   │              │
│  (120×140)   │                   │              │
│  ★ 창의영역  │                   │              │
└──────────────┴───────────────────┴──────────────┘
         ← MOVE ↓ SOFT SPACE HARD ↑/X ROT Z CCW SHIFT HOLD P PAUSE R RESTART
```

### 4.2 씬 구성 (고정, 8개)
1. **Title / Main Menu**: `START GAME`, `LEADERBOARD`, `HOW TO PLAY`, `SETTINGS`
2. **Playing** (게임 화면)
3. **Pause Overlay**: `RESUME`, `RESTART`, `MAIN MENU`
4. **Game Over Overlay**: 최종 SCORE / LINES / LEVEL + `RESTART`, `MAIN MENU`
5. **Name Input (New Record)**: 3글자 이니셜 입력
6. **Leaderboard**: 상위 10개 테이블 (#, NAME, SCORE, LINES, LV, TIME, DATE) + `CLEAR SCORES`
7. **Confirm Dialog** (예: CLEAR SCORES 확인)
8. **Settings**: 시작 레벨, CRT 스캔라인, 고스트, SFX/BGM 볼륨·ON/OFF
9. **How to Play**: 키 매핑 + 규칙 요약

### 4.3 시각 스타일 (고정)
- 레트로 픽셀 / NES 풍 도트 그래픽
- 폰트: `Press Start 2P`
- 블록 색상 (고정):
  - `I=#00f0f0`, `O=#f0f000`, `T=#a000f0`, `S=#00f000`, `Z=#f00000`, `J=#0000f0`, `L=#f0a000`
  - Ghost: `rgba(255,255,255,0.22)`
  - Empty: `#14141f`
- 블록에 픽셀 테두리 + 내부 하이라이트/그림자 (3D 느낌)
- **CRT 스캔라인** 오버레이 (설정에서 토글)

### 4.4 애니메이션 / 이펙트 (고정)
- 라인 클리어: 플래시 후 제거 애니메이션 (~300ms, 8Hz 스트로브)
- Tetris / T-Spin / Perfect Clear: 화면 흔들림 (강도·지속 차등)
- 레벨업: 보드 오버레이 노랑 플래시 + 테두리 글로우
- 스코어 증가: 틱커 펄스 애니메이션
- 보드 중앙 팝업 ("TETRIS • B2B • +1,250" 등)

---

## 5. 사운드 (고정, 합성만)

### 5.1 효과음 (최소 10종)
- `move`, `rotate`, `lock`, `hardDrop`, `hold`
- `lineClear(n)` (1~3 / Tetris 차등)
- `tSpin`, `levelUp`, `gameOver`, `perfectClear`
- Web Audio API `OscillatorNode` / `GainNode` 로 합성 (외부 파일 금지)

### 5.2 BGM
- 루프 배경 음악 1곡 이상 (칩튠 스타일, 코드 내 합성)
- 브라우저 autoplay 정책 대응: 첫 사용자 입력에서 `AudioContext.resume()` 호출
- 설정에서 ON/OFF 및 음량 조절

---

## 6. 리더보드 (로컬, 고정 스키마)

### 6.1 저장
- `localStorage` 키: `tetris_leaderboard_v1`
- 상위 **10개** 유지

### 6.2 엔트리 스키마
```json
{
  "name": "AAA",
  "score": 125000,
  "lines": 142,
  "level": 15,
  "durationSec": 612,
  "date": "2026-04-17T10:23:00Z"
}
```

### 6.3 신기록 처리
- 점수가 기존 10위 안에 들면 이니셜 입력 씬으로 이동
- 입력 완료 시 목록에 삽입 → 정렬 → 상위 10개만 유지
- 리더보드 화면에서 해당 행 하이라이트

---

## 7. 게임 오버 & 일시정지

### 7.1 게임 오버 조건
- 새 피스를 스폰 위치(숨김 버퍼)에 배치 불가 시 (Block Out)
- 피스가 보드 상단 경계를 넘어 고정 시 (Lock Out)

### 7.2 일시정지
- `P` / `Esc` 로 토글
- 일시정지 중에는 **모든 애니메이션 동결**, **플레이 시간 계측 중단**

---

## 8. DANCER 영역 (창의 영역 — 모델별 자유 구현)

> 이 섹션은 **유일하게 창의성이 허용되는 구역**입니다. 모델의 개성을 드러낼 수 있는 공간이며, 평가 시 별점에 간접 반영될 수 있습니다.

### 8.1 고정 제약 (반드시 준수)
- 위치: 좌측 사이드 패널 내 `DANCER` 라벨 섹션
- 캔버스 크기: **120 × 140 px**
- Canvas 2D 로 렌더링 (이미지 파일 금지, 코드로 스프라이트 정의)
- 프레임 레이트: 게임 루프와 동일하게 60fps 유지
- 게임 성능에 악영향을 주지 않을 것 (프레임당 예산 ≤ 2ms 권장)

### 8.2 필수 반응 트리거
아래 이벤트에서 **시각적으로 구별되는 반응** 이 반드시 발생해야 합니다.

| 트리거 | 기대 반응 강도 | 권장 지속 |
| --- | --- | --- |
| Triple (3줄 클리어) | 보통 | ~1.6초 |
| Tetris (4줄 클리어) | 강함 | ~2.8초 |
| T-Spin (1줄+) | 강함 | ~2.2초 |
| Combo ≥ 3 | 보통 (연쇄 강화) | `1.4s + combo × 0.15s` |
| Level Up | 강함 | ~2.0초 |
| Perfect Clear | 최강 | ~4.0초 |
| Game Over | 리셋 (평정/쓰러짐) | 즉시 |

Idle 상태(아무 이벤트 없음)에서도 **미세한 움직임**(흔들림/호흡 등) 이 보여야 함.

### 8.3 API 계약
모델은 아래 시그니처를 export 해야 합니다. 이름이 동일하면 내부 구현은 자유입니다.
```js
// 매 프레임 호출 — 캐릭터를 ctx 위에 그린다
export function renderCharacter(ctx: CanvasRenderingContext2D, nowMs: number): void;

// 이벤트 발생 시 호출 — 반응을 예약한다
// power: 1(보통) / 2(강함) / 3(최강)
export function triggerDance(durationMs?: number, power?: number): void;

// 게임 리셋/종료 시 호출
export function resetDance(): void;
```

### 8.4 자유 영역
- 캐릭터의 외형, 색상, 팔·다리 개수, 스타일(도트/벡터/파티클/기하도형 등)
- 반응 모션 (바운스 / 회전 / 스파클 / 색상 변화 / 카메라 줌 등)
- 배경 (단색 / 그라디언트 / 추상 패턴)
- 서사적 요소 (눈 깜빡임, 윙크, 피곤한 표정 등)

---

## 9. 평가용 텔레메트리 (고정)

> AI 모델 간 공정 비교를 위해 아래 계측 포인트를 **반드시 동일하게** 구현합니다.

### 9.1 플레이 시간 집계
- `localStorage` 키: `tetris_eval_v1`
- `GameState.Playing` 진입 시각과 이탈 시각의 차이를 초 단위로 누적
- Pause 중에는 일시중지되어야 함

### 9.2 별점 수집 UI
- 게임 오버 씬에 **1~5 별 선택 UI** 를 표시 (버튼 또는 ★ 토글)
- 별점은 선택 사항 (SKIP 가능)
- 제출 시 아래 스키마로 저장:

```json
{
  "cumulativePlaySec": 0,
  "sessions": [
    {
      "startedAt": "2026-04-24T10:00:00Z",
      "endedAt": "2026-04-24T10:08:23Z",
      "durationSec": 503,
      "finalScore": 42800,
      "lines": 38,
      "level": 5,
      "rating": 4
    }
  ]
}
```

### 9.3 집계 규칙
- 별점 평균: 단순 산술평균 (소수 2자리)
- 중앙값 병기, 표본 수 `n ≥ 10` 일 때만 유의미하게 표시
- 누적 플레이 시간: 모든 세션 `durationSec` 합계

---

## 10. 성능 요구사항 (고정 목표)

| 항목 | 목표 |
| --- | --- |
| 프레임 레이트 | **60fps** 유지 (P99 프레임 ≤ 16.8ms) |
| 입력 지연 | 키 누름 → 화면 반영 **≤ 50ms** |
| SRS 회전/벽차기 | 표준 가이드라인과 **100% 일치** |
| 메모리 누수 | 30분 연속 플레이 후 힙 성장 < 20MB |
| 드롭 프레임 | 일반 플레이 중 드롭 프레임 수 = 0 |

---

## 11. 파일 구조 (권장)

```
tetris-game/
├── index.html
├── styles/
│   └── main.css
├── src/
│   ├── main.js            # 엔트리, 씬 매니저, 평가 텔레메트리
│   ├── game.js            # 상태 머신
│   ├── board.js           # 충돌, 이동, 회전, 락, 라인 클리어
│   ├── piece.js           # 테트로미노 정의
│   ├── bag.js             # 7-bag
│   ├── srs.js             # SRS 월킥 테이블
│   ├── scoring.js         # 점수 / B2B / Combo / PC / T-Spin
│   ├── input.js           # 키보드 + DAS/ARR
│   ├── renderer.js        # Canvas 렌더
│   ├── audio.js           # Web Audio API
│   ├── leaderboard.js     # localStorage 랭킹
│   ├── settings.js        # localStorage 설정
│   ├── character.js       # ★ DANCER (창의 영역)
│   ├── eval.js            # ★ 평가용 텔레메트리 (플레이 시간 / 별점)
│   └── config.js          # 상수
└── PRD_AI_EVAL.md
```

`★` 표시된 모듈은 평가 특화. 특히 `character.js` 는 자유 구현, `eval.js` 는 동일 구현.

---

## 12. 비목표 (Out of Scope)

- 온라인 멀티플레이 / 서버 랭킹
- 모바일 터치 조작
- 계정 / 로그인
- 커스텀 키 리바인딩
- 추가 게임 모드 (스프린트 / 40L / 마라톤 외)

---

## 13. 제출 체크리스트 (AI 모델용)

구현 완료 시 아래 항목이 모두 충족되어야 합니다.

- [ ] §2 ~ §7 기능 전부 동일 수치·동일 키 매핑으로 구현
- [ ] §3 스코어링 공식 값까지 정확히 일치
- [ ] §4.3 블록 색상 HEX 값 정확히 일치
- [ ] §5 사운드 10종 + BGM 합성으로 구현 (외부 에셋 0개)
- [ ] §6 리더보드 스키마 정확히 일치 (`tetris_leaderboard_v1`)
- [ ] §8 DANCER API 3종 export + 7종 트리거 반응 확인
- [ ] §9 평가 텔레메트리 `tetris_eval_v1` 스키마로 수집
- [ ] §10 성능 목표 달성 (프레임 레이트·입력 지연)
- [ ] 외부 번들러 없이 정적 파일 서빙만으로 실행 가능
- [ ] 게임오버 씬에서 별점 1~5 UI 노출 및 저장

---

## 14. 평가 리포트 템플릿

각 AI 모델 빌드는 아래 형식으로 집계되어 비교됩니다.

```
Model: <model-name>
Build date: <YYYY-MM-DD>

[Playtime]
  Cumulative play time : <HHh MMm> (n sessions = <N>)
  Average session      : <MM:SS>
  Median session       : <MM:SS>

[Rating]
  Samples (n)          : <N>
  Average stars        : <x.xx> / 5
  Median stars         : <x> / 5
  Distribution         : ★5 <a>  ★4 <b>  ★3 <c>  ★2 <d>  ★1 <e>

[Compliance]
  Fairness spec pass   : <YES / NO>
  Performance target   : <60fps hit ratio>

[Dance area notes]
  Creative description : <one paragraph>
```

---

끝.
