/* ============================================================
   CLARITY pitch deck engine — self-contained, no CDN.
   - 16:9 stage scaled to any viewport (pixel-stable)
   - presenter-stepped fragments + per-slide choreography
   - cinematic canvas particle hook
   - graceful fallback if GSAP is missing / reduced motion
   ============================================================ */
(function () {
  "use strict";

  var G = window.gsap || null;
  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var railFill = document.getElementById("rail-fill");
  var rail = document.getElementById("rail");
  var counter = document.getElementById("slide-counter");
  var hint = document.getElementById("hint");
  var help = document.getElementById("help");

  // ---- Live demo URL (editable). Points at local app by default; ----
  // ---- falls back to the hosted Replit demo from the README.     ----
  var LOCAL_DEMO = "http://localhost:3000";
  var HOSTED_DEMO = "https://ai-x-global.replit.app/";
  var demoLaunch = document.getElementById("demo-launch");
  if (demoLaunch) demoLaunch.setAttribute("href", LOCAL_DEMO);

  var current = 0;
  var frag = 0;              // fragments revealed on current slide
  var navLock = false;
  var pending = 0;           // queued nav direction while a transition runs

  function reduced() {
    return (
      document.body.classList.contains("reduced") ||
      (window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    );
  }

  /* ---------------- stage scaling ---------------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit);
  fit();

  /* ---------------- fragment helpers ---------------- */
  function fragsOf(el) {
    return Array.prototype.slice.call(el.querySelectorAll("[data-frag]"));
  }

  function showFrag(node) {
    if (!node) return;
    if (reduced() || !G) {
      node.style.opacity = 1;
      node.style.transform = "none";
      return;
    }
    G.fromTo(
      node,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" }
    );
  }
  function hideFrag(node) {
    if (!node) return;
    if (G && !reduced()) G.set(node, { autoAlpha: 0, y: 16 });
    else node.style.opacity = 0;
  }

  /* ---------------- per-slide controllers ----------------
     Each controller may define:
       stepCount(el)  -> number of presenter steps
       enter(el, dir) -> intro animation; also reset step visuals
       reveal(el, i)  -> reveal step i (0-based)
       unreveal(el,i) -> hide step i (for going back)
     Default = generic fragment reveal.
  ------------------------------------------------------------ */
  var ctrl = {};

  /* ---- default generic controller ---- */
  function genericStepCount(el) { return fragsOf(el).length; }
  function genericEnter(el, dir) {
    fragsOf(el).forEach(hideFrag);
  }
  function genericReveal(el, i) { showFrag(fragsOf(el)[i]); }
  function genericUnreveal(el, i) { hideFrag(fragsOf(el)[i]); }

  function get(el, key, fallback) {
    var c = ctrl[el.id];
    return c && c[key] ? c[key] : fallback;
  }

  /* ============================================================
     SLIDE 0 — COLD OPEN  (canvas particle hook)
     ============================================================ */
  var HookFX = (function () {
    var canvas = document.getElementById("hook-canvas");
    var ctx = canvas ? canvas.getContext("2d") : null;
    var parts = [];
    var W = 1280, H = 720, DPR = 1;
    var raf = null;
    var converge = 0;       // 0 = chaos, 1 = organised (eased)
    var convergeTarget = 0;
    var running = false;
    var words = ["warm AC", "insect", "great staff", "slow check-in",
      "Wi-Fi", "breakfast", "kerusi tak stabil", "noisy", "clean room",
      "friendly", "no hot water", "late checkout", "lovely view", "parking"];

    function size() {
      if (!canvas) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      // canvas fills the 1280x720 stage area
      W = canvas.clientWidth || 1280;
      H = canvas.clientHeight || 720;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function build() {
      parts = [];
      var N = 150;
      // target lattice: tidy grid centred, signifying "organised"
      var cols = 18, rows = 8, gx = 34, gy = 34;
      var ox = W / 2 - ((cols - 1) * gx) / 2;
      var oy = H / 2 - ((rows - 1) * gy) / 2;
      for (var i = 0; i < N; i++) {
        var gc = i % cols, gr = Math.floor(i / cols) % rows;
        parts.push({
          // chaotic position
          cx: Math.random() * W,
          cy: Math.random() * H,
          // organised target
          tx: ox + gc * gx + (Math.random() * 6 - 3),
          ty: oy + gr * gy + (Math.random() * 6 - 3),
          z: Math.random(),                 // depth 0..1
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          ph: Math.random() * Math.PI * 2,
          word: Math.random() < 0.16 ? words[(Math.random() * words.length) | 0] : null
        });
      }
    }

    function frameTick(t) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      // ease converge toward target
      converge += (convergeTarget - converge) * 0.045;
      var c = converge;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        // ambient drift in chaos
        p.cx += p.vx; p.cy += p.vy;
        if (p.cx < 0 || p.cx > W) p.vx *= -1;
        if (p.cy < 0 || p.cy > H) p.vy *= -1;
        var fl = Math.sin(t / 1400 + p.ph) * 4 * (1 - c);
        var x = p.cx + (p.tx - p.cx) * c;
        var y = p.cy + (p.ty - p.cy) * c + fl;
        var depth = 0.35 + p.z * 0.65;
        var alpha = (0.10 + p.z * 0.45) * (1 - c * 0.35);
        if (p.word) {
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = "#9fc0da";
          ctx.font = (10 + p.z * 3).toFixed(0) + "px ui-monospace, Menlo, monospace";
          ctx.fillText(p.word, x, y);
        } else {
          var r = 1 + depth * 1.8;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = c > 0.5 ? "#8fb9d9" : "#6f8595";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // connective lines once organised
        if (c > 0.55 && !p.word && i % 3 === 0 && i + 1 < parts.length) {
          var q = parts[i + 1];
          var qx = q.cx + (q.tx - q.cx) * c;
          var qy = q.cy + (q.ty - q.cy) * c;
          ctx.globalAlpha = (c - 0.55) * 0.14;
          ctx.strokeStyle = "#8fb9d9";
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(qx, qy); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frameTick);
    }

    return {
      start: function () {
        if (!ctx) return;
        size(); build();
        convergeTarget = 0; converge = 0;
        running = true;
        if (reduced()) { convergeTarget = 1; converge = 1; }
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frameTick);
      },
      organise: function () { convergeTarget = 1; },
      scatter: function () { convergeTarget = 0; },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      resize: function () { if (running) { size(); build(); } }
    };
  })();

  /* ============================================================
     SLIDE 0 — WebGL 3D HOOK (Three.js)
     Review-points drift out of focus in space, then converge
     and snap sharp into the Clarity logo: "coming into clarity".
     Falls back to the 2D canvas when WebGL is unavailable.
     ============================================================ */
  var ThreeHook = (function () {
    // Own dedicated canvas — sharing #hook-canvas would clash with the 2D
    // fallback's existing 2D context ("Canvas has an existing context").
    var canvas = null;
    function ensureCanvas() {
      if (canvas) return;
      canvas = document.createElement("canvas");
      canvas.id = "hook-gl";
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      var host = document.getElementById("s-hook");
      host.insertBefore(canvas, host.firstChild); // behind the copy/brand layers
    }
    var renderer, scene, camera, points, geo, mat, raf, t0;
    var N = 1300;
    var chaos, focus, depthF;
    var prog = { v: 0 }, running = false;

    function supported() {
      try {
        if (!window.THREE) return false;
        var c = document.createElement("canvas");
        return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
      } catch (e) { return false; }
    }

    function spriteTex() {
      var c = document.createElement("canvas"); c.width = c.height = 64;
      var g = c.getContext("2d");
      var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.25, "rgba(205,228,247,0.85)");
      grd.addColorStop(1, "rgba(150,185,217,0)");
      g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill();
      var tex = new THREE.Texture(c); tex.needsUpdate = true; return tex;
    }

    // sample points along the two Clarity mark paths (viewBox 0..64)
    function sampleLogo(n) {
      var src = document.querySelectorAll("#clarity-mark path");
      var pts = [];
      if (!src.length) return pts;
      var svgns = "http://www.w3.org/2000/svg";
      var tmp = document.createElementNS(svgns, "svg");
      tmp.setAttribute("viewBox", "0 0 64 64");
      tmp.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none";
      var paths = [], lens = [], total = 0;
      for (var i = 0; i < src.length; i++) {
        var p = document.createElementNS(svgns, "path");
        p.setAttribute("d", src[i].getAttribute("d"));
        tmp.appendChild(p); paths.push(p);
      }
      document.body.appendChild(tmp);
      for (i = 0; i < paths.length; i++) { var L = paths[i].getTotalLength(); lens.push(L); total += L; }
      for (var pi = 0; pi < paths.length; pi++) {
        var cnt = Math.max(1, Math.round(n * lens[pi] / total));
        for (var k = 0; k < cnt; k++) {
          try { pts.push(paths[pi].getPointAtLength(lens[pi] * (k / cnt))); } catch (e) {}
        }
      }
      document.body.removeChild(tmp);
      return pts;
    }

    function build() {
      scene = new THREE.Scene();
      var w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720;
      camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 140);
      camera.position.set(0, 0, 15);

      chaos = new Float32Array(N * 3);
      focus = new Float32Array(N * 3);
      depthF = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        // chaos: scattered through a deep volume (points near camera read as blur)
        chaos[i * 3]     = (Math.random() * 2 - 1) * 17;
        chaos[i * 3 + 1] = (Math.random() * 2 - 1) * 11;
        chaos[i * 3 + 2] = (Math.random() * 2 - 1) * 17 - 3;
        // focus: a luminous aperture that frames the message — "into focus"
        var band = Math.random(), a = Math.random() * Math.PI * 2;
        if (band < 0.60) {                        // crisp main ring (the lens)
          var rr = 5.35 + (Math.random() * 0.5 - 0.25);
          focus[i * 3]     = Math.cos(a) * rr;
          focus[i * 3 + 1] = Math.sin(a) * rr * 0.58;
          focus[i * 3 + 2] = (Math.random() * 0.6 - 0.3);
        } else if (band < 0.82) {                 // soft outer halo
          var ro = 6.7 + Math.random() * 1.6;
          focus[i * 3]     = Math.cos(a) * ro;
          focus[i * 3 + 1] = Math.sin(a) * ro * 0.58;
          focus[i * 3 + 2] = -1 - Math.random() * 2.6;
        } else {                                  // sparse inner dust
          var ri = Math.random() * 4.3;
          focus[i * 3]     = Math.cos(a) * ri;
          focus[i * 3 + 1] = Math.sin(a) * ri * 0.5;
          focus[i * 3 + 2] = -0.5 - Math.random() * 2.2;
        }
        depthF[i] = 0.5 + Math.random() * 0.5;
      }
      geo = new THREE.BufferGeometry();
      var pos = new Float32Array(N * 3); pos.set(chaos);
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      mat = new THREE.PointsMaterial({
        size: 0.62, map: spriteTex(), transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
        vertexColors: true, sizeAttenuation: true
      });
      points = new THREE.Points(geo, mat);
      scene.add(points);
    }

    function frame() {
      var t = (performance.now() - t0) / 1000;
      var e = prog.v;
      var pos = geo.attributes.position.array, col = geo.attributes.color.array;
      var dR = 0.42, dG = 0.52, dB = 0.60, bR = 0.82, bG = 0.92, bB = 1.0;
      for (var i = 0; i < N; i++) {
        var k = i * 3;
        var nx = Math.sin(t * 0.5 + i) * 0.28 * (1 - e);
        var ny = Math.cos(t * 0.4 + i * 1.3) * 0.28 * (1 - e);
        pos[k]     = chaos[k]     + (focus[k]     - chaos[k])     * e + nx;
        pos[k + 1] = chaos[k + 1] + (focus[k + 1] - chaos[k + 1]) * e + ny;
        pos[k + 2] = chaos[k + 2] + (focus[k + 2] - chaos[k + 2]) * e;
        var b = depthF[i];
        col[k]     = (dR + (bR - dR) * e) * b;
        col[k + 1] = (dG + (bG - dG) * e) * b;
        col[k + 2] = (dB + (bB - dB) * e) * b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      mat.size = 0.62 - 0.50 * e;                 // big/blurry -> small/sharp
      if (mat.opacity < 0.95) mat.opacity += 0.02;
      camera.position.x = Math.sin(t * 0.15) * 1.3 * (1 - e);
      camera.position.y = Math.cos(t * 0.11) * 0.9 * (1 - e);
      camera.position.z = 15 - 3.2 * e - Math.sin(t * 0.12) * 0.6 * (1 - e);
      points.rotation.z = (1 - e) * 0.05 * Math.sin(t * 0.2);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function size() {
      if (!renderer) return;
      var w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    }

    return {
      supported: supported,
      start: function () {
        ensureCanvas();
        if (!renderer) {
          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
          renderer.setClearColor(0x000000, 0);
        }
        build(); size();
        prog.v = 0; mat.opacity = 0; t0 = performance.now();
        running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      },
      organise: function () {
        if (G && !reduced()) { G.killTweensOf(prog); G.to(prog, { v: 1, duration: 2.0, ease: "power2.inOut" }); }
        else prog.v = 1;
      },
      scatter: function () {
        if (G && !reduced()) { G.killTweensOf(prog); G.to(prog, { v: 0, duration: 1.0, ease: "power2.inOut" }); }
        else prog.v = 0;
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      resize: function () { if (running) size(); }
    };
  })();

  /* Unified hook controller: real 3D when possible, else 2D canvas. */
  var Hook = (function () {
    var fx = null;
    function choose() { return (!reduced() && ThreeHook.supported()) ? ThreeHook : HookFX; }
    return {
      start: function () { fx = choose(); fx.start(); },
      organise: function () { if (fx) fx.organise(); },
      scatter: function () { if (fx) fx.scatter(); },
      stop: function () { if (fx) fx.stop(); },
      resize: function () { if (fx) fx.resize(); }
    };
  })();
  window.addEventListener("resize", function () { Hook.resize(); });

  /* split a plain-text element into animatable word spans (once) */
  function splitWords(el) {
    if (!el || el.getAttribute("data-split")) return;
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) {
      return '<span class="w" style="display:inline-block;will-change:transform">' + w + "</span>";
    }).join(" ");
    el.setAttribute("data-split", "1");
  }

  ctrl["s-hook"] = {
    stepCount: function () { return 3; },
    enter: function (el, dir) {
      var l1 = el.querySelector(".hook-line.one");
      var l2 = el.querySelector(".hook-line.two");
      var br = document.getElementById("hook-brand");
      splitWords(l1); splitWords(l2);
      if (G && !reduced()) {
        G.set([l1, l2], { autoAlpha: 1 });
        G.set(el.querySelectorAll(".hook-line .w"), { autoAlpha: 0, yPercent: 110, rotationX: -60 });
        G.set(br, { autoAlpha: 0, y: 24 });
      } else {
        [l1, l2, br].forEach(function (n) { n.style.opacity = 0; });
      }
      Hook.start();
    },
    reveal: function (el, i) {
      var lines = [el.querySelector(".hook-line.one"), el.querySelector(".hook-line.two")];
      var br = document.getElementById("hook-brand");
      if (i === 0) Hook.organise();
      if (i === 0 || i === 1) {
        var line = lines[i];
        if (G && !reduced()) {
          G.set(line, { autoAlpha: 1 });
          G.to(line.querySelectorAll(".w"), {
            autoAlpha: 1, yPercent: 0, rotationX: 0, transformPerspective: 500,
            duration: 0.72, ease: "power3.out", stagger: 0.055
          });
        } else { line.style.opacity = 1; }
      }
      if (i === 2) {
        if (G && !reduced()) G.to(br, { autoAlpha: 1, y: 0, duration: 0.85, ease: "power2.out" });
        else br.style.opacity = 1;
      }
    },
    unreveal: function (el, i) {
      var lines = [el.querySelector(".hook-line.one"), el.querySelector(".hook-line.two")];
      var br = document.getElementById("hook-brand");
      if (i === 0) Hook.scatter();
      if (i === 0 || i === 1) {
        if (G) G.set(lines[i].querySelectorAll(".w"), { autoAlpha: 0, yPercent: 110, rotationX: -60 });
        else lines[i].style.opacity = 0;
      }
      if (i === 2) { if (G) G.set(br, { autoAlpha: 0, y: 24 }); else br.style.opacity = 0; }
    },
    leave: function () { Hook.stop(); }
  };

  /* ============================================================
     SLIDE 3 — ONE REVIEW, TWO TRUTHS
     reveal 0: light up the review quotes; reveals 1..3: obs cards
     ============================================================ */
  ctrl["s-split"] = {
    stepCount: function (el) { return fragsOf(el).length + 1; }, // +1 for the highlight step
    enter: function (el) {
      el.querySelector("#split-review").classList.remove("lit");
      fragsOf(el).forEach(hideFrag);
    },
    reveal: function (el, i) {
      if (i === 0) { el.querySelector("#split-review").classList.add("lit"); return; }
      var card = fragsOf(el)[i - 1];
      if (card && G && !reduced()) {
        G.fromTo(card, { autoAlpha: 0, x: 34 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" });
      } else if (card) { card.style.opacity = 1; card.style.transform = "none"; }
    },
    unreveal: function (el, i) {
      if (i === 0) { el.querySelector("#split-review").classList.remove("lit"); return; }
      hideFrag(fragsOf(el)[i - 1]);
    }
  };

  /* ============================================================
     SLIDE 5 — THE SYSTEM (animated pipeline)
     Steps walk the 6 nodes; progress line + human band grow.
     ============================================================ */
  ctrl["s-system"] = {
    stepCount: function () { return 6; },
    enter: function (el) {
      fragsOf(el).forEach(hideFrag);
      el.querySelector("#pipe-progress").style.width = "0%";
      var band = el.querySelector("#human-band");
      if (G) G.set(band, { autoAlpha: 0 }); else band.style.opacity = 0;
    },
    reveal: function (el, i) {
      var stages = fragsOf(el);
      var node = stages[i];
      if (node) {
        if (G && !reduced())
          G.fromTo(node, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" });
        else { node.style.opacity = 1; node.style.transform = "none"; }
      }
      // progress line to this node's x
      var pct = [9, 26, 43, 60, 77, 95][i];
      var pg = el.querySelector("#pipe-progress");
      if (G && !reduced()) G.to(pg, { width: pct + "%", duration: 0.55, ease: "power2.inOut" });
      else pg.style.width = pct + "%";
      // human band appears around the first human-gated node (index 3)
      if (i === 3) {
        var band = el.querySelector("#human-band");
        band.style.left = "53%"; band.style.right = "2%";
        if (G && !reduced()) G.to(band, { autoAlpha: 1, duration: 0.5 });
        else band.style.opacity = 1;
      }
    },
    unreveal: function (el, i) {
      hideFrag(fragsOf(el)[i]);
      var prevPct = i === 0 ? 0 : [9, 26, 43, 60, 77, 95][i - 1];
      el.querySelector("#pipe-progress").style.width = prevPct + "%";
      if (i === 3) { var b = el.querySelector("#human-band"); if (G) G.set(b, { autoAlpha: 0 }); else b.style.opacity = 0; }
    }
  };

  /* ============================================================
     SLIDE 8 — ECOSYSTEM: draw connector lines, reveal spokes
     ============================================================ */
  ctrl["s-eco"] = {
    stepCount: function (el) { return fragsOf(el).length; },
    enter: function (el) {
      fragsOf(el).forEach(hideFrag);
      drawEcoLines();
    },
    reveal: genericReveal,
    unreveal: genericUnreveal
  };
  function drawEcoLines() {
    var svg = document.getElementById("eco-svg");
    if (!svg) return;
    svg.innerHTML = "";
    var box = document.getElementById("eco-diagram").getBoundingClientRect();
    // center of hub ~ (50%,50%); spokes at corners
    var cx = box.width / 2, cy = box.height / 2;
    var corners = [[64, box.height * 0.08 + 24], [box.width - 64, box.height * 0.08 + 24],
    [64, box.height * 0.92 - 24], [box.width - 64, box.height * 0.92 - 24]];
    corners.forEach(function (pt) {
      var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("x1", cx); ln.setAttribute("y1", cy);
      ln.setAttribute("x2", pt[0]); ln.setAttribute("y2", pt[1]);
      ln.setAttribute("class", "eco-line");
      svg.appendChild(ln);
    });
  }

  /* ============================================================
     SLIDE 2 — PROBLEM: position source chips, count-up, reveal
     ============================================================ */
  ctrl["s-problem"] = {
    stepCount: function (el) { return fragsOf(el).length; },
    enter: function (el) {
      // place chips by data-x/data-y within funnel, then drift them in (ambient, not stepped)
      var chips = Array.prototype.slice.call(el.querySelectorAll(".src-chip"));
      chips.forEach(function (chip) {
        chip.style.left = chip.getAttribute("data-x") + "px";
        chip.style.top = chip.getAttribute("data-y") + "px";
      });
      if (G && !reduced()) {
        G.fromTo(chips, { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.2 });
      } else {
        chips.forEach(function (c) { c.style.opacity = 1; });
      }
      fragsOf(el).forEach(hideFrag);
      countUp(el.querySelector("#funnel-count"), 244, 900);
    },
    reveal: genericReveal,
    unreveal: genericUnreveal
  };
  function countUp(node, to, ms) {
    if (!node) return;
    if (reduced() || !G) { node.textContent = to; return; }
    var obj = { v: 0 };
    G.to(obj, { v: to, duration: ms / 1000, ease: "power2.out",
      onUpdate: function () { node.textContent = Math.round(obj.v); } });
  }

  /* ============================================================
     NAVIGATION ENGINE
     ============================================================ */
  function slideIntro(el, dir) {
    // generic cinematic intro for the always-on content of a slide
    if (reduced() || !G) return;
    var bits = Array.prototype.slice.call(el.querySelectorAll(
      ".eyebrow, .display, .lede, .title-mid, .pipe-head, .ba, .demo-left, .demo-steps, .method, .review-card, .close-line, .solution-grid > div:first-child"));
    if (!bits.length) return;
    G.fromTo(bits,
      { autoAlpha: 0, y: dir >= 0 ? 22 : -22 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "power3.out", overwrite: "auto" });
  }

  function goTo(i, dir) {
    if (i < 0 || i >= slides.length) return;
    var prev = slides[current];
    var leave = get(prev, "leave", null);
    if (leave) leave(prev);

    slides.forEach(function (s) { s.classList.remove("is-active", "is-entering"); });
    current = i;
    var el = slides[i];
    el.classList.add("is-active");
    el.style.display = "block";   // clear any inline display:none set on hide
    // force reflow then fade in
    void el.offsetWidth;
    el.style.opacity = 1;
    el.classList.add("is-entering");

    var enter = get(el, "enter", genericEnter);
    enter(el, dir);
    if (G && !reduced() && el.id !== "s-hook") {
      G.fromTo(el,
        { z: dir >= 0 ? 340 : -300, rotationY: dir >= 0 ? 7 : -7, autoAlpha: 0 },
        { z: 0, rotationY: 0, autoAlpha: 1, duration: 0.62, ease: "power3.out", clearProps: "transform" });
    }
    slideIntro(el, dir);

    // if entering backwards, show all fragments already consumed
    var count = get(el, "stepCount", genericStepCount)(el);
    if (dir < 0) {
      frag = count;
      var rev = get(el, "reveal", genericReveal);
      // reveal instantly (no anim) when arriving from the right
      var wasReduced = document.body.classList.contains("reduced");
      document.body.classList.add("reduced");
      for (var k = 0; k < count; k++) rev(el, k);
      if (!wasReduced) document.body.classList.remove("reduced");
    } else {
      frag = 0;
    }
    updateChrome();
  }

  function next() {
    if (navLock) { pending = 1; return; }
    var el = slides[current];
    var count = get(el, "stepCount", genericStepCount)(el);
    if (frag < count) {
      get(el, "reveal", genericReveal)(el, frag);
      frag++;
      updateChrome();
    } else if (current < slides.length - 1) {
      transition(1);
    }
  }
  function prev() {
    if (navLock) { pending = -1; return; }
    var el = slides[current];
    if (frag > 0) {
      frag--;
      get(el, "unreveal", genericUnreveal)(el, frag);
      updateChrome();
    } else if (current > 0) {
      transition(-1);
    }
  }
  function transition(dir) {
    navLock = true;
    var el = slides[current];
    var done = function () {
      el.style.display = "none";
      goTo(current + dir, dir);
      navLock = false;
      if (pending) { var d = pending; pending = 0; (d > 0 ? next : prev)(); }
    };
    if (G && !reduced()) {
      G.to(el, { z: dir >= 0 ? -300 : 340, rotationY: dir >= 0 ? -6 : 6, autoAlpha: 0,
        duration: 0.38, ease: "power2.in", onComplete: done });
    } else {
      done();
    }
  }

  function replay() {
    var el = slides[current];
    get(el, "enter", genericEnter)(el, 1);
    slideIntro(el, 1);
    frag = 0;
    updateChrome();
  }

  function updateChrome() {
    var n = slides.length;
    var pad = function (x) { return (x < 10 ? "0" : "") + x; };
    counter.textContent = pad(current + 1) + " / " + pad(n);
    // progress reflects slide + fragment fraction
    var count = get(slides[current], "stepCount", genericStepCount)(slides[current]);
    var sub = count ? frag / count : 0;
    var pct = ((current + sub) / (n - 1)) * 100;
    railFill.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  /* ---------------- live demo ---------------- */
  var demoWin = null;
  function launchDemo() {
    try {
      demoWin = window.open(demoLaunch ? demoLaunch.getAttribute("href") : LOCAL_DEMO, "clarity-demo");
    } catch (e) { /* popup blocked; the visible link still works */ }
  }

  /* ---------------- keyboard ---------------- */
  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (help.classList.contains("open") && k !== "?" && k !== "Escape") return;
    switch (k) {
      case "ArrowRight": case " ": case "PageDown": case "ArrowDown":
        e.preventDefault(); next(); dismissHint(); break;
      case "ArrowLeft": case "PageUp": case "ArrowUp":
        e.preventDefault(); prev(); break;
      case "Home": e.preventDefault(); goHard(0); break;
      case "End": e.preventDefault(); goHard(slides.length - 1); break;
      case "r": case "R": replay(); break;
      case "d": case "D": launchDemo(); break;
      case "p": case "P":
        rail.classList.toggle("hidden"); counter.classList.toggle("hidden"); break;
      case "m": case "M":
        document.body.classList.toggle("reduced"); break;
      case "o": case "O": toggleOverview(); break;
      case "?": help.classList.toggle("open"); break;
      case "Escape":
        if (help.classList.contains("open")) help.classList.remove("open");
        else if (overviewOpen) toggleOverview();
        break;
    }
  });
  function goHard(i) {
    slides.forEach(function (s) { s.style.display = "none"; s.classList.remove("is-active"); });
    var leave = get(slides[current], "leave", null); if (leave) leave(slides[current]);
    goTo(i, i >= current ? 1 : -1);
  }
  function dismissHint() { if (hint) hint.classList.add("gone"); }

  /* ---------------- click / tap to advance ---------------- */
  stage.addEventListener("click", function (e) {
    if (e.target.closest("a, button")) return;
    next(); dismissHint();
  });

  /* ---------------- minimal overview (press O) ---------------- */
  var overviewOpen = false;
  function toggleOverview() {
    overviewOpen = !overviewOpen;
    var ov = document.getElementById("overview");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "overview";
      ov.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(6,11,15,.92);backdrop-filter:blur(6px);display:grid;place-items:center;";
      var list = document.createElement("div");
      list.style.cssText = "width:560px;max-height:80vh;overflow:auto";
      slides.forEach(function (s, idx) {
        var row = document.createElement("button");
        row.textContent = (idx + 1 < 10 ? "0" : "") + (idx + 1) + "   " + (s.getAttribute("data-name") || s.id);
        row.style.cssText = "display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid rgba(197,219,233,.08);color:#a9bccb;font:500 15px/1 var(--font-ui,sans-serif);letter-spacing:.04em;padding:16px 10px;cursor:pointer;font-family:inherit;";
        row.onmouseenter = function () { row.style.color = "#eaf2f8"; };
        row.onmouseleave = function () { row.style.color = "#a9bccb"; };
        row.onclick = function () { toggleOverview(); goHard(idx); };
        list.appendChild(row);
      });
      ov.appendChild(list);
      document.body.appendChild(ov);
    }
    ov.style.display = overviewOpen ? "grid" : "none";
  }

  /* ---------------- boot ---------------- */
  slides.forEach(function (s) { s.style.display = "none"; });
  goTo(0, 1);
  // auto-dismiss hint
  setTimeout(dismissHint, 6000);

  // expose for debugging / automated capture
  window.__deck = {
    goTo: goHard, next: next, prev: prev,
    state: function () {
      return { index: current, frag: frag,
        count: get(slides[current], "stepCount", genericStepCount)(slides[current]),
        total: slides.length };
    }
  };
})();
