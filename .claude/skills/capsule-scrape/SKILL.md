---
name: capsule-scrape
description: 김재이·김지아 남매의 수영 기록물(뉴스·공식기록·유튜브·USA Swimming)을 특정 기간 기준으로 중복 없이 수집해 capsules/에 원본 보관하고 timeline.json에 등록하는 스킬. "기록 수집", "스크랩", "캡슐 채우기", 기간(예: 2023년 상반기) 지정 요청 시 사용.
---

# capsule-scrape — 수영 기록 타임캡슐 수집 스킬

## 입력

사용자가 지정하는 것: **기간**(필수, 예: `2023-01-01~2023-12-31`), 선수(선택: 재이/지아/둘다, 기본 둘다).

## 0. 시작 전: 이어하기(resume) 상태 확인

1. `data/scrape-state.json`을 읽는다.
   - `pending_captures`: 이전 세션에서 캡처하지 못한 URL — **가장 먼저 처리**한다.
   - `covered_periods`: 이미 수집 완료한 기간 — 요청 기간과 겹치면 겹치는 부분은 건너뛴다.
   - `captured_urls`: 이미 보관된 URL — 절대 다시 수집하지 않는다 (중복 금지의 기준).
   - `search_backlog`: 미해결 조사 과제 — 요청 기간과 겹치는 항목을 이번 실행에 포함한다.
2. 토큰/세션이 중간에 끊겨도 이어갈 수 있도록, **항목 하나를 완료할 때마다 즉시** scrape-state.json을 갱신하고 커밋한다. (몰아서 하지 말 것)

## 1. 검색 대상 (4개 소스)

`data/athletes.json`의 이름·소속·지역을 검색어 조합에 사용한다.
한국 시기(~2024): 김재이 / 김지아 + 청계초 / 청소년수련관 / 과천 / 경기도.
미국 시기(2025~): Jaei Kim / Jia Kim + NOVA / Novaquatics / Irvine.

### A. 대한수영연맹 공식 기록 (korswim.co.kr)
- 대회일정·기록실에서 해당 기간의 대회를 찾고, 결과 페이지에서 선수 이름 검색.
- 종목·라운드(예선/결승)·순위·**기록(타임)**·대회명·일자·장소를 추출.
- 결과 페이지 HTML을 `source.html`로 저장. PDF 결과면 PDF 그대로 저장.

### B. 뉴스
- 검색: `"김재이" 수영`, `"김지아" 수영`, `과천 청소년수련관 수영`, 대회명+이름 조합.
- 기사 페이지 **전체 HTML**을 `source.html`로 저장 (이미지 포함 가능하면 함께).
- 크롬 확장(SingleFile 등)이 설치된 로컬 환경이면 그것으로 완전 캡처를 우선한다.

### C. 유튜브 (다운로드 금지 — 시작 초 링크만)
- 대회 중계·기록 영상 검색: 대회명 + 종목 + 조/레인 또는 선수 이름.
- 해당 선수의 경기가 **시작되는 초**를 찾아 `https://www.youtube.com/watch?v=<ID>&t=<초>s` 형식으로 기록.
- timeline.json 해당 event의 `sources`에 `{"kind":"youtube","url":"...&t=123s","note":"여자 초등부 평영50m 결승, 4레인"}` 형태로 추가.

### D. USA Swimming Data Hub (data.usaswimming.org)
- Member ID로 조회: **Jaei 1045380 / Jia 1045382** (athletes.json 참조).
- 기간 내 대회별 Times 결과(종목, 코스 SCY/LCM, 타임, 대회명, 일자)를 추출.
- 결과 화면 HTML 저장 + 표 데이터를 record.md에 마크다운 표로 옮긴다.
- SwimCloud 등 보조 사이트가 있으면 교차 확인용으로만 사용.

## 2. 저장 규칙 (캡슐 형식)

이벤트 하나당:

```
capsules/<YYYY>/<YYYY-{athlete}-{meet-slug}>/
├── record.md       # 한국어: 대회·일자·장소·결과표(타임 포함)·맥락·출처 표
├── record.en.md    # 영어 번역 (해외 대학·코치 열람용 — 대회 성격 설명 포함)
├── source.html     # 원문 그대로 (뉴스/공식기록)
└── media/          # (사용자 전용) 사진·영상 슬롯 — 스킬은 건드리지 않음
```

그리고 반드시:
1. `data/timeline.json`의 `events`에 등록 (기존 항목이면 results/sources 보강, `verified: true`로 갱신). 스키마는 파일 상단 `$schema_note` 참조.
2. `data/scrape-state.json`의 `captured_urls`에 URL 추가, 완료한 기간을 `covered_periods`에 추가.
3. `node scripts/build.mjs`로 빌드가 깨지지 않는지 확인.
4. 커밋 메시지: `capsule: <기간> <선수> — <추가된 항목 수>건 수집`

## 3. 중복 방지

- URL이 `captured_urls`에 있으면 스킵.
- 같은 대회·같은 종목·같은 라운드의 기록이 timeline.json에 이미 있으면 새 event를 만들지 말고 기존 event를 보강한다.
- 같은 기사를 여러 검색어로 만나도 한 번만 저장.

## 4. 번역 원칙 (record.en.md)

- 대회명은 로마자 표기 + 성격 설명 병기 (예: "President's Cup — one of Korea's premier national championships").
- 학년은 미국식으로 환산 병기 (예: 4학년 → 4th grade).
- 기록(타임)·순위·일자는 원문 그대로. 추측 금지 — 미확인 값은 "TBC"로 표기.

## 5. 환경별 동작

- **원격(Claude Code on the web)**: 외부 사이트 직접 다운로드가 네트워크 정책으로 차단될 수 있다. 이 경우 WebSearch로 메타데이터·내용을 확보해 record.md와 timeline.json까지만 갱신하고, 원문 캡처는 `pending_captures`에 남긴다.
- **로컬(사용자 PC)**: `pending_captures`를 우선 처리. 크롬 확장(SingleFile 등) 또는 `curl`/Playwright로 source.html 저장.
