/* SWIM CAPSULE — Capsule Ride: 1인칭 POV 스크롤 라이드
   스크롤 위치 → 카메라 전진(translateZ). 정거장은 3D 공간에 고정 배치되고
   카메라가 그 사이를 통과한다. reduced-motion / no-JS 환경은 일반 목록 폴백. */

/* 라이드 쇼츠: 시작 화면의 썸네일을 탭하면 전체 모달로 크게 재생.
   <video>는 모달에만 존재(동시 1개) — iOS 메모리 크래시 방지.
   닫으면 src 반납. JS 없으면 포스터가 mp4 링크로 동작(폴백). */
(function () {
  'use strict';
  var wrap = document.querySelector('.shorts-strip');
  if (!wrap) return;
  var modal = null;
  function close() {
    if (!modal) return;
    var v = modal.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    modal.remove();
    modal = null;
    document.documentElement.style.overflow = '';
  }
  wrap.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.short-play') : null;
    if (!btn) return;
    e.preventDefault();
    close();
    modal = document.createElement('div');
    modal.className = 'shorts-modal';
    var x = document.createElement('button');
    x.className = 'shorts-modal-close';
    x.setAttribute('aria-label', '닫기');
    x.textContent = '✕';
    var v = document.createElement('video');
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    if (btn.getAttribute('data-poster')) v.poster = btn.getAttribute('data-poster');
    v.src = btn.getAttribute('data-video');
    modal.appendChild(v);
    modal.appendChild(x);
    modal.addEventListener('click', function (ev) {
      if (ev.target === modal || ev.target === x) close();
    });
    v.addEventListener('ended', close);
    document.body.appendChild(modal);
    document.documentElement.style.overflow = 'hidden'; // 재생 중 라이드 스크롤 잠금
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

(function () {
  'use strict';
  var ride = document.querySelector('.ride');
  if (!ride) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // 폴백: 정적 목록 그대로

  var track = ride.querySelector('.ride-track');
  var stations = Array.prototype.slice.call(ride.querySelectorAll('.st'));
  var fill = ride.querySelector('.hud-fill');
  var yearEl = ride.querySelector('.hud-year');
  var autoBtn = ride.querySelector('.hud-auto');
  var lanes = ride.querySelector('.lane-lines');
  var total = stations.length;
  if (!track || total < 2) return;

  var mobile = window.matchMedia('(max-width: 560px)').matches;
  // 라이드에서는 즉시 스크롤(스무스 OFF): 자동 주행 속도를 정확히 제어하고,
  // 사용자 조작 흡수(resync)가 정확히 동작하도록.
  document.documentElement.style.scrollBehavior = 'auto';
  var STEP = mobile ? 950 : 1250;   // 정거장 간 3D 거리(px)
  var SCROLL_PER = mobile ? 640 : 820; // 정거장당 스크롤 픽셀
  var X_OFF = mobile ? 26 : 150;    // 이벤트 카드 좌우 오프셋(레일 커브 느낌)
  var SWAY = mobile ? 55 : 130;     // 트랙 커브 진폭

  ride.classList.add('ride-3d');
  function setHeight() {
    ride.style.height = ((total - 1) * SCROLL_PER + window.innerHeight) + 'px';
  }
  setHeight();

  // 정거장 3D 배치: 게이트는 중앙, 이벤트는 좌/우 번갈아 + 살짝 회전
  stations.forEach(function (st, i) {
    var gate = st.classList.contains('gate');
    var side = gate ? 0 : (i % 2 ? 1 : -1);
    var x = side * X_OFF;
    var ry = side * -10; // 카드가 트랙 안쪽을 바라보게
    st.style.transform = 'translate(-50%,-50%) translate3d(' + x + 'px,0,' + (-i * STEP) + 'px) rotateY(' + ry + 'deg)';
  });

  var cur = -1, targetZ = 0, camZ = 0, ticking = false;

  function stationYear(i) {
    var el = stations[Math.max(0, Math.min(total - 1, i))];
    return el.getAttribute('data-year') || '';
  }

  function update() {
    ticking = false;
    var rect = ride.getBoundingClientRect();
    var scrolled = Math.min(Math.max(-rect.top, 0), ride.offsetHeight - window.innerHeight);
    // 정거장 단위 매핑: SCROLL_PER 픽셀 = 정거장 1칸 → 카메라가 정거장에 정확히 정차
    var stationF = Math.min(scrolled / SCROLL_PER, total - 1);
    var p = stationF / (total - 1);
    targetZ = stationF * STEP;
    camZ += (targetZ - camZ) * 0.16; // 관성(코스터 느낌)
    if (Math.abs(targetZ - camZ) < 0.4) camZ = targetZ;

    // 커브·뱅킹: 전진 거리에 따른 사인 곡선 흔들림
    var sway = Math.sin(camZ * 0.0016) * SWAY;
    var bank = Math.sin(camZ * 0.0016) * 2.6;
    var pitch = Math.sin(camZ * 0.0009) * 1.4;
    track.style.transform =
      'rotateX(' + pitch + 'deg) rotateZ(' + bank + 'deg) translate3d(' + (-sway * 0.4) + 'px,0,' + camZ + 'px)';

    // 레인 로프 흘리기
    if (lanes) lanes.style.setProperty('--roll', (camZ * 0.9) + 'px');

    // 현재 정거장 하이라이트
    var idx = Math.round(camZ / STEP);
    if (idx !== cur) {
      cur = idx;
      stations.forEach(function (st, i) {
        var d = i - idx;
        var ad = d < 0 ? -d : d;
        // 컬링: 현재 근처(±2)만 렌더 — 나머지는 visibility:hidden으로
        // GPU 합성 레이어(백킹 스토어)를 해제해 iOS 빠른 스크롤 메모리 크래시 방지.
        var vis = ad <= 2;
        if (st._vis !== vis) { st.style.visibility = vis ? '' : 'hidden'; st._vis = vis; }
        st.classList.toggle('on', d === 0);
        st.classList.toggle('near', d === 1 || d === -1);
        st.classList.toggle('passed', d < -1);
        // 현재 정거장의 영상만 재생, 나머지는 정지
        if (st._vids === undefined) st._vids = Array.prototype.slice.call(st.querySelectorAll('video'));
        if (st._vids.length) {
          st._vids.forEach(function (v) {
            if (d === 0) { var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); }
            else if (v.pause) v.pause();
          });
        }
      });
      if (yearEl) yearEl.textContent = stationYear(idx);
    }
    if (fill) fill.style.width = (p * 100).toFixed(2) + '%';

    if (camZ !== targetZ) queue(); // 관성 잔여분 계속 렌더
  }

  function queue() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', function () { setHeight(); queue(); });

  // ---- 자동 주행 ----
  // 부동소수 위치 누적자(autoPos)를 scrollTo로 반영한다. scrollBy에 소수값을 넘기면
  // 브라우저가 sub-pixel을 버려 데스크탑에서 거의 안 움직이던 문제를 해결.
  var auto = null, autoPos = 0, speed = 1;
  var speedEl = ride.querySelector('.hud-speed');
  var speedVal = ride.querySelector('.hud-speed-val');
  var BASE = mobile ? 440 : 580; // 1배속 기준 px/초
  function maxScroll() { return Math.max(0, ride.offsetHeight - window.innerHeight); }

  function stopAuto() {
    if (auto) { cancelAnimationFrame(auto); auto = null; }
    if (autoBtn) autoBtn.textContent = autoBtn.textContent.replace('⏸', '▶');
  }
  function startAuto() {
    var mx = maxScroll();
    autoPos = window.pageYOffset || window.scrollY || 0;
    if (autoPos >= mx - 2) { autoPos = 0; window.scrollTo(0, 0); } // 끝이면 처음부터 다시
    if (autoBtn) autoBtn.textContent = autoBtn.textContent.replace('▶', '⏸');
    var last = null;
    function stepFn(ts) {
      if (last == null) last = ts;
      var dt = Math.min(ts - last, 60); last = ts;
      // 사용자가 마우스 휠·터치·키보드로 스크롤했으면 그 위치를 흡수해 '이어서' 주행한다.
      // (예전에는 조작 즉시 정지 → 마우스만 대면 멈추던 문제) 자동 주행은 계속 살아있다.
      var actual = window.pageYOffset || window.scrollY || 0;
      if (Math.abs(actual - autoPos) > 4) autoPos = actual;
      autoPos += speed * BASE * (dt / 1000);
      var m = maxScroll();
      if (autoPos >= m) { window.scrollTo(0, m); queue(); stopAuto(); return; }
      window.scrollTo(0, autoPos);
      queue();
      auto = requestAnimationFrame(stepFn);
    }
    auto = requestAnimationFrame(stepFn);
  }

  // 속도 슬라이더
  function applySpeed() {
    speed = parseFloat(speedEl.value) || 1;
    if (speedVal) speedVal.textContent = speed.toFixed(1) + '×';
  }
  if (speedEl) { applySpeed(); speedEl.addEventListener('input', applySpeed); }

  // 자동 주행 토글은 버튼(또는 Esc로 정지)으로만. 마우스/터치/키 스크롤은
  // stepFn이 흡수하므로 주행이 끊기지 않는다.
  if (autoBtn) {
    autoBtn.addEventListener('click', function () { auto ? stopAuto() : startAuto(); });
  }
  window.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && auto) stopAuto();
  });

  queue();
})();
