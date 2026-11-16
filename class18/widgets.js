/* Opti, class 18: interactive widgets (gradient descent) */
(function () {
  "use strict";
  var P = window.Plot;

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function body(w) { return w.querySelector(".widget-body"); }
  function seg(options, current) {
    return '<div class="seg">' + options.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '"' + (o[0] === current ? ' class="on"' : "") + ">" + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function bindSeg(root, onPick) {
    root.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on"); onPick(b.getAttribute("data-v"));
      });
    });
  }

  /* =========================================================
     1. Stationary points in one dimension
     ========================================================= */
  function stationary1d(w) {
    var FNS = {
      sq: { f: function (x) { return x * x; }, tex: "x^2", d1: "0", d2: "2 > 0", cls: "good",
        v: "Local (and global) minimum. The second-order sufficient condition holds: f′(0) = 0 and f″(0) > 0." },
      nsq: { f: function (x) { return -x * x; }, tex: "-x^2", d1: "0", d2: "-2 < 0", cls: "bad",
        v: "Local maximum. f″(0) < 0 violates the second-order necessary condition, so 0 cannot be a local minimum." },
      cube: { f: function (x) { return x * x * x; }, tex: "x^3", d1: "0", d2: "0", cls: "warn",
        v: "Neither a minimum nor a maximum. f′(0) = 0 and f″(0) = 0 ≥ 0, so both necessary conditions hold, yet f(−ε) < f(0). Necessary is not sufficient." },
      quart: { f: function (x) { return x * x * x * x; }, tex: "x^4", d1: "0", d2: "0", cls: "good",
        v: "Global minimum, even though f″(0) = 0. The sufficient condition fails, but the point is still a minimum. Sufficient is not necessary." },
      nquart: { f: function (x) { return -x * x * x * x; }, tex: "-x^4", d1: "0", d2: "0", cls: "bad",
        v: "Local maximum, although f″(0) = 0 looks just like the x⁴ case. Second-order information at the point alone cannot tell x⁴ and −x⁴ apart." }
    };
    var cur = "sq";
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Plot of the selected function around zero"></canvas>' +
      '<div class="controls">' + seg([["sq", "x²"], ["nsq", "−x²"], ["cube", "x³"], ["quart", "x⁴"], ["nquart", "−x⁴"]], cur) + "</div>" +
      '<div class="stats"><div><b>f′(0)</b><span class="d1"></span></div><div><b>f″(0)</b><span class="d2"></span></div></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas");
    bindSeg(b.querySelector(".seg"), function (v) { cur = v; draw(); });
    function draw() {
      var s = P.setup(canvas, 0.45), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -1.6, 1.6, -1.5, 1.5, 10);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 0.5, gy: 0.5 });
      var F = FNS[cur];
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = pal.gold; ctx.lineWidth = 1.5;
      P.line(ctx, v.px(-0.9), v.py(0), v.px(0.9), v.py(0)); ctx.restore();
      P.curve(ctx, v, F.f, pal.accent, 2.6);
      P.dot(ctx, v.px(0), v.py(0), 6, pal.gold, pal.bg);
      P.text(ctx, "f(x) = " + F.tex.replace("^2", "²").replace("^3", "³").replace("^4", "⁴"), 14, 18, pal.ink2, 13);
      P.text(ctx, "tangent at 0 is flat", v.px(0.95), v.py(0) - 12, pal.gold, 12);
      b.querySelector(".d1").textContent = F.d1;
      b.querySelector(".d2").textContent = F.d2;
      var vd = b.querySelector(".verdict"); vd.className = "verdict " + F.cls; vd.textContent = F.v;
    }
    P.responsive(canvas, draw);
  }

  /* =========================================================
     2. Hessian classifier in two dimensions
     ========================================================= */
  function hessian2d(w) {
    var b = body(w);
    b.innerHTML =
      '<div class="two-col"><div><canvas aria-label="Level sets of the quadratic form"></canvas></div>' +
      '<div><h4 style="margin-top:0">Hessian at the stationary point</h4>' +
      '<div class="matrix-in"><input class="ha" type="number" step="0.5" value="1" aria-label="H11">' +
      '<input class="hb" type="number" step="0.5" value="1" aria-label="H12">' +
      '<input class="hb2" type="number" value="1" readonly tabindex="-1" aria-label="H21 (equals H12)">' +
      '<input class="hc" type="number" step="0.5" value="4" aria-label="H22"></div>' +
      '<p class="muted" style="font-family:var(--sans);font-size:13px;margin:8px 0 6px">Presets from the lecture</p>' +
      '<div class="seg presets">' +
      '<button type="button" data-p="1,1,4">f at (4, 0)</button><button type="button" data-p="1,1,-2">f at (3, 1)</button>' +
      '<button type="button" data-p="0,0,2">x₁³ + x₂² at 0</button><button type="button" data-p="-2,0,-1">max</button></div>' +
      '<div class="stats"><div><b>λ₁</b><span class="l1"></span></div><div><b>λ₂</b><span class="l2"></span></div>' +
      '<div><b>det</b><span class="det"></span></div><div><b>trace</b><span class="tr"></span></div></div></div></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas");
    var ia = b.querySelector(".ha"), ib = b.querySelector(".hb"), ib2 = b.querySelector(".hb2"), ic = b.querySelector(".hc");
    [ia, ib, ic].forEach(function (i) { i.addEventListener("input", function () { draw(true); }); });
    b.querySelectorAll(".presets button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = btn.getAttribute("data-p").split(",");
        ia.value = p[0]; ib.value = p[1]; ic.value = p[2]; draw(true);
      });
    });
    function draw() {
      var a = parseFloat(ia.value) || 0, bb = parseFloat(ib.value) || 0, c = parseFloat(ic.value) || 0;
      ib2.value = bb;
      var tr = a + c, det = a * c - bb * bb, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      var s = P.setup(canvas, 1), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -2, 2, -2, 2, 0);
      var q = function (x, y) { return 0.5 * (a * x * x + 2 * bb * x * y + c * y * y); };
      var scale = Math.max(Math.abs(l1), Math.abs(l2), 0.2) * 2;
      var lv = [];
      [-1, -0.6, -0.35, -0.18, -0.07, -0.015, 0.015, 0.07, 0.18, 0.35, 0.6, 1].forEach(function (t) { lv.push(t * scale); });
      var layer = P.contourLayer(s.w, s.h, s.dpr, v, q, pal, { levelsList: lv, nx: 120 });
      ctx.drawImage(layer, 0, 0, s.w, s.h);
      P.axes(ctx, v, pal, { grid: false });
      // eigenvectors
      var vecs = [];
      [l1, l2].forEach(function (l) {
        var ex, ey;
        if (Math.abs(bb) > 1e-12) { ex = bb; ey = l - a; } else { if (Math.abs(l - a) < 1e-12) { ex = 1; ey = 0; } else { ex = 0; ey = 1; } }
        var n = Math.hypot(ex, ey); vecs.push([ex / n, ey / n, l]);
      });
      if (Math.abs(l1 - l2) < 1e-9) vecs = [[1, 0, l1], [0, 1, l2]];
      vecs.forEach(function (e, i) {
        var col = e[2] > 1e-9 ? pal.accent : e[2] < -1e-9 ? pal.red : pal.gold;
        ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        P.line(ctx, v.px(-1.9 * e[0]), v.py(-1.9 * e[1]), v.px(1.9 * e[0]), v.py(1.9 * e[1])); ctx.restore();
        var lx = Math.max(8, Math.min(s.w - 70, v.px(1.45 * e[0]) + 6)), ly = Math.max(12, Math.min(s.h - 12, v.py(1.45 * e[1]) - 10));
        P.text(ctx, "λ" + (i ? "₂" : "₁") + " = " + P.fmt(e[2], 2), lx, ly, col, 12);
      });
      P.dot(ctx, v.px(0), v.py(0), 5, pal.gold, pal.bg);
      b.querySelector(".l1").textContent = P.fmt(l1, 3);
      b.querySelector(".l2").textContent = P.fmt(l2, 3);
      b.querySelector(".det").textContent = P.fmt(det, 3);
      b.querySelector(".tr").textContent = P.fmt(tr, 3);
      var vd = b.querySelector(".verdict"), eps = 1e-9, msg, cls;
      if (l2 > eps) { cls = "good"; msg = "Positive definite (both eigenvalues > 0). The sufficient condition holds: a strict local minimum. Level sets are ellipses around the point."; }
      else if (l1 < -eps) { cls = "bad"; msg = "Negative definite (both eigenvalues < 0). A strict local maximum, so not a local minimum."; }
      else if (l1 > eps && l2 < -eps) { cls = "bad"; msg = "Indefinite (one positive, one negative eigenvalue). A saddle point: f goes up along the teal direction and down along the red one. Not a local minimum."; }
      else if (l2 >= -eps && l1 >= -eps) { cls = "warn"; msg = "Positive semidefinite but singular (an eigenvalue equals 0). The necessary condition holds, but second-order information is inconclusive. Example: x₁³ + x₂² at 0 is not a minimum."; }
      else { cls = "bad"; msg = "Negative semidefinite. The point cannot be a strict local minimum, and is a minimum only in degenerate cases."; }
      vd.className = "verdict " + cls; vd.textContent = msg;
    }
    P.responsive(canvas, draw);
  }

  /* =========================================================
     3. Gradient descent in one dimension, step by step
     ========================================================= */
  function gd1d(w) {
    var f = function (x) { return 0.25 * Math.pow(x, 4) - x * x + 0.4 * x; };
    var df = function (x) { return x * x * x - 2 * x + 0.4; };
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Gradient descent on a one-dimensional function"></canvas>' +
      '<div class="controls">' +
      '<label>Start x₀ <input type="range" class="x0" min="-2.2" max="2.2" step="0.05" value="1.9"><output class="x0o"></output></label>' +
      '<label>Step size α <input type="range" class="al" min="0.02" max="0.9" step="0.01" value="0.1"><output class="alo"></output></label>' +
      '<button type="button" class="btn step">Take one step</button><button type="button" class="btn ghost run">Run 25 steps</button><button type="button" class="btn ghost reset">Reset</button></div>' +
      '<div class="stats"><div><b>k</b><span class="k"></span></div><div><b>xₖ</b><span class="xk"></span></div><div><b>f′(xₖ)</b><span class="gk"></span></div><div><b>f(xₖ)</b><span class="fk"></span></div></div>' +
      '<div class="verdict stepper-text"></div>';
    var canvas = b.querySelector("canvas");
    var x0 = b.querySelector(".x0"), al = b.querySelector(".al");
    var path = [], timer = null;
    function reset() { stop(); path = [parseFloat(x0.value)]; draw(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function step() {
      var x = path[path.length - 1];
      if (!isFinite(x) || Math.abs(x) > 50) return false;
      path.push(x - parseFloat(al.value) * df(x)); draw(); return true;
    }
    x0.addEventListener("input", reset);
    al.addEventListener("input", reset);
    b.querySelector(".step").addEventListener("click", function () { stop(); step(); });
    b.querySelector(".reset").addEventListener("click", reset);
    b.querySelector(".run").addEventListener("click", function () {
      stop(); var n = 0;
      timer = setInterval(function () { if (!step() || ++n >= 25) stop(); }, 140);
    });
    function draw() {
      b.querySelector(".x0o").textContent = parseFloat(x0.value).toFixed(2);
      b.querySelector(".alo").textContent = parseFloat(al.value).toFixed(2);
      var s = P.setup(canvas, 0.5), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -2.6, 2.6, -2.2, 3.4, 12);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 0.5, gy: 1 });
      P.curve(ctx, v, f, pal.accent, 2.6);
      // trail
      for (var i = 0; i < path.length - 1; i++) {
        var xa = path[i], xb = path[i + 1];
        if (!isFinite(xb) || Math.abs(xb) > 2.6) break;
        ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * (i + 1) / path.length;
        P.arrow(ctx, v.px(xa), v.py(f(xa)), v.px(xb), v.py(f(xb)), pal.gold, 1.6); ctx.restore();
      }
      path.forEach(function (x, i) {
        if (isFinite(x) && Math.abs(x) <= 2.6) P.dot(ctx, v.px(x), v.py(f(x)), i === path.length - 1 ? 6 : 3.5, i === path.length - 1 ? pal.gold : pal.ink3, i === path.length - 1 ? pal.bg : null);
      });
      var x = path[path.length - 1], g = df(x), k = path.length - 1;
      var out = !isFinite(x) || Math.abs(x) > 2.6;
      if (!out) {
        // tangent line
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1.2;
        P.line(ctx, v.px(x - 0.7), v.py(f(x) - 0.7 * g), v.px(x + 0.7), v.py(f(x) + 0.7 * g)); ctx.restore();
        // proposed move on the x axis
        var nx = x - parseFloat(al.value) * g, yAxis = v.py(-1.9);
        P.dot(ctx, v.px(x), yAxis, 3, pal.ink2);
        if (Math.abs(nx - x) > 1e-3) P.arrow(ctx, v.px(x), yAxis, v.px(Math.max(-2.6, Math.min(2.6, nx))), yAxis, pal.red, 2);
        P.text(ctx, "next move: −α f′(xₖ)", 14, yAxis - 14, pal.red, 12);
      }
      b.querySelector(".k").textContent = k;
      b.querySelector(".xk").textContent = P.fmt(x, 4);
      b.querySelector(".gk").textContent = P.fmt(g, 4);
      b.querySelector(".fk").textContent = P.fmt(f(x), 4);
      var vd = b.querySelector(".verdict");
      if (out) { vd.className = "verdict bad stepper-text"; vd.textContent = "The iterates left the plot. The step size is too large for this curvature: each step overshoots by more than it corrects, so the method diverges."; return; }
      var dir = g > 0 ? "left" : "right";
      var near = Math.abs(g) < 1e-3;
      if (near) {
        var glob = x < 0;
        vd.className = "verdict " + (glob ? "good" : "warn") + " stepper-text";
        vd.textContent = "Converged: f′(xₖ) ≈ 0 at x ≈ " + x.toFixed(3) + ". " + (glob ? "This is the global minimum." : "This is only a local minimum. The global minimum is near x ≈ −1.5. Try a different start point.");
      } else {
        vd.className = "verdict stepper-text";
        vd.textContent = "The slope at xₖ is " + (g > 0 ? "positive" : "negative") + " (" + P.fmt(g, 3) + "), so f decreases to the " + dir + ". Gradient descent moves " + dir + " by α·|f′(xₖ)| = " + P.fmt(Math.abs(parseFloat(al.value) * g), 3) + ". Steep slope means a big move, flat slope a small one.";
      }
    }
    path = [parseFloat(x0.value)];
    P.responsive(canvas, draw);
  }

  /* =========================================================
     4. Rates of convergence
     ========================================================= */
  function rates(w) {
    var S = [
      { id: "sub", name: "Sub-linear: 1/k", f: function (k) { return 1 / k; }, col: "ink3", on: true },
      { id: "lin9", name: "Linear: 0.9ᵏ", f: function (k) { return Math.pow(0.9, k); }, col: "gold", on: true },
      { id: "lin5", name: "Linear: 0.5ᵏ", f: function (k) { return Math.pow(0.5, k); }, col: "accent2", on: true },
      { id: "sup", name: "Super-linear: (1/k)ᵏ", f: function (k) { return Math.pow(1 / k, k); }, col: "accent", on: true },
      { id: "quad", name: "Quadratic: 0.5^(2ᵏ)", f: function (k) { return Math.pow(0.5, Math.pow(2, k)); }, col: "red", on: true }
    ];
    var logY = true;
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Error versus iteration for different convergence rates"></canvas>' +
      '<div class="controls">' + seg([["log", "Log scale"], ["lin", "Linear scale"]], "log") +
      S.map(function (s) { return '<label><input type="checkbox" data-id="' + s.id + '" checked> <span class="sw" data-col="' + s.col + '" style="display:inline-block;width:12px;height:3px;border-radius:2px"></span>' + s.name + "</label>"; }).join("") + "</div>" +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">Vertical axis: the error |zₖ − z*| after k iterations. On a log scale, linear convergence is a straight line, faster rates bend downward, and sub-linear flattens out.</p>';
    var canvas = b.querySelector("canvas");
    bindSeg(b.querySelector(".seg"), function (v) { logY = v === "log"; draw(); });
    b.querySelectorAll("input[type=checkbox]").forEach(function (c) {
      c.addEventListener("change", function () { S.forEach(function (s) { if (s.id === c.getAttribute("data-id")) s.on = c.checked; }); draw(); });
    });
    function draw() {
      var s = P.setup(canvas, 0.48), pal = P.palette(), ctx = s.ctx;
      b.querySelectorAll(".sw").forEach(function (sw) { sw.style.background = pal[sw.getAttribute("data-col")]; });
      var K = 30, padL = 46, padB = 26;
      var v = { px: function (k) { return padL + k / K * (s.w - padL - 12); },
        py: function (e) {
          var t = logY ? (Math.log10(Math.max(e, 1e-16)) + 16) / 16 : e;
          return s.h - padB - t * (s.h - padB - 12);
        } };
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      var ticks = logY ? [1, 1e-4, 1e-8, 1e-12, 1e-16] : [1, 0.75, 0.5, 0.25, 0];
      ticks.forEach(function (tk) {
        P.line(ctx, padL, v.py(tk), s.w - 12, v.py(tk));
        P.text(ctx, logY ? (tk === 1 ? "1" : "1e" + Math.round(Math.log10(tk))) : String(tk), padL - 6, v.py(tk), pal.ink3, 11, "right");
      });
      for (var k = 0; k <= K; k += 5) P.text(ctx, String(k), v.px(k), s.h - 10, pal.ink3, 11, "center");
      P.text(ctx, "iteration k", s.w - 14, s.h - 10, pal.ink3, 11, "right");
      S.forEach(function (sr) {
        if (!sr.on) return;
        ctx.save(); ctx.strokeStyle = pal[sr.col]; ctx.lineWidth = 2.2; ctx.beginPath();
        var started = false;
        for (var k2 = 1; k2 <= K; k2++) {
          var e = sr.f(k2);
          if (logY && e < 1e-16) { if (started) ctx.lineTo(v.px(k2), v.py(1e-16)); break; }
          if (!started) { ctx.moveTo(v.px(k2), v.py(e)); started = true; } else ctx.lineTo(v.px(k2), v.py(e));
        }
        ctx.stroke(); ctx.restore();
      });
    }
    P.responsive(canvas, draw);
  }

  /* =========================================================
     5. Smoothness and strong convexity: the quadratic sandwich
     ========================================================= */
  function sandwich(w) {
    var f = function (x) { return 0.5 * x * x + 3 * Math.log(Math.cosh(x - 0.8)); };
    var df = function (x) { return x + 3 * Math.tanh(x - 0.8); };
    var TRUE_M = 4, TRUE_m = 1;
    // minimizer by bisection on df
    var lo = -3, hi = 3; for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (df(mid) > 0) hi = mid; else lo = mid; }
    var xstar = (lo + hi) / 2, zstar = f(xstar);
    var b = body(w);
    b.innerHTML = '<canvas aria-label="A function squeezed between two parabolas"></canvas>' +
      '<div class="controls">' +
      '<label>Current point xₖ <input type="range" class="xk" min="-2.8" max="2.8" step="0.02" value="-2.2"><output class="xko"></output></label>' +
      '<label>M <input type="range" class="M" min="1" max="8" step="0.25" value="4"><output class="Mo"></output></label>' +
      '<label>m <input type="range" class="m" min="0" max="2" step="0.25" value="1"><output class="mo"></output></label>' +
      '<button type="button" class="btn step">Take the step xₖ − f′(xₖ)/M</button></div>' +
      '<div class="stats"><div><b>f(xₖ) − z*</b><span class="gap"></span></div><div><b>after one step</b><span class="gap2"></span></div><div><b>ratio</b><span class="ratio"></span></div><div><b>bound 1 − m/M</b><span class="bound"></span></div></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas");
    var xs = b.querySelector(".xk"), Ms = b.querySelector(".M"), ms = b.querySelector(".m");
    [xs, Ms, ms].forEach(function (s) { s.addEventListener("input", function () { draw(); }); });
    b.querySelector(".step").addEventListener("click", function () {
      var x = parseFloat(xs.value), M = parseFloat(Ms.value);
      xs.value = Math.max(-2.8, Math.min(2.8, x - df(x) / M)); draw();
    });
    function draw() {
      var x = parseFloat(xs.value), M = parseFloat(Ms.value), m = parseFloat(ms.value);
      b.querySelector(".xko").textContent = x.toFixed(2);
      b.querySelector(".Mo").textContent = M.toFixed(2);
      b.querySelector(".mo").textContent = m.toFixed(2);
      var fx = f(x), g = df(x);
      var U = function (y) { return fx + g * (y - x) + M / 2 * (y - x) * (y - x); };
      var L = function (y) { return fx + g * (y - x) + m / 2 * (y - x) * (y - x); };
      var T = function (y) { return fx + g * (y - x); };
      var s = P.setup(canvas, 0.55), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -3.2, 3.2, -1.5, 14.5, 10);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 1, gy: 2 });
      // shade the sandwich
      ctx.save(); ctx.fillStyle = pal.soft; ctx.globalAlpha = 0.6; ctx.beginPath();
      var n = 200, a = -3.2, c = 3.2;
      for (var k = 0; k <= n; k++) { var y = a + (c - a) * k / n; var py = Math.max(-50, Math.min(s.h + 50, v.py(U(y)))); k ? ctx.lineTo(v.px(y), py) : ctx.moveTo(v.px(y), py); }
      for (k = n; k >= 0; k--) { y = a + (c - a) * k / n; py = Math.max(-50, Math.min(s.h + 50, v.py(L(y)))); ctx.lineTo(v.px(y), py); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      P.curve(ctx, v, T, pal.ink3, 1, [3, 4]);
      P.curve(ctx, v, U, pal.red, 1.8, [7, 4]);
      P.curve(ctx, v, L, pal.gold, 1.8, [7, 4]);
      P.curve(ctx, v, f, pal.accent, 2.8);
      var xn = x - g / M;
      P.dot(ctx, v.px(xstar), v.py(zstar), 4, pal.ink, null);
      P.text(ctx, "x*", v.px(xstar) + 6, v.py(zstar) + 12, pal.ink2, 12);
      P.dot(ctx, v.px(x), v.py(fx), 6, pal.gold, pal.bg);
      if (Math.abs(xn) < 3.2) {
        P.dot(ctx, v.px(xn), v.py(U(xn)), 4.5, pal.red, pal.bg);
        ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = pal.red; P.line(ctx, v.px(xn), v.py(U(xn)), v.px(xn), v.py(f(xn))); ctx.restore();
        P.dot(ctx, v.px(xn), v.py(f(xn)), 5, pal.accent, pal.bg);
      }
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(8, 6, 132, 56); ctx.restore();
      P.text(ctx, "upper bound (M)", 14, 16, pal.red, 12);
      P.text(ctx, "lower bound (m)", 14, 34, pal.gold, 12);
      P.text(ctx, "tangent (convexity)", 14, 52, pal.ink3, 12);
      var gap = fx - zstar, gap2 = f(xn) - zstar;
      b.querySelector(".gap").textContent = P.fmt(gap, 4);
      b.querySelector(".gap2").textContent = P.fmt(gap2, 4);
      b.querySelector(".ratio").textContent = gap > 1e-9 ? P.fmt(gap2 / gap, 3) : "n/a";
      b.querySelector(".bound").textContent = P.fmt(1 - m / M, 3);
      // check if the parabolas are true bounds on the plotted range
      var upperOk = true, lowerOk = true;
      for (k = 0; k <= 300; k++) { y = -3.2 + 6.4 * k / 300; if (U(y) < f(y) - 1e-9) upperOk = false; if (L(y) > f(y) + 1e-9) lowerOk = false; }
      var vd = b.querySelector(".verdict");
      if (!upperOk) { vd.className = "verdict bad"; vd.textContent = "M = " + M + " is below the true smoothness constant (" + TRUE_M + " here, the largest value of f″). The red parabola cuts below f, so it is no longer an upper bound and a step of 1/M is no longer guaranteed to decrease f."; }
      else if (!lowerOk) { vd.className = "verdict warn"; vd.textContent = "m = " + m + " is above the true strong-convexity constant (" + TRUE_m + " here, the smallest value of f″). The gold parabola pokes above f, so it is not a valid lower bound."; }
      else { vd.className = "verdict good"; vd.textContent = "f stays inside the shaded sandwich. Gradient descent with step 1/M jumps to the minimum of the red parabola (red dot). Because f lies below the parabola, f drops at least to that level (teal dot). The ratio of gaps never exceeds 1 − m/M."; }
    }
    P.responsive(canvas, draw);
  }

  /* =========================================================
     6. How many iterations?
     ========================================================= */
  function iterations(w) {
    var b = body(w);
    b.innerHTML = '<div class="controls">' +
      '<label>Condition number κ = M/m <input type="range" class="ka" min="0" max="3" step="0.01" value="1"><output class="kao"></output></label>' +
      '<label>Tolerance ε <input type="range" class="ep" min="1" max="8" step="1" value="4"><output class="epo"></output></label></div>' +
      '<canvas aria-label="Guaranteed optimality gap versus iteration"></canvas>' +
      '<div class="stats"><div><b>shrink factor 1 − 1/κ</b><span class="c"></span></div><div><b>strongly convex: iterations</b><span class="kl"></span></div><div><b>only convex: iterations</b><span class="ks"></span></div></div>' +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">Normalised so that the starting gap f(x₀) − z* and the convex bound constant M‖x₀ − x*‖²/2 both equal 1. The numbers are the worst-case guarantees from the two theorems, with step size 1/M.</p>';
    var canvas = b.querySelector("canvas"), ka = b.querySelector(".ka"), ep = b.querySelector(".ep");
    [ka, ep].forEach(function (s) { s.addEventListener("input", function () { draw(); }); });
    function draw() {
      var kappa = Math.pow(10, parseFloat(ka.value)), eps = Math.pow(10, -parseFloat(ep.value));
      var c = 1 - 1 / kappa;
      var kl = kappa <= 1 ? 1 : Math.ceil(Math.log(eps) / Math.log(c));
      var ks = Math.ceil(1 / eps);
      b.querySelector(".kao").textContent = P.fmt(kappa, 1);
      b.querySelector(".epo").textContent = "1e−" + ep.value;
      b.querySelector(".c").textContent = P.fmt(c, 4);
      b.querySelector(".kl").textContent = kl.toLocaleString("en-US");
      b.querySelector(".ks").textContent = ks.toLocaleString("en-US");
      var s = P.setup(canvas, 0.42), pal = P.palette(), ctx = s.ctx;
      var K = Math.max(50, Math.min(100000, Math.round(kl * 1.25))), padL = 46, padB = 26;
      var px = function (k) { return padL + k / K * (s.w - padL - 12); };
      var py = function (e) { return s.h - padB - (Math.log10(Math.max(e, 1e-9)) + 9) / 9 * (s.h - padB - 12); };
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      [1, 1e-3, 1e-6, 1e-9].forEach(function (t) { P.line(ctx, padL, py(t), s.w - 12, py(t)); P.text(ctx, t === 1 ? "1" : "1e" + Math.round(Math.log10(t)), padL - 6, py(t), pal.ink3, 11, "right"); });
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = pal.ink2; P.line(ctx, padL, py(eps), s.w - 12, py(eps)); ctx.restore();
      P.text(ctx, "ε", s.w - 16, py(eps) - 9, pal.ink2, 12, "right");
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { P.text(ctx, Math.round(t * K).toLocaleString("en-US"), px(t * K), s.h - 10, pal.ink3, 11, "center"); });
      function plot(fn, col) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
        for (var i = 0; i <= 300; i++) { var k = i / 300 * K; var e = fn(Math.max(k, 0.5)); i ? ctx.lineTo(px(k), py(e)) : ctx.moveTo(px(k), py(e)); }
        ctx.stroke(); ctx.restore();
      }
      plot(function (k) { return Math.min(1, 1 / k); }, pal.ink3);
      plot(function (k) { return Math.pow(c, k); }, pal.accent);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(padL + 4, s.h - padB - 50, 210, 42); ctx.restore();
      P.text(ctx, "strongly convex: (1 − m/M)ᵏ", padL + 10, s.h - padB - 38, pal.accent, 12);
      P.text(ctx, "convex only: 1/k", padL + 10, s.h - padB - 20, pal.ink3, 12);
    }
    P.responsive(canvas, draw);
  }

  /* =========================================================
     7. Gradient descent playground in two dimensions
     ========================================================= */
  function quad(Q, c, k0) {
    return {
      quad: true, Q: Q,
      f: function (x, y) { return 0.5 * (Q[0][0] * x * x + 2 * Q[0][1] * x * y + Q[1][1] * y * y) - c[0] * x - c[1] * y + k0; },
      g: function (x, y) { return [Q[0][0] * x + Q[0][1] * y - c[0], Q[0][1] * x + Q[1][1] * y - c[1]]; }
    };
  }
  var FUNCS = {
    good: Object.assign(quad([[20, 5], [5, 16]], [25, 21], 10), { name: "Well-conditioned quadratic", star: [1, 1], view: [1, 1, 6], start: [-1.6, 2.6], alpha: 0.05,
      note: "Q = [[20, 5], [5, 16]], condition number 1.85. Level sets are nearly circles, so the negative gradient points almost straight at the minimum." }),
    bad: Object.assign(quad([[20, 5], [5, 2]], [25, 7], 10), { name: "Ill-conditioned quadratic", star: [1, 1], view: [1, 1, 6], start: [-1.6, 2.6], alpha: 0.05,
      note: "Q = [[20, 5], [5, 2]], condition number 30.2. Long thin ellipses: the gradient points across the valley, not along it, so the iterates zigzag." }),
    lec: Object.assign(quad([[10, 4], [4, 2]], [14, 6], 20), { name: "Lecture example", star: [1, 1], view: [1, 1, 7], start: [2.7, 2.5], alpha: 0.1,
      note: "f = 5x₁² + x₂² + 4x₁x₂ − 14x₁ − 6x₂ + 20, minimum f(1, 1) = 10. Compare exact line search with a constant step of 0.1." }),
    scale: Object.assign(quad([[1000, 20], [20, 1]], [0, 0], 0), { name: "Badly scaled", star: [0, 0], view: [0, 0, 8], start: [0.06, 2.2], alpha: 0.0019,
      note: "f = 500x₁² + 20x₁x₂ + 0.5x₂², condition number about 1,668. Turn on diagonal scaling to see the fix." }),
    rosen: { name: "Rosenbrock (banana)", star: [1, 1], view: [0, 1, 4.4], start: [-1.2, 1], alpha: 0.001,
      f: function (x, y) { return 100 * (y - x * x) * (y - x * x) + (1 - x) * (1 - x); },
      g: function (x, y) { return [-400 * x * (y - x * x) - 2 * (1 - x), 200 * (y - x * x)]; },
      note: "f = 100(x₂ − x₁²)² + (1 − x₁)². Not convex. Reaching the valley is fast, crawling along the curved valley floor to (1, 1) is slow." },
    wells: { name: "Two valleys (non-convex)", star: [-1.04, 0], view: [0, 0, 4.6], start: [1.6, 1.1], alpha: 0.05,
      f: function (x, y) { return (x * x - 1) * (x * x - 1) + 0.8 * y * y + 0.3 * x; },
      g: function (x, y) { return [4 * x * (x * x - 1) + 0.3, 1.6 * y]; },
      note: "f = (x₁² − 1)² + 0.8x₂² + 0.3x₁ has a global minimum on the left and a worse local minimum on the right. Click different start points." }
  };

  function playground(w) {
    var allowed = (w.getAttribute("data-fns") || "good,bad,lec,scale,rosen,wells").split(",");
    var fn = w.getAttribute("data-fn") || allowed[0];
    var rule = w.getAttribute("data-rule") || "const";
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Contour plot with gradient descent iterates. Click to choose a start point."></canvas>' +
      '<div class="controls">' + (allowed.length > 1 ? '<select class="fnsel" aria-label="Function">' + allowed.map(function (k) { return '<option value="' + k + '">' + FUNCS[k].name + "</option>"; }).join("") + "</select>" : "") +
      seg([["const", "Constant step"], ["back", "Backtracking"], ["exact", "Exact line search"]], rule) + "</div>" +
      '<div class="controls"><label class="alpha-wrap">Step size α <input type="range" class="al" min="-4" max="0" step="0.01"><output class="alo"></output></label>' +
      '<label class="scale-wrap"><input type="checkbox" class="sc"> Diagonal scaling D = diag(1/Q₁₁, 1/Q₂₂)</label>' +
      '<button type="button" class="btn run">Run</button><button type="button" class="btn ghost reset">Reset</button></div>' +
      '<div class="stats"><div><b>iterations</b><span class="it"></span></div><div><b>f(xₖ)</b><span class="fv"></span></div><div><b>‖∇f(xₖ)‖</b><span class="gn"></span></div><div><b>status</b><span class="st"></span></div></div>' +
      '<p class="note muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0"></p>';
    var canvas = b.querySelector("canvas");
    var al = b.querySelector(".al"), sc = b.querySelector(".sc"), sel = b.querySelector(".fnsel");
    var start = FUNCS[fn].start.slice(), path = [], shown = 0, anim = null, status = "", layer = null, layerKey = "";
    var view;
    function setFn(k) {
      fn = k; start = FUNCS[k].start.slice();
      al.value = Math.log10(FUNCS[k].alpha);
      sc.checked = false; sc.disabled = !FUNCS[k].quad;
      b.querySelector(".scale-wrap").style.opacity = FUNCS[k].quad ? 1 : 0.45;
      b.querySelector(".note").textContent = FUNCS[k].note;
      layer = null; compute(); run();
    }
    if (sel) { sel.value = fn; sel.addEventListener("change", function () { setFn(sel.value); }); }
    bindSeg(b.querySelector(".seg"), function (v) { rule = v; updateAlphaUi(); compute(); run(); });
    al.addEventListener("input", function () { updateAlphaUi(); compute(); run(); });
    sc.addEventListener("change", function () { compute(); run(); });
    b.querySelector(".run").addEventListener("click", function () { run(); });
    b.querySelector(".reset").addEventListener("click", function () { start = FUNCS[fn].start.slice(); compute(); run(); });
    canvas.addEventListener("click", function (e) {
      if (!view) return;
      var r = canvas.getBoundingClientRect();
      start = [view.ix(e.clientX - r.left), view.iy(e.clientY - r.top)];
      compute(); run();
    });
    function updateAlphaUi() {
      b.querySelector(".alpha-wrap").style.opacity = rule === "const" ? 1 : 0.45;
      al.disabled = rule !== "const";
      b.querySelector(".alo").textContent = P.fmt(Math.pow(10, parseFloat(al.value)), 4);
    }
    function dirOf(F, x, y, D) {
      var g = F.g(x, y);
      return D ? [-D[0] * g[0], -D[1] * g[1]] : [-g[0], -g[1]];
    }
    function compute() {
      var F = FUNCS[fn], x = start[0], y = start[1];
      var D = sc.checked && F.quad ? [1 / F.Q[0][0], 1 / F.Q[1][1]] : null;
      var alpha = Math.pow(10, parseFloat(al.value));
      path = [[x, y]]; status = "";
      var maxIt = 20000, tol = 1e-4;
      for (var k = 0; k < maxIt; k++) {
        var g = F.g(x, y), gn = Math.hypot(g[0], g[1]);
        if (gn < tol) { status = "converged"; break; }
        var d = dirOf(F, x, y, D), slope = g[0] * d[0] + g[1] * d[1], t;
        if (rule === "const") t = alpha;
        else if (rule === "back") {
          t = 1; var f0 = F.f(x, y), sigma = 0.3, beta = 0.5, guard = 0;
          while (F.f(x + t * d[0], y + t * d[1]) > f0 + sigma * t * slope && guard++ < 60) t *= beta;
        } else {
          if (F.quad) {
            var Q = F.Q, Qd0 = Q[0][0] * d[0] + Q[0][1] * d[1], Qd1 = Q[0][1] * d[0] + Q[1][1] * d[1];
            t = -slope / (d[0] * Qd0 + d[1] * Qd1);
          } else t = lineMin(F, x, y, d);
        }
        x += t * d[0]; y += t * d[1];
        path.push([x, y]);
        if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) { status = "diverged"; break; }
      }
      if (!status) status = "max iterations";
    }
    function lineMin(F, x, y, d) {
      var phi = function (t) { return F.f(x + t * d[0], y + t * d[1]); };
      var hi = 1e-4, f0 = phi(0);
      while (phi(hi * 2) < phi(hi) && hi < 1e4) hi *= 2;
      if (phi(hi) > f0) { while (phi(hi) > f0 && hi > 1e-12) hi /= 2; }
      var a = 0, c = hi * 2, gr = (Math.sqrt(5) - 1) / 2;
      var x1 = c - gr * (c - a), x2 = a + gr * (c - a), f1 = phi(x1), f2 = phi(x2);
      for (var i = 0; i < 80; i++) {
        if (f1 < f2) { c = x2; x2 = x1; f2 = f1; x1 = c - gr * (c - a); f1 = phi(x1); }
        else { a = x1; x1 = x2; f1 = f2; x2 = a + gr * (c - a); f2 = phi(x2); }
      }
      return (a + c) / 2;
    }
    function run() {
      if (anim) cancelAnimationFrame(anim);
      shown = 0;
      var t0 = null, dur = Math.min(2600, 500 + path.length * 25);
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        shown = Math.max(1, Math.round(p * p * (path.length - 1)) + 1);
        draw(false);
        if (p < 1) anim = requestAnimationFrame(frame); else anim = null;
      }
      anim = requestAnimationFrame(frame);
    }
    function draw(resized) {
      var F = FUNCS[fn];
      var s = P.setup(canvas, 0.62), pal = P.palette(), ctx = s.ctx;
      var cx = F.view[0], cy = F.view[1], span = F.view[2];
      var hy = span * 0.62;
      view = new P.View(s.w, s.h, cx - span / 2, cx + span / 2, cy - hy / 2, cy + hy / 2, 0);
      var key = fn + "|" + s.w + "|" + document.documentElement.getAttribute("data-theme") + "|" + pal.accent;
      if (!layer || layerKey !== key || resized) {
        layer = P.contourLayer(s.w, s.h, s.dpr, view, F.f, pal, { nx: 150, levels: 18, lowFrac: fn === "rosen" ? 1e-5 : fn === "scale" ? 1e-6 : 2e-4 });
        layerKey = key;
      }
      ctx.drawImage(layer, 0, 0, s.w, s.h);
      // optimum
      var sx = view.px(F.star[0]), sy = view.py(F.star[1]);
      ctx.save(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 2;
      P.line(ctx, sx - 6, sy - 6, sx + 6, sy + 6); P.line(ctx, sx - 6, sy + 6, sx + 6, sy - 6); ctx.restore();
      // path
      var n = Math.min(shown, path.length);
      ctx.save(); ctx.strokeStyle = status === "diverged" ? pal.red : pal.gold; ctx.lineWidth = 1.8; ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var px = Math.max(-1e4, Math.min(1e4, view.px(path[i][0]))), py = Math.max(-1e4, Math.min(1e4, view.py(path[i][1])));
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke(); ctx.restore();
      var step = n > 400 ? Math.ceil(n / 400) : 1;
      for (i = 0; i < n; i += step) P.dot(ctx, view.px(path[i][0]), view.py(path[i][1]), 2.4, status === "diverged" ? pal.red : pal.gold);
      P.dot(ctx, view.px(start[0]), view.py(start[1]), 5, pal.bg, pal.ink);
      var last = path[n - 1];
      P.dot(ctx, view.px(last[0]), view.py(last[1]), 5.5, status === "diverged" ? pal.red : pal.gold, pal.bg);
      P.text(ctx, "click anywhere to choose a new start point", s.w - 10, s.h - 12, pal.ink3, 11, "right");
      // stats
      var done = n >= path.length;
      var fv = F.f(last[0], last[1]), g = F.g(last[0], last[1]);
      b.querySelector(".it").textContent = (n - 1).toLocaleString("en-US") + (done && status === "max iterations" ? "+" : "");
      b.querySelector(".fv").textContent = P.fmt(fv, 5);
      b.querySelector(".gn").textContent = P.fmt(Math.hypot(g[0], g[1]), 3);
      b.querySelector(".st").textContent = done ? status : "running";
    }
    updateAlphaUi();
    al.value = Math.log10(FUNCS[fn].alpha); updateAlphaUi();
    sc.disabled = !FUNCS[fn].quad;
    b.querySelector(".scale-wrap").style.opacity = FUNCS[fn].quad ? 1 : 0.45;
    if (w.hasAttribute("data-noscale")) b.querySelector(".scale-wrap").style.display = "none";
    b.querySelector(".note").textContent = FUNCS[fn].note;
    compute(); shown = path.length;
    P.responsive(canvas, function (resized) { draw(resized); });
    run();
  }

  /* =========================================================
     8. Steepest descent in different norms
     ========================================================= */
  function steepest(w) {
    var norm = "two";
    var P = [4, 1]; // P = diag(4, 1)
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Unit ball and steepest descent direction"></canvas>' +
      '<div class="controls">' + seg([["two", "2-norm"], ["one", "1-norm"], ["P", "P-norm, P = diag(4, 1)"]], norm) +
      '<label>Gradient angle <input type="range" class="ang" min="0" max="360" step="1" value="35"><output class="ango"></output></label></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas"), ang = b.querySelector(".ang");
    bindSeg(b.querySelector(".seg"), function (v) { norm = v; draw(); });
    ang.addEventListener("input", function () { draw(); });
    function draw() {
      var th = parseFloat(ang.value) * Math.PI / 180, g = [Math.cos(th), Math.sin(th)];
      b.querySelector(".ango").textContent = ang.value + "°";
      var s = Plot.setup(canvas, 0.62), pal = Plot.palette(), ctx = s.ctx;
      var span = 4.2, v = new Plot.View(s.w, s.h, -span / 2, span / 2, -span * 0.31, span * 0.31, 0);
      Plot.clear(ctx, s.w, s.h, pal.bg); Plot.axes(ctx, v, pal, { gx: 0.5, gy: 0.5 });
      // unit ball
      ctx.save(); ctx.fillStyle = pal.soft; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i <= 360; i++) {
        var a = i * Math.PI / 180, x, y;
        if (norm === "two") { x = Math.cos(a); y = Math.sin(a); }
        else if (norm === "P") { x = Math.cos(a) / Math.sqrt(P[0]); y = Math.sin(a) / Math.sqrt(P[1]); }
        else { var c = Math.cos(a), sn = Math.sin(a), r = 1 / (Math.abs(c) + Math.abs(sn)); x = r * c; y = r * sn; }
        i ? ctx.lineTo(v.px(x), v.py(y)) : ctx.moveTo(v.px(x), v.py(y));
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      // steepest direction
      var d;
      if (norm === "two") d = [-g[0], -g[1]];
      else if (norm === "P") { var q = [g[0] / P[0], g[1] / P[1]], nrm = Math.sqrt(g[0] * q[0] + g[1] * q[1]); d = [-q[0] / nrm, -q[1] / nrm]; }
      else { d = Math.abs(g[0]) >= Math.abs(g[1]) ? [-Math.sign(g[0]), 0] : [0, -Math.sign(g[1])]; }
      var val = g[0] * d[0] + g[1] * d[1];
      // supporting line g^T v = val, perpendicular to g
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1.2;
      var px0 = val * g[0], py0 = val * g[1], tx = -g[1], ty = g[0];
      Plot.line(ctx, v.px(px0 - 3 * tx), v.py(py0 - 3 * ty), v.px(px0 + 3 * tx), v.py(py0 + 3 * ty)); ctx.restore();
      Plot.arrow(ctx, v.px(0), v.py(0), v.px(1.25 * g[0]), v.py(1.25 * g[1]), pal.gold, 2.2);
      Plot.text(ctx, "∇f", v.px(1.38 * g[0]), v.py(1.38 * g[1]), pal.gold, 14, "center");
      Plot.arrow(ctx, v.px(0), v.py(0), v.px(d[0]), v.py(d[1]), pal.red, 2.6);
      Plot.text(ctx, "d", v.px(d[0] * 1.15) + 4, v.py(d[1] * 1.15), pal.red, 14, "center");
      var vd = b.querySelector(".verdict");
      var names = { two: "The steepest unit step points exactly against the gradient: ordinary gradient descent.",
        P: "The ball is squeezed along x₁, so the best direction tilts towards x₂. It equals −P⁻¹∇f, rescaled: scaled gradient descent with D = P⁻¹.",
        one: "The 1-norm ball is a diamond, so the best point is always a corner. Only the coordinate with the largest partial derivative moves: coordinate descent." };
      vd.className = "verdict"; vd.textContent = names[norm] + " First-order decrease ∇fᵀd = " + Plot.fmt(val, 3) + ".";
    }
    Plot.responsive(canvas, draw);
  }

  var REG = { steepest: steepest, "stationary-1d": stationary1d, "hessian-2d": hessian2d, "gd-1d": gd1d, rates: rates, sandwich: sandwich, iterations: iterations, playground: playground };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
