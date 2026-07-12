# 출처 지도 (SOURCES) — 김재이·김지아 수영 기록

이 프로젝트의 모든 기록이 **어디서 왔는지**, 그리고 **원본이 사라져도 어디에 백업돼 있는지** 한눈에 보는 문서.
원칙: 외부 시스템은 언제든 없어질 수 있으므로, 확인한 자료는 가능한 한 이 저장소 안에 원본 파일로 복제해 둔다.

## 1. 한국 — 경기도수영연맹 (공식 기록지)

- **시스템:** 경기도수영연맹 대회기록실 — <http://www.gswimming.com/32>
- **형식:** 대회별 `.xlsx` 경기결과지 (전 종목·전 선수)
- **로컬 백업:** [`capsules/kr-gyeonggi-results/`](capsules/kr-gyeonggi-results/) — 원본 xlsx 5개 + [record.md](capsules/kr-gyeonggi-results/record.md) (김재이·김지아 기록 추출표)
- **주의:** 다운로드는 게시글 페이지를 거쳐야 동작(referer 확인). 직접 링크 curl은 오류 페이지 반환.

| 대회 | 게시글 | 로컬 파일 |
|------|--------|-----------|
| 2022 경기도 유소년 챔피언쉽 | gswimming.com/32/48 | 2022-gyeonggi-youth-championship-results.xlsx |
| 제51회 소년체전 경기도 선발전 (2022) | gswimming.com/32/45 | 2022-51st-jrsports-gyeonggi-trials-results.xlsx |
| 제52회 소년체전 경기도 선발전 (2023) | gswimming.com/32/51 | 2023-52nd-jrsports-gyeonggi-trials-results.xlsx |
| 2023 경기도교육감배 | gswimming.com/32/52 | 2023-gyeonggi-superintendent-cup-results.xlsx |
| 제53회 소년체전 경기도 선발전 (2024) | gswimming.com/32/58 | 2024-53rd-jrsports-gyeonggi-trials-results.xlsx |
| 제53회 선발전 개최 통보(공문) | gswimming.com/41/23 | capsules/2024/2024-jia-jrsports-53-selection/ |

## 2. 한국 — 뉴스

- **로컬 백업:** 각 캡슐 폴더의 `source.html` (원본 그대로).

| 매체 | URL | 로컬 |
|------|-----|------|
| 현대일보 (대통령배 금메달) | hyundaiilbo.com/news/articleView.html?idxno=547739 | capsules/2023/2023-jaei-presidents-cup-42/ |
| 이뉴스투데이 (제53회 대표 선발) | enewstoday.co.kr/news/articleView.html?idxno=2114897 | capsules/2024/2024-jia-jrsports-53-selection/ |

## 3. 한국 — 대한수영연맹 / 유튜브 (조사 진행 중)

- 대한수영연맹 공식 기록: korswim.co.kr (생활체육 부문 접영 50m 한국신기록 등 세부 확인 필요)
- 대회 중계 영상: 대한수영연맹 유튜브 채널 — 경기 시작 초(`&t=` 링크)만 기록, 다운로드하지 않음
- 상세 backlog: [`data/scrape-state.json`](data/scrape-state.json) 의 `search_backlog`

## 4. 미국 — NOVA (Irvine Novaquatics)

- **시스템 1: SwimCloud** (선수 프로필·대회 이력)
  - 김재이: <https://www.swimcloud.com/swimmer/2897193>
  - 김지아: <https://www.swimcloud.com/swimmer/2897224>
  - 팀: <https://www.swimcloud.com/team/7943> (Irvine Novaquatics)
- **시스템 2: SwimStandards** (USA Swimming 공인기록 집계·표준)
  - 김재이: <https://swimstandards.com/swimmer/jaei-kim>
  - 김지아: <https://swimstandards.com/swimmer/jia-kim-2>
- **시스템 3: USA Swimming Data Hub** (원천 공식 기록) — <https://data.usaswimming.org> (Jaei #1045380 / Jia #1045382). SPA·로그인 필요로 자동 캡처 제한.
- **주의:** SwimCloud·SwimStandards 모두 Cloudflare 보호 → 원본 HTML 저장 불가.
- **로컬 백업:** [`capsules/us-nova-results/record.md`](capsules/us-nova-results/record.md) — 개인최고기록 + 대회별 성적 전체 표.

## 5. 데이터가 사이트에 반영되는 경로

- 모든 기록은 [`data/timeline.json`](data/timeline.json) 에 등록돼야 사이트(`/`, `/en/`, 연도별)에 노출된다.
- 선수 프로필: [`data/athletes.json`](data/athletes.json)
- 수집 상태·미해결 과제: [`data/scrape-state.json`](data/scrape-state.json)

---
*최종 갱신: 2026-07-11. 새 대회 수집 시 이 표에 출처와 로컬 백업 경로를 함께 추가할 것.*
