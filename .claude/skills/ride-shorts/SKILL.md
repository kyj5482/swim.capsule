---
name: ride-shorts
description: 김재이·김지아의 연도별 대회 지역/장소를 1인칭 워터코스터 POV로 여행하는 "라이드 쇼츠" 영상을 생성하는 스킬. "쇼츠 만들어줘", "라이드 쇼츠", "<이름> <연도> 쇼츠", "<연도> 쇼츠" 요청 시 사용. 이름+연도 → 그 선수의 쇼츠, 연도만 → 남매가 모두 등장하는 쇼츠.
---

# RIDE SHORTS — 수영 타임캡슐 라이드 쇼츠 생성

## 0. 먼저 읽을 것

- **`CONCEPT.md` (이 폴더)** — 레퍼런스 영상의 시각 문법. 모든 장면 구성·자막·카메라 규칙의 기준.
  원본 첨부 영상 없이 이 문서만으로 작업한다.
- 현재 품질 단계는 CONCEPT.md §7 표 참조 (v0=3초 컨셉 → v3=완성본).
  **한 번에 완성하지 말 것.** 단계당 한 가지씩만 개선하고 사용자 확인을 받는다 (토큰 절약).

## 1. 입력 해석

| 입력 | 동작 |
|---|---|
| 이름 + 연도 (예: "재이 2025") | 그 선수의 해당 연도 쇼츠. 자막·기록 패널 모두 그 선수 것만 |
| 연도만 (예: "2025") | 남매 모두 등장 — 구간별로 두 선수의 기록 패널을 번갈아 배치 |
| 없음/모호 | 정보가 가장 많은 연도부터 제안 (2025 어바인이 현재 기준 최다) |

이름 매핑: 재이/Jaei → `jaei`, 지아/Jia → `jia` (timeline.json `athletes` 필드).

## 2. 데이터 → 구간(장면) 설계

1. `data/timeline.json`에서 해당 연도(및 선수) 이벤트 추출.
2. `location_ko/location_en`으로 **지역별 그룹핑** → 이벤트 수가 많은 지역 순으로 구간 선정.
   (예: 2025 = 어바인 Woollett 중심 + 라미라다·플레전턴·미션비에호·샌클레멘테)
3. 구간당 내용물: 대회장 실사 배경 1장 + 기록 패널(들) + (있으면) `media` 사진·`note_ko` 손글씨.
4. 구간 순서는 시간순. 인트로(탑승 구역) → 지역 구간들 → 아웃트로(석양) — CONCEPT.md §3.

## 3. 배경 사진 수집 (인터넷)

- 대회장/지역의 **고품질 실사 사진**을 찾는다. 우선순위:
  ① Wikimedia Commons(라이선스 명확) ② 시/기관 공식 사이트 ③ 기타.
- WebSearch로 찾고 curl로 `media/shorts/assets/<slug>.jpg` 저장.
- **라이선스·작가를 `media/shorts/assets/CREDITS.md`에 반드시 기록** (CC BY-SA 등 표기 의무).
- 가로 사진이어도 됨 — 렌더러가 9:16 세로 슬라이스 크롭 (scene JSON의 `focusX`로 크롭 중심 지정).
- 기존 확보분: `woollett-irvine.jpg` (CC BY-SA 4.0, Brian MacIntosh — 2025 어바인).

## 4. 장면 JSON 작성 → 렌더

장면 정의: `scripts/shorts/scenes/<연도>-<지역|이름>-v<버전>.json`
(스키마 예시는 `scenes/2025-irvine-v0.json` 참조 — bg/focusX/horizonY/vpx/badge/plaque/title/panel)

- `horizonY`: 배경 사진에서 지면 소실선의 세로 비율(0~1). 물길 소실점이 여기 붙는다.
- `vpx`: 소실점 x 비율 — 카메라가 향하는 목표(건물·게이트) 방향으로.
- `panel`: 기록 패널(개인 전시관 액자). 연도만 입력받았으면 남매 것을 구간마다 번갈아.

렌더 (최초 1회 `cd scripts/shorts && npm i` 필요; Google Chrome + ffmpeg 필수):

```bash
node scripts/shorts/render.mjs scripts/shorts/scenes/<장면>.json
```

출력: `media/shorts/<슬러그>.mp4` + 포스터 `<슬러그>.jpg` (1080×1920, H.264).

## 5. 품질 확인 (필수 — 영상을 직접 열어볼 수 없으므로)

```bash
ffmpeg -y -ss <t> -i media/shorts/<슬러그>.mp4 -frames:v 1 /tmp/check.jpg
```

시작/중간/끝 3프레임을 Read로 확인: ① 자막·패널이 화면 밖으로 잘리지 않는가
② 물길 소실점이 배경의 지면과 맞는가 ③ 전진감(줌·물결 흐름)이 보이는가.
문제가 있으면 `renderer.html`(공용 엔진) 또는 장면 JSON(장면별 값)을 고쳐 재렌더.

## 6. 사이트 등록 (라이드 시작 화면 썸네일)

