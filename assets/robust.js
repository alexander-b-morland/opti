/* Opti, classes 13 and 14: robust optimization widgets */
(function () {
  "use strict";
  var P = window.Plot;
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
  // dual norms of w for the three norm sets
  function dualNorm(set, w) {
    if (set === "box") return Math.abs(w[0]) + Math.abs(w[1]);           // dual of inf-norm is 1-norm
    if (set === "ball") return Math.hypot(w[0], w[1]);                    // 2-norm is self-dual
    return Math.max(Math.abs(w[0]), Math.abs(w[1]));                      // dual of 1-norm is inf-norm
  }
  // the adversary's best u in the set, for direction w
  function worstU(set, w, rho) {
    if (set === "box") return [rho * Math.sign(w[0] || 1), rho * Math.sign(w[1] || 1)];
    if (set === "ball") { var n = Math.hypot(w[0], w[1]) || 1; return [rho * w[0] / n, rho * w[1] / n]; }
    return Math.abs(w[0]) >= Math.abs(w[1]) ? [rho * Math.sign(w[0] || 1), 0] : [0, rho * Math.sign(w[1] || 1)];
  }
  var SETNAME = { box: "Box (∞-norm)", ball: "Ellipsoid (2-norm)", budget: "Budget (1-norm)" };

  /* ---------------------------------------------------------
     A small robust LP in two variables:
       max 3x1 + 4x2
       s.t. a1 x1 + a2 x2 <= 12  with a = (2, 3) + diag(0.6, 0.9) u
            x1 <= 4, x >= 0
     --------------------------------------------------------- */
  var LP = { c: [3, 4], abar: [2, 3], D: [0.6, 0.9], b: 12, x1max: 4 };
  function robustLhs(x, set, rho) {
    var w = [LP.D[0] * x[0], LP.D[1] * x[1]];
    return LP.abar[0] * x[0] + LP.abar[1] * x[1] + rho * dualNorm(set, w);
  }
  function solveRobust(set, rho) {
    // the objective increases in both variables, so the optimum is on the boundary: scan x1, find largest x2
    var best = null;
    for (var i = 0; i <= 800; i++) {
      var x1 = LP.x1max * i / 800, lo = 0, hi = 6;
      if (robustLhs([x1, 0], set, rho) > LP.b) continue;
      for (var k = 0; k < 50; k++) { var m = (lo + hi) / 2; if (robustLhs([x1, m], set, rho) <= LP.b) lo = m; else hi = m; }
      var v = LP.c[0] * x1 + LP.c[1] * lo;
      if (!best || v > best.v) best = { x: [x1, lo], v: v };
    }
    return best;
  }

  function robustRegion(w) {
    var sets = (w.getAttribute("data-sets") || "box").split(",");
    var set = sets[0];
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Nominal and robust feasible regions"></canvas>' +
      '<div class="controls">' + (sets.length > 1 ? seg(sets.map(function (s) { return [s, SETNAME[s]]; }), set) : "") +
      '<label>Size of the uncertainty set ρ <input type="range" class="rho" min="0" max="2" step="0.05" value="1"><output class="rhoo"></output></label></div>' +
      '<div class="stats"><div><b>nominal optimum</b><span class="xn"></span></div><div><b>robust optimum</b><span class="xr"></span></div>' +
      '<div><b>objective lost</b><span class="pr"></span></div><div><b>nominal x, worst case</b><span class="wv"></span></div></div>' +
      '<p class="muted note" style="font-family:var(--sans);font-size:14px;margin:10px 0 0"></p>';
    var canvas = b.querySelector("canvas"), rho = b.querySelector(".rho");
    if (sets.length > 1) bindSeg(b.querySelector(".seg"), function (v) { set = v; draw(); });
    rho.addEventListener("input", function () { draw(); });
    function draw() {
      var r = parseFloat(rho.value);
      b.querySelector(".rhoo").textContent = r.toFixed(2);
      var s = P.setup(canvas, 0.62), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -0.4, -0.4 + 5 * s.w / s.h, -0.4, 4.6, 0);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 1, gy: 1 });
      // robust feasible region (shaded by pixel test)
      var rgb = pal.accent, step = 3;
      ctx.save(); ctx.fillStyle = pal.soft;
      for (var py = 0; py < s.h; py += step) for (var px = 0; px < s.w; px += step) {
        var x = [v.ix(px + step / 2), v.iy(py + step / 2)];
        if (x[0] < 0 || x[1] < 0 || x[0] > LP.x1max) continue;
        if (robustLhs(x, set, r) <= LP.b) ctx.fillRect(px, py, step, step);
      }
      ctx.restore();
      // nominal constraint line and x1 <= 4
      ctx.save(); ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      P.line(ctx, v.px(0), v.py(LP.b / LP.abar[1]), v.px(LP.b / LP.abar[0]), v.py(0));
      ctx.setLineDash([]); ctx.strokeStyle = pal.ink3;
      P.line(ctx, v.px(LP.x1max), v.py(0), v.px(LP.x1max), v.py(6.6)); ctx.restore();
      P.text(ctx, "nominal: 2x₁ + 3x₂ ≤ 12", v.px(0.25), v.py(4.3), pal.ink2, 12);
      P.text(ctx, "x₁ ≤ 4", v.px(LP.x1max) + 6, v.py(3.6), pal.ink3, 12);
      // robust boundary curve
      ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.4; ctx.beginPath();
      var started = false;
      for (var i = 0; i <= 400; i++) {
        var x1 = LP.x1max * i / 400, lo = 0, hi = 8;
        if (robustLhs([x1, 0], set, r) > LP.b) break;
        for (var k = 0; k < 40; k++) { var m = (lo + hi) / 2; if (robustLhs([x1, m], set, r) <= LP.b) lo = m; else hi = m; }
        if (!started) { ctx.moveTo(v.px(x1), v.py(lo)); started = true; } else ctx.lineTo(v.px(x1), v.py(lo));
      }
      ctx.stroke(); ctx.restore();
      var nom = solveRobust(set, 0), rob = solveRobust(set, r);
      // objective iso-lines through the two optima
      [[nom, pal.ink3], [rob, pal.gold]].forEach(function (p) {
        if (!p[0]) return;
        var val = p[0].v;
        ctx.save(); ctx.strokeStyle = p[1]; ctx.globalAlpha = 0.6; ctx.setLineDash([2, 4]);
        P.line(ctx, v.px(-0.4), v.py((val + 0.4 * 3) / 4), v.px(6.6), v.py((val - 6.6 * 3) / 4)); ctx.restore();
      });
      if (nom) P.dot(ctx, v.px(nom.x[0]), v.py(nom.x[1]), 6, pal.bg, pal.ink);
      if (rob) P.dot(ctx, v.px(rob.x[0]), v.py(rob.x[1]), 6.5, pal.gold, pal.bg);
      P.text(ctx, "○ nominal optimum   ● robust optimum   shaded: robust feasible set", 10, s.h - 12, pal.ink3, 11);
      b.querySelector(".xn").textContent = "(" + P.fmt(nom.x[0], 2) + ", " + P.fmt(nom.x[1], 2) + ") → " + P.fmt(nom.v, 2);
      b.querySelector(".xr").textContent = rob ? "(" + P.fmt(rob.x[0], 2) + ", " + P.fmt(rob.x[1], 2) + ") → " + P.fmt(rob.v, 2) : "infeasible";
      b.querySelector(".pr").textContent = rob ? P.fmt(100 * (1 - rob.v / nom.v), 1) + "%" : "n/a";
      var worst = robustLhs(nom.x, set, r);
      b.querySelector(".wv").textContent = "LHS " + P.fmt(worst, 2) + " vs 12";
      var note = b.querySelector(".note");
      note.textContent = "Robust constraint: 2x₁ + 3x₂ + ρ‖Δx‖ ≤ 12 with Δ = diag(0.6, 0.9). The extra term is the safety buffer. "
        + (set === "box" ? "Box set: the buffer is the 1-norm ρ(0.6|x₁| + 0.9|x₂|), so the region stays a polygon (a linear program)."
          : set === "ball" ? "Ellipsoidal set: the buffer is the 2-norm ρ√((0.6x₁)² + (0.9x₂)²), so the boundary curves (a second-order cone program)."
          : "Budget set: the buffer is the ∞-norm ρ·max(0.6|x₁|, 0.9|x₂|), so the region stays a polygon (a linear program).");
    }
    P.responsive(canvas, draw);
  }

  /* ---------------------------------------------------------
     The adversary: worst-case u for a given direction, and the dual norm
     --------------------------------------------------------- */
  function adversary(w) {
    var set = "box";
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Uncertainty set in u-space and the worst-case perturbation"></canvas>' +
      '<div class="controls">' + seg([["box", SETNAME.box], ["ball", SETNAME.ball], ["budget", SETNAME.budget]], set) +
      '<label>Direction of Δx <input type="range" class="ang" min="0" max="360" value="25"><output class="ango"></output></label></div>' +
      '<div class="stats"><div><b>worst u*</b><span class="us"></span></div><div><b>buffer u*ᵀ(Δx)</b><span class="bf"></span></div><div><b>dual norm used</b><span class="dn"></span></div></div>';
    var canvas = b.querySelector("canvas"), ang = b.querySelector(".ang");
    bindSeg(b.querySelector(".seg"), function (v) { set = v; draw(); });
    ang.addEventListener("input", function () { draw(); });
    function draw() {
      var th = parseFloat(ang.value) * Math.PI / 180, wv = [1.2 * Math.cos(th), 1.2 * Math.sin(th)], rho = 1;
      b.querySelector(".ango").textContent = ang.value + "°";
      var s = P.setup(canvas, 0.62), pal = P.palette(), ctx = s.ctx;
      var span = 4.4, v = new P.View(s.w, s.h, -span / 2, span / 2, -span * 0.31, span * 0.31, 0);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 0.5, gy: 0.5 });
      ctx.save(); ctx.fillStyle = pal.soft; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath();
      if (set === "box") { ctx.rect(v.px(-1), v.py(1), v.px(1) - v.px(-1), v.py(-1) - v.py(1)); }
      else if (set === "ball") { ctx.arc(v.px(0), v.py(0), v.px(1) - v.px(0), 0, Math.PI * 2); }
      else { ctx.moveTo(v.px(1), v.py(0)); ctx.lineTo(v.px(0), v.py(1)); ctx.lineTo(v.px(-1), v.py(0)); ctx.lineTo(v.px(0), v.py(-1)); ctx.closePath(); }
      ctx.fill(); ctx.stroke(); ctx.restore();
      var u = worstU(set, wv, rho), val = u[0] * wv[0] + u[1] * wv[1];
      // level line u^T w = val
      var n = Math.hypot(wv[0], wv[1]), e = [wv[0] / n, wv[1] / n], d = val / n;
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = pal.ink3;
      P.line(ctx, v.px(d * e[0] - 3 * e[1]), v.py(d * e[1] + 3 * e[0]), v.px(d * e[0] + 3 * e[1]), v.py(d * e[1] - 3 * e[0])); ctx.restore();
      P.arrow(ctx, v.px(0), v.py(0), v.px(wv[0]), v.py(wv[1]), pal.gold, 2.2);
      P.text(ctx, "Δx", v.px(wv[0] * 1.15), v.py(wv[1] * 1.15), pal.gold, 13, "center");
      P.dot(ctx, v.px(u[0]), v.py(u[1]), 6, pal.red, pal.bg);
      P.text(ctx, "u*", v.px(u[0]) + 10, v.py(u[1]) - 10, pal.red, 13);
      P.text(ctx, "the adversary pushes u as far as possible in the direction of Δx", 10, s.h - 12, pal.ink3, 11);
      b.querySelector(".us").textContent = "(" + P.fmt(u[0], 2) + ", " + P.fmt(u[1], 2) + ")";
      b.querySelector(".bf").textContent = P.fmt(val, 3);
      b.querySelector(".dn").textContent = set === "box" ? "‖Δx‖₁ = " + P.fmt(dualNorm(set, wv), 3)
        : set === "ball" ? "‖Δx‖₂ = " + P.fmt(dualNorm(set, wv), 3) : "‖Δx‖∞ = " + P.fmt(dualNorm(set, wv), 3);
    }
    P.responsive(canvas, draw);
  }

  /* ---------------------------------------------------------
     Cutting planes on the 2D robust LP with an ellipsoidal set
     --------------------------------------------------------- */
  function cuttingPlanes(w) {
    var rho = 1.2;
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Cutting plane iterations"></canvas>' +
      '<div class="controls"><button type="button" class="btn next">Next iteration</button><button type="button" class="btn ghost reset">Restart</button></div>' +
      '<div class="stats"><div><b>iteration</b><span class="it"></span></div><div><b>master solution x</b><span class="xs"></span></div><div><b>master objective</b><span class="ob"></span></div><div><b>worst-case LHS</b><span class="vi"></span></div></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas");
    var cuts, xk, it, done;
    function master() {
      // max c^T x s.t. cuts (a^T x <= 12), x1 <= 4, x >= 0. Enumerate vertices of the 2D polygon.
      var lines = cuts.map(function (a) { return [a[0], a[1], LP.b]; }).concat([[1, 0, LP.x1max], [-1, 0, 0], [0, -1, 0]]);
      var best = null;
      for (var i = 0; i < lines.length; i++) for (var j = i + 1; j < lines.length; j++) {
        var A = lines[i], B = lines[j], det = A[0] * B[1] - A[1] * B[0];
        if (Math.abs(det) < 1e-12) continue;
        var x = [(A[2] * B[1] - A[1] * B[2]) / det, (A[0] * B[2] - A[2] * B[0]) / det];
        var ok = lines.every(function (L) { return L[0] * x[0] + L[1] * x[1] <= L[2] + 1e-9; });
        if (!ok) continue;
        var val = LP.c[0] * x[0] + LP.c[1] * x[1];
        if (!best || val > best.v) best = { x: x, v: val };
      }
      return best;
    }
    function reset() { cuts = [LP.abar.slice()]; it = 0; done = false; xk = master(); draw(); }
    function next() {
      if (done) return;
      var wv = [LP.D[0] * xk.x[0], LP.D[1] * xk.x[1]];
      var u = worstU("ball", wv, rho), a = [LP.abar[0] + LP.D[0] * u[0], LP.abar[1] + LP.D[1] * u[1]];
      if (a[0] * xk.x[0] + a[1] * xk.x[1] <= LP.b + 1e-3) { done = true; draw(); return; }
      cuts.push(a); it++; xk = master(); draw();
    }
    b.querySelector(".next").addEventListener("click", next);
    b.querySelector(".reset").addEventListener("click", reset);
    function draw() {
      var s = P.setup(canvas, 0.62), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -0.4, -0.4 + 5 * s.w / s.h, -0.4, 4.6, 0);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 1, gy: 1 });
      // true robust region
      ctx.save(); ctx.fillStyle = pal.soft;
      for (var py = 0; py < s.h; py += 3) for (var px = 0; px < s.w; px += 3) {
        var x = [v.ix(px + 1.5), v.iy(py + 1.5)];
        if (x[0] < 0 || x[1] < 0 || x[0] > LP.x1max) continue;
        if (robustLhs(x, "ball", rho) <= LP.b) ctx.fillRect(px, py, 3, 3);
      }
      ctx.restore();
      cuts.forEach(function (a, i) {
        ctx.save(); ctx.strokeStyle = i === 0 ? pal.ink2 : pal.red; ctx.lineWidth = i === cuts.length - 1 && i > 0 ? 2.2 : 1.2;
        if (i === 0) ctx.setLineDash([6, 4]); else ctx.globalAlpha = 0.45 + 0.55 * i / cuts.length;
        P.line(ctx, v.px(0), v.py(LP.b / a[1]), v.px(LP.b / a[0]), v.py(0)); ctx.restore();
      });
      ctx.save(); ctx.strokeStyle = pal.ink3; P.line(ctx, v.px(LP.x1max), v.py(0), v.px(LP.x1max), v.py(6.6)); ctx.restore();
      P.dot(ctx, v.px(xk.x[0]), v.py(xk.x[1]), 6.5, done ? pal.accent : pal.gold, pal.bg);
      P.text(ctx, "shaded: true robust feasible set (ellipsoidal, ρ = 1.2)   red: cuts added", 10, s.h - 12, pal.ink3, 11);
      var lhs = robustLhs(xk.x, "ball", rho);
      b.querySelector(".it").textContent = it;
      b.querySelector(".xs").textContent = "(" + P.fmt(xk.x[0], 3) + ", " + P.fmt(xk.x[1], 3) + ")";
      b.querySelector(".ob").textContent = P.fmt(xk.v, 4);
      b.querySelector(".vi").textContent = P.fmt(lhs, 3) + " vs 12";
      var vd = b.querySelector(".verdict");
      if (done) { vd.className = "verdict good"; vd.textContent = "The subproblem finds no constraint violated by more than the tolerance, so the master solution is (approximately) robust optimal. Notice how the master objective only went down: each master problem is a relaxation, so its value is an upper bound on the robust optimum."; }
      else if (it === 0) { vd.className = "verdict"; vd.textContent = "Iteration 0: the master problem is the nominal problem. Its solution sits on the nominal line, outside the shaded robust set. Press Next: the subproblem finds the worst-case a for this x and adds it as a cut."; }
      else { vd.className = "verdict warn"; vd.textContent = "Cut " + it + " added: a* = (" + P.fmt(cuts[cuts.length - 1][0], 3) + ", " + P.fmt(cuts[cuts.length - 1][1], 3) + "). The new master solution still violates the robust constraint (worst-case LHS > 12), so keep going."; }
    }
    reset();
    P.responsive(canvas, draw);
  }

  /* ---------------------------------------------------------
     Capacity expansion: robust integer knapsack with a box set
     --------------------------------------------------------- */
  var CAP = { mean: [120, 100, 180, 140], sd: [12, 10, 18, 14], npv: [50, 40, 60, 30], budget: 500 };
  function solveCap(G) {
    var best = null, cost = CAP.mean.map(function (m, i) { return m + G * CAP.sd[i]; });
    for (var a = 0; a <= 5; a++) for (var b = 0; b <= 5; b++) for (var c = 0; c <= 3; c++) for (var d = 0; d <= 4; d++) {
      var x = [a, b, c, d], lhs = 0, val = 0;
      for (var i = 0; i < 4; i++) { lhs += cost[i] * x[i]; val += CAP.npv[i] * x[i]; }
      if (lhs > CAP.budget + 1e-9) continue;
      var nomCost = a * 120 + b * 100 + c * 180 + d * 140;
      if (!best || val > best.v || (val === best.v && nomCost < best.nc)) best = { x: x, v: val, nc: nomCost };
    }
    return best;
  }
  // deterministic pseudo-random normal samples so the numbers do not jump around
  var SAMPLES = (function () {
    var seed = 12345, out = [];
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    function norm() { var u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    for (var k = 0; k < 4000; k++) out.push([norm(), norm(), norm(), norm()]);
    return out;
  })();
  function probFeasible(x) {
    var ok = 0;
    SAMPLES.forEach(function (z) {
      var cost = 0; for (var i = 0; i < 4; i++) cost += (CAP.mean[i] + CAP.sd[i] * z[i]) * x[i];
      if (cost <= CAP.budget) ok++;
    });
    return ok / SAMPLES.length;
  }
  function capacity(w) {
    var b = body(w);
    b.innerHTML = '<div class="controls"><label>Robustness Γ <input type="range" class="g" min="0" max="3" step="0.25" value="0"><output class="go"></output></label></div>' +
      '<div class="stats"><div><b>factories (x₁, x₂, x₃, x₄)</b><span class="x"></span></div><div><b>NPV ($B)</b><span class="v"></span></div>' +
      '<div><b>unused capital at expected costs</b><span class="u"></span></div><div><b>P(within budget)</b><span class="p"></span></div></div>' +
      '<canvas aria-label="Price of robustness: NPV and probability of feasibility versus Gamma" style="margin-top:12px"></canvas>' +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">Box set: each cost may rise to its mean plus Γ standard deviations. The probability is simulated with 4,000 draws of independent normal costs, an assumption the robust model itself never needs.</p>';
    var g = b.querySelector(".g"), canvas = b.querySelector("canvas");
    var curve = [];
    for (var G = 0; G <= 3.0001; G += 0.05) { var s0 = solveCap(G); curve.push({ G: G, v: s0.v, p: probFeasible(s0.x) }); }
    g.addEventListener("input", function () { draw(); });
    function draw() {
      var G = parseFloat(g.value), sol = solveCap(G), p = probFeasible(sol.x);
      b.querySelector(".go").textContent = G.toFixed(2);
      b.querySelector(".x").textContent = "(" + sol.x.join(", ") + ")";
      b.querySelector(".v").textContent = sol.v + " (" + Math.round(100 * sol.v / 200) + "% of nominal)";
      b.querySelector(".u").textContent = "$" + (CAP.budget - sol.nc) + "M";
      b.querySelector(".p").textContent = Math.round(100 * p) + "%";
      var s = P.setup(canvas, 0.4), pal = P.palette(), ctx = s.ctx, padL = 40, padB = 26;
      var px = function (x) { return padL + x / 3 * (s.w - padL - 14); };
      var py = function (y) { return s.h - padB - y * (s.h - padB - 14); };
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { P.line(ctx, padL, py(t), s.w - 14, py(t)); P.text(ctx, Math.round(t * 100) + "%", padL - 6, py(t), pal.ink3, 11, "right"); });
      [0, 1, 2, 3].forEach(function (t) { P.text(ctx, "Γ = " + t, px(t), s.h - 10, pal.ink3, 11, t === 0 ? "left" : t === 3 ? "right" : "center"); });
      function plot(key, col, scale) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
        curve.forEach(function (c, i) { var y = c[key] / scale; if (i) { ctx.lineTo(px(c.G), py(curve[i - 1][key] / scale)); } else ctx.moveTo(px(c.G), py(y)); ctx.lineTo(px(c.G), py(y)); });
        ctx.stroke(); ctx.restore();
      }
      plot("v", pal.accent, 200); plot("p", pal.gold, 1);
      ctx.save(); ctx.strokeStyle = pal.ink2; ctx.setLineDash([3, 3]); P.line(ctx, px(G), py(0), px(G), py(1)); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(s.w - 220, py(0.42) - 10, 200, 40); ctx.restore();
      P.text(ctx, "NPV, % of nominal", s.w - 210, py(0.42), pal.accent, 12);
      P.text(ctx, "probability within budget", s.w - 210, py(0.42) + 18, pal.gold, 12);
    }
    P.responsive(canvas, draw);
  }

  var REG = { "robust-region": robustRegion, adversary: adversary, "cutting-planes": cuttingPlanes, capacity: capacity };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
