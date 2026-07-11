# 캡슐 원본 보관소 / Capsule Archive

사이트가 사라져도 기록이 남도록, 수집한 원문을 연도별로 **그대로** 보관하는 곳입니다.
This folder preserves original sources year-by-year so records survive even if the source sites disappear.

## 구조 / Structure

```
capsules/
└── <연도 YYYY>/
    └── <event-slug>/            # data/timeline.json 의 event id와 동일
        ├── record.md            # 한국어 기록 (요약·결과·출처·맥락)
        ├── record.en.md         # 영어 기록 (해외 대학·코치 참고용)
        ├── source.html          # 원문 페이지 스냅샷 (뉴스·공식기록)
        ├── source-*.png         # 스크린샷 (선택)
        └── media/               # 사용자가 추가하는 사진·영상
```

## 규칙 / Rules

1. **원문은 수정하지 않는다** — `source.html`은 캡처 당시 그대로 보관.
2. **모든 항목은 `data/timeline.json`에 등록** — 사이트는 timeline.json에서 생성된다.
3. **중복 금지** — 캡처 전 `data/scrape-state.json`의 `captured_urls` 확인.
4. **유튜브는 링크로** — 영상은 다운로드하지 않고 경기 시작 시각 `?t=<초>` 링크를 record.md와 timeline.json에 기록.
5. **사진·영상 추가** — `media/`에 넣고 timeline.json의 해당 event `media` 배열에 파일 경로를 추가하면 사이트에 표시된다.
