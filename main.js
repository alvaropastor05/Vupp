(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------- Nav scroll state ---------- */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var on = function () {
      if (scrollY > 40) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    var burger = $("[data-burger]");
    var menu = $("[data-nav-mobile]");
    if (!burger || !menu) return;
    var links = $$("a", menu);
    function close() {
      menu.setAttribute("data-open", "false");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    function open() {
      menu.setAttribute("data-open", "true");
      burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    burger.addEventListener("click", function () {
      var isOpen = menu.getAttribute("data-open") === "true";
      if (isOpen) close(); else open();
    });
    links.forEach(function (a) { a.addEventListener("click", close); });
  }

  /* ---------- Smooth anchors (native) ---------- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navOffset = 76;
      window.scrollTo({
        top: el.getBoundingClientRect().top + scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    var root = $("[data-cursor-root]");
    if (!root || !fineHover) return;
    document.documentElement.classList.add("has-cursor");
    var ring = $(".cursor-ring", root);
    var dot = $(".cursor-dot", root);
    var tx = 0, ty = 0, rx = 0, ry = 0, firstMove = false;

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (dot) dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
      if (!firstMove) {
        firstMove = true;
        rx = tx; ry = ty;
        if (ring) ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
        root.classList.add("is-ready");
      }
    }, { passive: true });

    function tick() {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      if (ring) ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    var HOVERABLES = "a, button, .card, [data-cursor]";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(HOVERABLES)) root.classList.add("is-interactive");
    });
    document.addEventListener("mouseout", function (e) {
      var related = e.relatedTarget;
      var stillIn = related && related.closest && related.closest(HOVERABLES);
      if (e.target.closest && e.target.closest(HOVERABLES) && !stillIn) root.classList.remove("is-interactive");
    });
  }

  /* ---------- Hero glow follows mouse ---------- */
  function initHeroGlow() {
    var hero = $(".hero");
    if (!hero || !fineHover) return;
    var tx = 50, ty = 40, mx = 50, my = 40;
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
    });
    function frame() {
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      hero.style.setProperty("--mx", mx + "%");
      hero.style.setProperty("--my", my + "%");
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Card tilt + halo ---------- */
  function initCardTilt() {
    if (!fineHover) return;
    $$(".card").forEach(function (card) {
      var MAX = 6;
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.15; cy += (ty - cy) * 0.15;
        card.style.setProperty("--rx", cx.toFixed(2) + "deg");
        card.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------- Marquee (runs immediately from page load) ---------- */
  function initMarquee() {
    $$("[data-marquee]").forEach(function (track) {
      var wrap = track.closest(".marquee");
      var clone = track.cloneNode(true);
      clone.removeAttribute("data-marquee");
      clone.setAttribute("aria-hidden", "true");
      track.parentNode.appendChild(clone);

      var containerWidth = wrap ? wrap.getBoundingClientRect().width : innerWidth;
      var trackWidth = track.scrollWidth;
      var startPx = containerWidth * 0.6; // begins a bit further left than fully off-screen
      var endPx = -trackWidth;            // ends fully off-screen to the left (full traverse)
      var speed = 130;                    // px/s
      var dur = (startPx - endPx) / speed;

      [track, clone].forEach(function (el) {
        el.style.setProperty("--marquee-dur", dur + "s");
        el.style.setProperty("--marquee-start", startPx + "px");
        el.style.setProperty("--marquee-end", endPx + "px");
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  /* ---------- Count-up stats ---------- */
  function initCountUp() {
    var els = $$("[data-count-to]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        trigger(entry.target);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });

    function trigger(el) {
      var target = parseFloat(el.dataset.countTo);
      var decimals = (el.dataset.countTo.split(".")[1] || "").length;
      if (reduced) {
        el.textContent = target.toFixed(decimals);
        return;
      }
      var duration = 1600;
      var start = null;
      function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        el.textContent = (target * easeOutQuad(p)).toFixed(decimals);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  }

  /* ---------- Lazy-load Spotify embeds (huge network/perf win, same look) ---------- */
  function initLazyEmbeds() {
    var frames = $$("[data-lazy-iframe]");
    if (!frames.length) return;

    function load(el) {
      if (!el.dataset.src) return;
      el.src = el.dataset.src;
      el.removeAttribute("data-src");
    }

    if (typeof IntersectionObserver === "undefined") {
      frames.forEach(load); // fallback: load all
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          load(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: "400px", threshold: 0.01 });
    frames.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Producer tag button (hero) — short blip, always resets ---------- */
  function initTagPlayer() {
    var btn = $("[data-tag-play]");
    var audio = $("[data-audio-tag]");
    if (!btn || !audio) return;

    var MAX_MS = 1800; // safety cap in case the file is longer than expected
    var resetTimer = null;

    function reset() {
      clearTimeout(resetTimer);
      resetTimer = null;
      try { audio.pause(); audio.currentTime = 0; } catch (e) {}
      btn.classList.remove("is-playing");
    }

    btn.addEventListener("click", function () {
      clearTimeout(resetTimer);
      try {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.then) {
          p.then(function () {
            btn.classList.add("is-playing");
            resetTimer = setTimeout(reset, MAX_MS);
          }).catch(function () { reset(); });
        } else {
          btn.classList.add("is-playing");
          resetTimer = setTimeout(reset, MAX_MS);
        }
      } catch (e) { reset(); }
    });

    audio.addEventListener("ended", reset);
  }

  /* ---------- Beat player + bass-reactive canvas (Trayectoria) ---------- */
  function initBeatVisualizer() {
    var section = $("#trayectoria");
    var canvas = $("[data-beat-canvas]");
    var audio = $("[data-audio-beat]");
    var btn = $("[data-beat-toggle]");
    var label = $("[data-beat-label]");
    if (!section || !canvas || !audio || !btn) return;

    var CLIP_START = 35, CLIP_END = 53;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var audioCtx, analyser, source, dataArray;
    var rafId = null;
    var t = 0;
    var BASS_BINS = 10;
    var BARS = 46;

    function resize() {
      var rect = section.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function ensureGraph() {
      if (audioCtx) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        audioCtx = new AC();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        return true;
      } catch (e) { return false; }
    }

    function bassLevel() {
      if (!analyser) return 0;
      analyser.getByteFrequencyData(dataArray);
      var sum = 0;
      for (var i = 0; i < BASS_BINS; i++) sum += dataArray[i];
      return sum / (BASS_BINS * 255);
    }

    function draw() {
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      var bass = bassLevel();
      t += 0.025;
      var gap = w / BARS;
      ctx.fillStyle = "#6C5CFF";
      for (var i = 0; i < BARS; i++) {
        var n = Math.sin(i * 0.5 + t) * 0.5 + 0.5;
        var barH = (0.05 + bass * 0.95 * n) * h;
        ctx.fillRect(i * gap, h - barH, gap * 0.55, barH);
      }
      rafId = requestAnimationFrame(draw);
    }

    function startDraw() { if (!rafId) draw(); }
    function stopDraw() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function setPlayingUI(isPlaying) {
      btn.classList.toggle("is-playing", isPlaying);
      if (label) label.textContent = isPlaying ? "Pausa" : "Reproducir base";
    }

    btn.addEventListener("click", function () {
      if (audio.paused) {
        if (audio.currentTime < CLIP_START || audio.currentTime >= CLIP_END) {
          audio.currentTime = CLIP_START;
        }
        ensureGraph();
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        var p = audio.play();
        if (p && p.then) {
          p.then(function () { startDraw(); }).catch(function () {});
        } else {
          startDraw();
        }
        setPlayingUI(true);
      } else {
        audio.pause();
        stopDraw();
        setPlayingUI(false);
      }
    });

    audio.addEventListener("timeupdate", function () {
      if (audio.currentTime >= CLIP_END) {
        audio.pause();
        audio.currentTime = CLIP_START;
        stopDraw();
        setPlayingUI(false);
      }
    });
    audio.addEventListener("ended", function () {
      stopDraw();
      setPlayingUI(false);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    safe(initNav, "initNav");
    safe(initMobileMenu, "initMobileMenu");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initCursor, "initCursor");
    safe(initHeroGlow, "initHeroGlow");
    safe(initCardTilt, "initCardTilt");
    safe(initMarquee, "initMarquee");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initLazyEmbeds, "initLazyEmbeds");
    safe(initTagPlayer, "initTagPlayer");
    safe(initBeatVisualizer, "initBeatVisualizer");

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