1. `media/shorts/shorts.json` 매니페스트에 항목 추가:
   ```json
   { "id": "<슬러그>", "title_ko": "...", "title_en": "...", "desc_ko": "...", "desc_en": "..." }
   ```
   (`<슬러그>.mp4` / `<슬러그>.jpg`가 `media/shorts/`에 있어야 함)
2. `node scripts/build.mjs` — 빌드가 매니페스트를 읽어 라이드 페이지 시작부에
   포스터 썸네일 카드(클릭 시 재생)를 만들고 `dist/assets/shorts/`로 파일을 복사한다.
3. 빌드 성공 확인 후 커밋.

## 7. 품질 단계 올리기 (다음 세션에서 이어가기)

- 현재 단계와 다음 목표는 CONCEPT.md §7 표 기준. 새 버전은 `-v<N+1>` 슬러그로 만들고
  확인 후 매니페스트를 교체한다 (이전 버전 파일은 삭제).
- v3: 전체 60~90초 = 장소 템플릿 추가 + BGM.

## 7.5 V2 워크플로 — 장소 템플릿 + 후합성 (표준, 최소 크레딧)

**핵심**: 장소 영상(AI, 크레딧 소모)은 선수와 무관한 **템플릿**으로 1회만 생성하고,
기록·손글씨·이름은 **전광판 영역에 실제 텍스트 후합성**(크레딧 0)으로 넣는다.
선수별/연도별 확장은 cast JSON만 복사해 텍스트·음성을 바꾸면 끝.

1. **템플릿** (`media/shorts/templates/tpl-*.mp4`, 720p fast로 충분):
   - `tpl-a-start-irvine`: 스타트 게이트 정지(2.5초) → 폭발적 출발. **end_image=다음 클립 첫 프레임**으로 생성해 이음새 제거.
   - `tpl-b-irvine`: 어바인 주행 (v1 재활용).
   - `tpl-c-tunnel`: 관중석 아래 터널 진입. **start_image=이전 클립 끝 프레임**. 2.2초에서 트리밍+페이드아웃(터널 내부가 가장 어두운 지점).
   - `tpl-d-lamirada`: 터널 어둠에서 라미라다로 등장. 터널 어둠끼리 만나 컷이 자연스러움.
   - 새 장소 추가 시: 장소 실사 사진 레퍼런스 + "large dark blank LED jumbotron screen" 문구를 프롬프트에 넣어 후합성 타깃을 확보. 진입은 "starting in near-total darkness inside a tunnel"로 시작하면 어느 클립 뒤에도 붙는다.
2. **후합성**: `node scripts/shorts/compose.mjs scripts/shorts/casts/<cast>.json`
   - cast JSON = 세그먼트 목록(트리밍 포함) + panels(LED 전광판/손글씨 쪽지, 전광판 위치를 따라가는 키프레임) + vo/sfx.
   - 키프레임은 템플릿마다 1회 실측(프레임 추출→좌표)하면 모든 선수에 재사용.
   - 텍스트는 timeline.json의 실제 기록만 사용(추측 금지), 손글씨는 note_ko 원문(축약 가능).
3. **오디오** (모두 무료·로컬):
   - 수영 스타트: `say -v Eddy -r 140 "Take your mark"`(출발 0.7초) + 980Hz 비프(출발 직전, A 템플릿은 2.5초).
   - 아나운서: `say -v Yuna -r 210` — "레인 N번, 이름! 대회명, 종목 순위, 기록!" 형식. 장소 구간마다 1개.
   - 템플릿의 현장음(물소리)은 0.85 볼륨으로 유지하고 그 위에 믹스.
4. 확인(§5) → 매니페스트(§6) → 커밋.

## 8. AI 실사 생성 (v1부터 — Higgsfield MCP + Seedance 2.0)

Higgsfield MCP 서버가 연결된 세션에서는 `seedance_2_0`으로 실사 클립을 생성한다:

1. **크레딧 확인 필수**: `balance` 조회 → `generate_video`에 `get_cost:true`로 비용 선확인.
   잔액의 절반 이상이 들면 반드시 사용자에게 해상도/시도 횟수를 물어본다.
   (참고 단가: 5초 9:16 기준 1080p std=45, 4K std=110 크레딧 — 2026-07 시점)
2. 장소 실사 사진을 `media_upload`(presigned PUT + `media_confirm`)로 올려
   `image_references` 역할로 전달 → 실제 장소 재현 정확도 확보.
3. 프롬프트는 CONCEPT.md §7 템플릿 + §8 피드백 규칙(속도감·전광판 통합)으로 조립.
   전광판/현수막 텍스트는 짧은 영문+숫자 위주로 (긴 한글은 AI가 뭉갬).
   `genre:"action"`, `generate_audio:true` (물소리·현장음 네이티브 생성).
4. 완료 후 결과 URL을 curl로 받아 `media/shorts/<슬러그>.mp4` 저장,
   ffmpeg로 포스터 추출(§5), 프레임 확인, 매니페스트 갱신(§6).
