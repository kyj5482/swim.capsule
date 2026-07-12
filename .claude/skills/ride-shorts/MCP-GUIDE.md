# RIDE SHORTS — Higgsfield MCP 실행 가이드 (모델 무관 · Opus 등에서 그대로 수행)

이 문서는 어떤 Claude 모델이 이어받아도 **동일한 순서·검증**으로 AI 클립을
생성/합성할 수 있게 하는 체크리스트다. 판단이 필요한 부분은 기준을 명시했다.

## 0. 크레딧 상태 (갱신할 것)

- **2026-07-12 기준 잔액 16 크레딧.** 최저 단가(720p fast 5초)=17.5 → **현재 신규 생성 불가.**
- 새 클립이 필요하면 먼저 사용자에게 충전을 요청하고, 그 전까지는
  기존 템플릿(media/shorts/templates/) + 후합성(compose.mjs)만 사용한다.
- 단가표(9:16, 2026-07 실측): 720p fast 5s=17.5 / 720p fast 4s=14 / 1080p std 5s=45 / 4K std 5s=110.

## 1. 생성 전 필수 절차 (순서 고정)

1. `balance` 호출 → 잔액 기록.
2. `generate_video`에 **`get_cost:true`** 로 정확한 비용 선확인 (같은 params로).
3. 비용 > 잔액 → 중단하고 사용자에게 보고. 비용 > 잔액의 50% → 사용자에게 해상도/시도 횟수 선택지 제시(AskUserQuestion).
4. 레퍼런스 이미지 업로드: `media_upload`(filename) → 반환된 presigned URL에
   `curl -X PUT --data-binary @파일` → **HTTP 200 확인** → `media_confirm`(type:"image", media_id).
5. `generate_video` 호출 규칙:
   - model: `seedance_2_0`, aspect_ratio: `"9:16"`, mode/resolution: 예산에 맞게(§0 단가표).
   - `genre:"action"`, `generate_audio:true` (현장음 — 후합성에서 0.55로 덕킹됨).
   - 장소 재현: 실사 사진을 `image_references` 역할로. 클립 연결: 이전 클립 끝프레임을 `start_image`로.
   - **프롬프트에 반드시 포함**: "first-person POV", "white fiberglass boat bow, black padded
     handlebar, two hands", "narrow water channel with two submerged steel rails",
     "photorealistic", 속도감 키워드("racing", "motion blur", "water spray").
   - 후합성 타깃 확보: "a large dark blank LED billboard beside the channel" 문구 포함.
   - preset 추천 notice가 오면: 우리는 항상 리터럴 생성 →
     `declined_preset_id`에 해당 preset id를 넣어 재호출.
6. 완료 대기: `sleep 90` 백그라운드 → `show_generations`(type:"video") 폴링.
   fast 모드 ~2분, std ~4분. 10분 초과 시 1회만 더 기다리고 사용자에게 보고.
7. 다운로드: results.rawUrl을 curl로 `media/shorts/templates/tpl-<슬러그>.mp4`에 저장.

## 2. 생성 결과 검증 (모두 통과해야 사용)

각 클립에서 ffmpeg로 프레임 3~4장 추출(시작/중간/끝) 후 Read로 확인:

- [ ] 보트 뱃머리+핸들바+두 손이 하단에 있는가 (POV 유지)
- [ ] 물길+쌍레일이 전방으로 이어지는가
- [ ] 장소가 레퍼런스 사진의 특징(건물·구조물·색)을 재현했는가
- [ ] **클립 경계**: 앞 클립 끝프레임 vs 뒤 클립 첫프레임 비교 —
      건물/랜드마크가 "더 가까워지는" 방향인가? 뒤로 점프하면 앞 클립을 `to:`로
      일찍 잘라서 해결 (예: tpl-a는 3.0s 컷). end_image를 줬어도 반드시 실측할 것.
- [ ] 터널 연결: 앞 클립이 어두워지는 지점(brightness로 찾기)에서 트리밍+`fadeOut`,
      뒤 클립은 "starting in near-total darkness" 프롬프트로 생성된 것 사용.

## 3. 후합성 (크레딧 0 — 선수/연도 확장은 언제나 이 방법)

1. cast JSON 작성: `scripts/shorts/casts/` 기존 파일 복사 후 텍스트·음성만 교체.
   - 기록은 `data/timeline.json`의 실측값만 (추측 금지, 스킬 §3 참조).
   - 기록/이름은 **콘솔 LCD 하나**(`type:"dash"`)로 통일 — 좌우 부유 광고판(`board`)은
     화면과 동떨어져 보여 폐기. dash는 뱃머리에 장착된 계기판처럼 화면 중앙 하단에
     **고정**되고 `keys`는 알파(페이드)만 제어(위치 무시). 헤더 라벨(줄0)+본문.
     accent: 기록=파랑 #0b62d6, 스타트=레드 #c9241e. 시간/기록 강조는 #ffe27a.
   - (대안) 영상에 실제 전광판이 있는 구간은 그 위치에 맞춰 얹을 수 있으나 이동·원근
     추적이 필요해 유지비 큼 → 기본은 콘솔 LCD.
   - 키프레임은 템플릿마다 이미 실측되어 있음 — 새 템플릿만 프레임 추출로 실측.
     **우측 끝 잘림 계산**: x + (w/2)*s ≤ 1065 를 모든 키에서 만족해야 함.
2. 음성: edge-tts만 사용 (Higgsfield 오디오 금지 — 크레딧).
   - 아나운서 = `ko-KR-SunHiNeural +22%` + `"fx":"pa"`, **아주 짧은 레이싱 콜**
     ("김재이, 평영 50미터 동메달!" ≈3초). 정확한 기록은 LCD에 있으니 음성엔 빼서 짧게.
     반드시 `python3 -m edge_tts`로 길이 실측(구간보다 짧게).
   - 스타터 = `en-US-ChristopherNeural -8%` "Take your mark" + 비프(자동 생성).
   - 볼륨: 콜 3.4, 스타터 2.6. 배경음은 상수 감쇠가 아니라 **동적 덕킹**
     (compose.mjs의 sidechaincompress)으로 콜 때만 부드럽게 내려갔다 돌아옴.
3b. 장면 전환: 세그먼트 결합은 concat이 아니라 **xfade/acrossfade 크로스페이드**
    (cast의 `"xfade":0.4`). 클립 사이 점프가 디졸브로 부드러워진다. 완벽한 공간
    연속성이 필요하면 클립 재생성이 필요(크레딧) — 잔액 부족 시 크로스페이드로 대체.
3. `node scripts/shorts/compose.mjs scripts/shorts/casts/<cast>.json`
4. **합성 검증**: 오버레이 시점 프레임 3장(스타트 보드/기록 보드/손글씨) Read로 확인 +
   `volumedetect`로 VO 구간 max_volume ≥ -6dB 확인.
5. `media/shorts/shorts.json` 매니페스트 갱신 → `node scripts/build.mjs` →
   라이드 페이지에서 재생 확인 → 커밋. 푸시는 사용자 확인 후.

## 4. 이 프로젝트에서 이미 확정된 결정 (다시 묻지 말 것)

- 텍스트가 필요한 정보(기록·이름·손글씨)는 절대 AI 생성에 맡기지 않는다(뭉개짐) — 항상 후합성.
- 장소 템플릿은 선수와 무관하게 만들어 재사용한다 (선수별 = cast JSON만).
- 오프닝은 수영 스타트 연출(정지→Take your mark→비프→폭발 출발) 고정.
- 사이트 재생: 게이트 안 썸네일 → 모달 플레이어 (video 상시 마운트 금지 — iOS 크래시).
