/* SWIM CAPSULE — reveal + count-up (reduced-motion safe) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // scroll reveal — html.js 클래스가 있어야만 CSS가 요소를 숨긴다
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  // 카드 뒤집기 — '사진·손글씨' 클릭 시 뒷면(사진+손글씨 기록)으로 애니메이션
  document.addEventListener('click', function (ev) {
    var toBack = ev.target.closest && ev.target.closest('.flip-to-back');
    var toFront = ev.target.closest && ev.target.closest('.flip-back');
    if (!toBack && !toFront) return;
    var card = (toBack || toFront).closest('.ev-card');
    if (!card) return;
    var flipped = card.classList.toggle('flipped');
    // 뒷면 영상 자동재생 / 앞면 복귀 시 정지
    card.querySelectorAll('.ev-back video').forEach(function (v) {
      if (flipped) { v.play && v.play().catch(function () {}); } else { v.pause && v.pause(); }
    });
  });

  // count-up stat numbers
  var nums = document.querySelectorAll('[data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        seen.unobserve(en.target);
        var el = en.target, target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var t0 = null, dur = 900;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { seen.observe(el); });
  }
})();
