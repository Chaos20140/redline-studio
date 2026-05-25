/* =========================================================
   REDLINE/STUDIO — Core Script v3
   Highlights: Lenis smooth scroll · canvas-rendered scroll video
   · three.js 3D · perf-aware
   ========================================================= */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* =========================================================
     LENIS — smooth scroll (Apple/Stripe-style inertia)
     Single shared instance, hooked into GSAP ticker so
     ScrollTrigger updates in lock-step.
     ========================================================= */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
      lerp: 0.085,
    });
    // Use GSAP ticker as the single rAF source — no double scheduling.
    if (window.gsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // Connect Lenis to ScrollTrigger so pinning + scrub stay aligned.
    if (window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  /* ---------- LOADER ---------- */
  const loader = $("#loader");
  const loaderCount = $("#loaderCount");
  const loaderBar = $(".loader__bar span");
  if (loader) {
    let n = 0;
    const dur = reduce ? 200 : 1500;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      n = Math.round(eased * 100);
      if (loaderCount) loaderCount.textContent = String(n).padStart(3, "0");
      if (loaderBar) loaderBar.style.width = n + "%";
      if (p < 1) requestAnimationFrame(tick);
      else {
        setTimeout(() => {
          loader.classList.add("is-done");
          document.body.classList.add("is-loaded");
        }, 200);
      }
    };
    requestAnimationFrame(tick);
  } else {
    document.body.classList.add("is-loaded");
  }

  /* ---------- CUSTOM CURSOR ---------- */
  const cursor = $(".cursor");
  const cdot = $(".cursor__dot");
  const cring = $(".cursor__ring");
  let pointerX = window.innerWidth / 2, pointerY = window.innerHeight / 2;

  window.addEventListener("mousemove", (e) => {
    pointerX = e.clientX; pointerY = e.clientY;
  });

  if (cursor && !isTouch) {
    let dx = pointerX, dy = pointerY, rx = pointerX, ry = pointerY;
    const tickCursor = () => {
      dx = lerp(dx, pointerX, 0.55);
      dy = lerp(dy, pointerY, 0.55);
      rx = lerp(rx, pointerX, 0.18);
      ry = lerp(ry, pointerY, 0.18);
      if (cdot) cdot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      if (cring) cring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tickCursor);
    };
    tickCursor();

    const hoverables = "a, button, .chip, .service, .case, .nav__cta, .footer__top-btn, input, textarea, [data-magnetic]";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverables)) cursor.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverables)) cursor.classList.remove("is-hover");
    });
  }

  /* ---------- NAV SCROLLED ---------- */
  const nav = $("#nav");
  const onNavScroll = () => {
    if (window.scrollY > 50) nav?.classList.add("is-scrolled");
    else nav?.classList.remove("is-scrolled");
  };
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  /* ---------- MAGNETIC ELEMENTS ---------- */
  $$("[data-magnetic]").forEach((el) => {
    let rect;
    el.addEventListener("mouseenter", () => { rect = el.getBoundingClientRect(); });
    el.addEventListener("mousemove", (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.25;
      const dy = (e.clientY - cy) * 0.25;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; rect = null; });
  });

  /* ---------- SERVICE CARD GLOW TRACKING ---------- */
  $$(".service").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", mx + "%");
      card.style.setProperty("--my", my + "%");
    });
  });

  /* ---------- INTERSECTION REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });
  $$("[data-service], [data-case], [data-step], .stat, .reveal").forEach((el) => io.observe(el));

  /* ---------- STAT COUNTERS ---------- */
  const counters = $$(".stat__num[data-count]");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = reduce ? 200 : 1600;
      const start = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((el) => countIO.observe(el));

  /* ---------- HERO VIDEO PAUSE WHEN OFF-SCREEN ---------- */
  const heroVideo = $(".hero__video");
  const heroSection = $(".hero");
  if (heroVideo && heroSection && "IntersectionObserver" in window) {
    const heroIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    }, { threshold: 0.05 });
    heroIO.observe(heroSection);
  }

  /* ---------- HERO TELEMETRY (only while visible) ---------- */
  const rpmEl = $("#rpm");
  const spdEl = $("#spd");
  let telemetryActive = false;
  if (rpmEl && spdEl && !reduce && "IntersectionObserver" in window) {
    let timer = null;
    const teleIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !timer) {
          timer = setInterval(() => {
            const base = 12480;
            rpmEl.textContent = (base + Math.floor(Math.random() * 200 - 100))
              .toLocaleString("en-US").replace(",", " ");
            spdEl.textContent = 328 + Math.floor(Math.random() * 8 - 4);
          }, 220);
        } else if (!e.isIntersecting && timer) {
          clearInterval(timer); timer = null;
        }
      });
    }, { threshold: 0.05 });
    teleIO.observe(heroSection);
  }

  /* ---------- FOOTER CLOCK ---------- */
  const clock = $("#clock");
  if (clock) {
    const fmt = (n) => String(n).padStart(2, "0");
    const tickClock = () => {
      const d = new Date();
      clock.textContent = `${fmt(d.getHours())} : ${fmt(d.getMinutes())} : ${fmt(d.getSeconds())} — DRESDEN`;
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------- CONTACT FORM ---------- */
  const form = $("#contactForm");
  const status = $("#formStatus");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get("name")?.toString().trim();
      const email = data.get("email")?.toString().trim();
      const msg = data.get("message")?.toString().trim();
      const consent = data.get("consent");

      if (!name || !email || !msg || !consent) {
        status.textContent = "// ERROR — Bitte fülle alle Pflichtfelder aus.";
        status.classList.remove("is-ok"); status.classList.add("is-err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = "// ERROR — E-Mail-Format ungültig.";
        status.classList.remove("is-ok"); status.classList.add("is-err");
        return;
      }

      status.textContent = "// TRANSMITTING SIGNAL...";
      status.classList.remove("is-err", "is-ok");
      const subject = encodeURIComponent(`Neues Projekt — ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nE-Mail: ${email}\nUnternehmen: ${data.get("company") || "-"}\n` +
        `Services: ${data.getAll("service").join(", ") || "-"}\nBudget: ${data.get("budget") || "-"}\n\n` +
        `Briefing:\n${msg}`
      );
      setTimeout(() => {
        window.location.href = `mailto:tolgay.u0@gmail.com?subject=${subject}&body=${body}`;
        status.textContent = "// SIGNAL TRANSMITTED — Mail-Client geöffnet.";
        status.classList.add("is-ok");
        form.reset();
      }, 600);
    });
  }

  /* ---------- ANCHOR LINKS ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* =========================================================
     BACKGROUND VIDEO — two strategies branched on isMobile.
     - Mobile: autoplay loop with the 9:16 clip (no scroll-scrub).
       Phones can't reliably hold ~90 ImageBitmaps in GPU mem and
       the seek-based scrub is jankier than a clean loop anyway.
     - Desktop: frame-renderer below (canvas + ImageBitmap cache).
     ========================================================= */
  if (isMobile) {
    const wrap  = $("#bgScroll");
    const video = $("#bgScrollVideo");
    const canvas = $("#bgScrollCanvas");
    const startEl = $("#manifesto");
    const endEl   = $(".contact") || $("#contact");
    if (wrap && video && startEl && endEl) {
      canvas?.remove();   // canvas only needed on desktop
      const src = document.createElement("source");
      src.src = "assets/video/scroll-mobile.mp4?v=20260523g";
      src.type = "video/mp4";
      video.appendChild(src);
      video.loop = true;
      video.autoplay = true;
      video.muted = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.load();
      const tryPlay = () => video.play().catch(() => {});
      video.addEventListener("loadeddata", tryPlay, { once: true });
      document.addEventListener("touchstart", tryPlay, { once: true });

      const onScroll = () => {
        const sTop = startEl.getBoundingClientRect().top + window.scrollY;
        const eBox = endEl.getBoundingClientRect();
        const eBottom = eBox.top + window.scrollY + eBox.height * 0.7;
        const mid = window.scrollY + window.innerHeight * 0.5;
        wrap.classList.toggle("is-active", mid > sTop && mid < eBottom);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  } else {
  /* =========================================================
     SCROLL-SCRUB BACKGROUND VIDEO — canvas-based frame renderer
     Strategy:
       1. After metadata loads, extract N frames by playing the
          video once at 4x speed and capturing each decoded frame
          via requestVideoFrameCallback (when available) or by
          time-stepped seeking.
       2. Each frame is stored as an ImageBitmap (GPU-resident).
       3. On scroll we lerp a smoothed progress and draw the
          closest frame to a 2D canvas. No more `video.currentTime`
          seeking on every scroll tick — that was the source of
          stutter (driven by sparse video keyframes + browser
          seek throttling).
     ========================================================= */
  (() => {
    const wrap   = $("#bgScroll");
    const video  = $("#bgScrollVideo");
    const canvas = $("#bgScrollCanvas");
    if (!wrap || !video || !canvas) return;

    const startEl = $("#manifesto");
    const endEl   = $(".contact") || $("#contact");
    if (!startEl || !endEl) return;

    const FRAME_TARGET = reduce ? 12 : 140;      // denser sampling → less stutter
    const MAX_W = Math.min(window.innerWidth * 2, 1920);
    const MAX_H = Math.min(window.innerHeight * 2, 1080);

    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    const off = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(MAX_W, MAX_H)
      : Object.assign(document.createElement("canvas"), { width: MAX_W, height: MAX_H });
    const offCtx = off.getContext("2d", { alpha: false });

    let duration   = 0;
    let frames     = [];     // { t: number, bmp: ImageBitmap }
    let framesReady = false;
    let extracting  = false;  // suspend any other video manipulation while true
    let smoothedProg = 0;
    let targetProg   = 0;
    let active = false;
    let sourceLoaded = false;

    // Sizing — match canvas resolution to viewport, keep aspect
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(wrap.clientWidth  * dpr);
      const h = Math.round(wrap.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    /* ---- compute scroll progress ---- */
    const computeProg = () => {
      const sTop = startEl.getBoundingClientRect().top + window.scrollY;
      const eBox = endEl.getBoundingClientRect();
      const eBottom = eBox.top + window.scrollY + eBox.height * 0.7;
      const scrollMid = window.scrollY + window.innerHeight * 0.5;
      return clamp((scrollMid - sTop) / (eBottom - sTop), 0, 1);
    };

    /* ---- draw a given progress to the visible canvas, with frame
            blending: render frame N, then composite frame N+1 with
            alpha = sub-frame fraction. Gives sub-frame smoothness
            without needing more source frames. ---- */
    const drawAt = (prog) => {
      if (!framesReady || frames.length === 0) return;
      const cw = canvas.width, ch = canvas.height;

      const exact = prog * (frames.length - 1);
      const i0 = Math.floor(exact);
      const i1 = Math.min(i0 + 1, frames.length - 1);
      const t  = exact - i0;     // 0..1 between the two frames

      const drawBitmap = (bmp, alpha) => {
        const bw = bmp.width, bh = bmp.height;
        const scale = Math.max(cw / bw, ch / bh);
        const dw = bw * scale, dh = bh * scale;
        const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
        ctx.globalAlpha = alpha;
        ctx.drawImage(bmp, dx, dy, dw, dh);
      };

      const a = frames[i0]?.bmp;
      const b = frames[i1]?.bmp;
      if (a) drawBitmap(a, 1.0);
      if (b && i1 !== i0 && t > 0.001) drawBitmap(b, t);
      ctx.globalAlpha = 1.0;
    };

    /* ---- main render loop (smoothed) ---- */
    const tick = () => {
      targetProg = computeProg();
      // gentler lerp → glides between frames instead of jumping
      smoothedProg = lerp(smoothedProg, targetProg, 0.09);

      const wantActive = targetProg > 0 && targetProg < 1;
      if (wantActive && !active) { wrap.classList.add("is-active"); active = true; }
      else if (!wantActive && active) { wrap.classList.remove("is-active"); active = false; }

      if (framesReady && active) drawAt(smoothedProg);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    /* ---- pre-extraction fallback: while frames load,
            use the raw video element (visible by default).
            CRITICAL: suspends itself while extracting so it
            doesn't fight the extraction loop for currentTime. ---- */
    let videoFallbackRAF = null;
    const videoFallbackLoop = () => {
      if (framesReady || !sourceLoaded || extracting) {
        videoFallbackRAF = null;
        return;
      }
      const prog = computeProg();
      const t = prog * duration;
      if (Math.abs(video.currentTime - t) > 0.08) {
        try { video.currentTime = t; } catch (_) {}
      }
      videoFallbackRAF = requestAnimationFrame(videoFallbackLoop);
    };

    /* ---- attach video source LATE — avoid eager full download
            slowing first paint ---- */
    const attachSource = () => {
      const src = document.createElement("source");
      src.src = "assets/video/scroll.mp4?v=20260523g";
      src.type = "video/mp4";
      video.appendChild(src);
      video.load();
    };

    /* ---- frame extractor: prefers playback + rVFC for speed ---- */
    const extract = async () => {
      duration = video.duration;
      if (!duration || !isFinite(duration)) return;

      extracting = true;
      const targetCount = FRAME_TARGET;
      const step = duration / targetCount;

      try {
        // Strategy A — rVFC (Chromium, modern WebKit).
        if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
          try {
            await extractViaPlayback(targetCount);
            if (frames.length > 0) return;
          } catch (_) { /* fall through */ }
        }
        // Strategy B — seek-based fallback
        await extractViaSeek(targetCount, step);
      } finally {
        extracting = false;
        framesReady = frames.length > 0;
        if (framesReady) wrap.classList.add("canvas-ready");
      }
    };

    const extractViaPlayback = (targetCount) => new Promise((resolve, reject) => {
      const raw = [];   // all decoded frames {t, bmp}
      video.muted = true;
      video.playbackRate = 4.0;
      video.currentTime = 0;

      const onFrame = async (_now, meta) => {
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          const bmp = await createImageBitmap(off);
          raw.push({ t: meta.mediaTime, bmp });
        } catch (_) {}
        if (!video.ended && !video.paused) video.requestVideoFrameCallback(onFrame);
      };

      video.requestVideoFrameCallback(onFrame);

      video.addEventListener("ended", () => {
        video.playbackRate = 1.0;
        if (raw.length < 2) { reject(new Error("no frames")); return; }
        // resample raw frames to evenly spaced target buckets
        frames = new Array(targetCount);
        for (let i = 0; i < targetCount; i++) {
          const want = (i / (targetCount - 1)) * raw[raw.length - 1].t;
          // pick nearest
          let best = raw[0], bestD = Math.abs(raw[0].t - want);
          for (let j = 1; j < raw.length; j++) {
            const d = Math.abs(raw[j].t - want);
            if (d < bestD) { best = raw[j]; bestD = d; }
          }
          frames[i] = best;
        }
        // free the extras we didn't pick
        for (const r of raw) if (!frames.includes(r)) r.bmp.close?.();
        resolve();
      }, { once: true });

      video.play().catch(reject);
    });

    const extractViaSeek = async (targetCount, step) => {
      video.muted = true;
      for (let i = 0; i < targetCount; i++) {
        const t = i * step;
        await new Promise((res) => {
          const cb = () => { video.removeEventListener("seeked", cb); res(); };
          video.addEventListener("seeked", cb);
          try { video.currentTime = t; } catch (_) { res(); }
        });
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          const bmp = await createImageBitmap(off);
          frames.push({ t, bmp });
        } catch (_) {}
      }
    };

    /* ---- bootstrap ---- */
    const onMeta = () => {
      sourceLoaded = true;
      // Don't run the fallback during extraction (it would fight us
      // for `currentTime`). After extract finishes (or fails) we
      // either render from the canvas frames or kick the fallback.
      extract().finally(() => {
        if (!framesReady && !videoFallbackRAF) {
          videoFallbackRAF = requestAnimationFrame(videoFallbackLoop);
        }
      });
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });

    // Attach source after first paint to keep TTI clean
    if (document.readyState === "complete") attachSource();
    else window.addEventListener("load", attachSource, { once: true });
  })();
  }  // end of else (desktop scrub branch)

  /* =========================================================
     ENGINEERING — KINETIC TYPOGRAPHY + COLOR-PLAY
     3 phases pinned, scrub-driven crossfade between them.
     Color treatment layers on bg-scroll video shift with scroll.
     ========================================================= */
  (() => {
    const section = $(".engineering");
    if (!section) return;
    const phases = $$(".phase", section);
    if (!phases.length) return;

    // Split each word into character spans so we can stagger-animate them
    const splitChars = () => {
      $$(".word[data-text]", section).forEach((w) => {
        const text = w.dataset.text || w.textContent;
        w.innerHTML = "";
        [...text].forEach((c, i) => {
          const s = document.createElement("span");
          s.className = "char";
          s.textContent = c === " " ? " " : c;
          s.style.setProperty("--i", i);
          // Reset animation-delay so it picks up the per-char CSS variable
          s.style.animationDelay = "calc(var(--i) * 28ms)";
          w.appendChild(s);
        });
      });
    };
    splitChars();

    const seqMeter    = $("#seqMeter");
    const chromaMeter = $("#chromaMeter");
    const scrollMeter = $("#scrollMeter");
    const burn   = $(".treatment--burn",   section);
    const cool   = $(".treatment--cool",   section);
    const strobe = $(".treatment--strobe", section);

    // Drive everything through one progress value (0..1) across the section
    const setPhase = (idx) => {
      phases.forEach((p, i) => p.classList.toggle("is-active", i === idx));
      if (seqMeter) seqMeter.textContent = String(idx + 1).padStart(2, "0");
    };

    let currentPhase = -1;

    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const prog = clamp(-r.top / Math.max(1, total), 0, 1);

      // Phase derivation — 3 even buckets
      const idx = Math.min(2, Math.floor(prog * 3));
      if (idx !== currentPhase) {
        currentPhase = idx;
        setPhase(idx);
      }

      // Color-treatment crossfade tied to local progress
      // Phase 1 (0..0.33): BURN strong, COOL/STROBE off
      // Phase 2 (0.33..0.66): BURN fades, COOL on
      // Phase 3 (0.66..1.0): STROBE bursts, COOL stays
      const pp1 = clamp(1 - prog * 2.2,        0, 1);  // burn dominance
      const pp2 = clamp((prog - 0.25) * 2.4,   0, 1);  // cool slide
      const pp3 = clamp((prog - 0.6)  * 2.8,   0, 1);  // strobe + chroma

      if (burn)   burn.style.opacity   = (0.35 + pp1 * 0.55).toFixed(3);
      if (cool)   cool.style.opacity   = (pp2 * 0.85).toFixed(3);
      if (strobe) strobe.style.opacity = (pp3 * 0.6).toFixed(3);

      // Hue rotation on the bg-scroll video for a chromatic sweep
      const wrap = $("#bgScroll");
      if (wrap) {
        const hue = -10 + prog * 35;          // -10° at start → +25° at end
        const sat = 1.25 + pp3 * 0.6;
        wrap.style.filter = `hue-rotate(${hue.toFixed(2)}deg) saturate(${sat.toFixed(2)})`;
      }

      if (chromaMeter) chromaMeter.textContent = Math.round(80 + pp3 * 40);
      if (scrollMeter) scrollMeter.textContent = Math.round(prog * 100) + "%";
    };

    // Set initial phase
    setPhase(0);
    onScroll();

    // Use the unified scroll source — Lenis if present, else window
    if (window.lenisInstance) {
      window.lenisInstance.on("scroll", onScroll);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("resize", onScroll);
  })();

  /* ---- THREE.JS block removed in v3 ----
     The icosahedron + displacement shader was replaced with kinetic
     typography phases + video color-treatments (above). Three.js CDN
     tag was also removed from index.html.
     -------------------------------------------------------------- */
  /* =========================================================
     GSAP REVEAL ANIMATIONS
     ========================================================= */
  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero__video", {
      yPercent: 18, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__title", {
      yPercent: -20, opacity: 0.4, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: true },
    });

    gsap.from(".manifesto__text h2 span", {
      y: 80, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".manifesto", start: "top 70%" },
    });
    gsap.from(".services__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".services", start: "top 75%" },
    });
    // Engineering enter animation — fade up the kicker + lead
    gsap.from(".engineering__head", {
      y: 30, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: ".engineering", start: "top 70%" },
    });
    gsap.from(".process__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".process", start: "top 75%" },
    });
    gsap.from(".work__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".work", start: "top 75%" },
    });
    gsap.from(".contact__title", {
      y: 80, opacity: 0, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: ".contact", start: "top 70%" },
    });

    gsap.utils.toArray("[data-step]").forEach((step) => {
      gsap.fromTo(step,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: step, start: "top 80%" } }
      );
    });

    gsap.from(".footer__giant", {
      y: 200, ease: "power3.out", duration: 1.4,
      scrollTrigger: { trigger: ".footer", start: "top 80%" },
    });
  }

  /* =========================================================
     MOBILE NAV — burger toggle + overlay
     ========================================================= */
  (() => {
    const burger = $("#navBurger");
    const overlay = $("#mobileNav");
    if (!burger || !overlay) return;
    const links = $$("[data-mobile-link]", overlay);
    links.forEach((a, i) => a.style.setProperty("--i", i));

    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      overlay.classList.toggle("is-open", open);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("nav-open", open);
      if (lenis) open ? lenis.stop() : lenis.start();
    };

    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });

    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        setOpen(false);
        if (id && id.startsWith("#")) {
          e.preventDefault();
          // wait a tick so the overlay starts closing before we scroll
          setTimeout(() => {
            const el = document.querySelector(id);
            if (el) {
              if (lenis) lenis.scrollTo(el, { offset: -60, duration: 1.2 });
              else el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 80);
        }
      });
    });

    // close on resize past breakpoint
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
      }
    });
  })();
})();
