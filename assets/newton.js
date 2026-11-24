/* Opti, class 20: Newton's method widgets */
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
  function legend(ctx, items, x, y, pal) {
    var wMax = 0;
    items.forEach(function (it) { wMax = Math.max(wMax, it[0].length * 6.6 + 30); });
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(x - 6, y - 10, wMax + 8, items.length * 18 + 4); ctx.restore();
    items.forEach(function (it, i) {
      ctx.save(); ctx.strokeStyle = it[1]; ctx.lineWidth = 2.2; if (it[2]) ctx.setLineDash(it[2]);
      P.line(ctx, x, y + i * 18, x + 18, y + i * 18); ctx.restore();
      P.text(ctx, it[0], x + 24, y + i * 18, pal.ink2, 12);
    });
  }

  /* =========================================================
     1. Two views of one Newton step (one dimension)
     ========================================================= */
  var F1 = {
    exam: {
      name: "6x − log x (practice exam)",
      f: function (x) { return x > 0 ? 6 * x - Math.log(x) : NaN; },
      d1: function (x) { return 6 - 1 / x; },
      d2: function (x) { return 1 / (x * x); },
      dom: function (x) { return x > 0; },
      xr: [0, 0.5], yr: [2.5, 4.3], gr: [-14, 6], x0: 0.2, s: [0.02, 0.45, 0.01], star: 1 / 6,
      note: "Convex on x > 0, with its global minimum at x* = 1/6. The practice exam asks what happens from x₀ = 0.2 and from x₀ = 0.4."
    },
    quartic: {
      name: "x⁴/4 − x² + 0.4x (non-convex)",
      f: function (x) { return 0.25 * Math.pow(x, 4) - x * x + 0.4 * x; },
      d1: function (x) { return x * x * x - 2 * x + 0.4; },
      d2: function (x) { return 3 * x * x - 2; },
      dom: function () { return true; },
      xr: [-2.3, 2.3], yr: [-2.2, 3], gr: [-8, 8], x0: 0.4, s: [-2.2, 2.2, 0.05], star: null,
      note: "Two local minima (near −1.51 and 1.31) and a local maximum near 0.20. Start where f″ < 0, for example at 0.4."
    },
    kink: {
      name: "Two parabolas (practice exam)",
      f: function (x) { return x <= 0 ? (x - 1) * (x - 1) : (x + 1) * (x + 1); },
      d1: function (x) { return x <= 0 ? 2 * (x - 1) : 2 * (x + 1); },
      d2: function () { return 2; },
      dom: function () { return true; },
      xr: [-3, 4.5], yr: [-1, 30], gr: [-9, 12], x0: 4, s: [-2.5, 4.5, 0.05], star: 0,
      note: "f = (x − 1)² for x ≤ 0 and (x + 1)² for x > 0. Convex, with its minimum at the kink x = 0, where f is not differentiable. The practice exam starts at x₀ = 4."
    }
  };

  function views(w) {
    var fn = w.getAttribute("data-fn") || "exam", view = "second";
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Newton step shown as the minimizer of a quadratic model, or as the root of a linearized gradient"></canvas>' +
      '<div class="controls"><select class="fnsel" aria-label="Function">' + Object.keys(F1).map(function (k) { return '<option value="' + k + '">' + F1[k].name + "</option>"; }).join("") + "</select>" +
      seg([["second", "Second-order view"], ["first", "First-order view"]], view) + "</div>" +
      '<div class="controls"><label>Start x₀ <input type="range" class="x0"><output class="x0o"></output></label>' +
      '<button type="button" class="btn step">Take one Newton step</button><button type="button" class="btn ghost reset">Reset</button></div>' +
      '<div class="stats"><div><b>k</b><span class="k"></span></div><div><b>xₖ</b><span class="xk"></span></div><div><b>f′(xₖ)</b><span class="g"></span></div><div><b>f″(xₖ)</b><span class="h"></span></div><div><b>λ(xₖ)²/2</b><span class="dec"></span></div></div>' +
      '<div class="verdict"></div><p class="note muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0"></p>';
    var canvas = b.querySelector("canvas"), x0 = b.querySelector(".x0"), sel = b.querySelector(".fnsel");
    var path = [], status = "";
    function setFn(k) {
      fn = k; var F = F1[k];
      x0.min = F.s[0]; x0.max = F.s[1]; x0.step = F.s[2]; x0.value = F.x0;
      b.querySelector(".note").textContent = F.note;
      reset();
    }
    function reset() { path = [parseFloat(x0.value)]; status = ""; draw(); }
    function step() {
      if (status) return;
      var F = F1[fn], x = path[path.length - 1], g = F.d1(x), h = F.d2(x);
      if (Math.abs(g) < 1e-12) { status = "converged"; draw(); return; }
      var nx = x - g / h;
      path.push(nx);
      if (!F.dom(nx)) status = "domain";
      else if (Math.abs(nx) > 1e6) status = "diverged";
      draw();
    }
    sel.value = fn;
    sel.addEventListener("change", function () { setFn(sel.value); });
    bindSeg(b.querySelector(".seg"), function (v) { view = v; draw(); });
    x0.addEventListener("input", reset);
    b.querySelector(".step").addEventListener("click", step);
    b.querySelector(".reset").addEventListener("click", reset);

    function draw() {
      var F = F1[fn], pal = P.palette();
      var s = P.setup(canvas, 0.56), ctx = s.ctx;
      var x = path[path.length - 1], inDom = F.dom(x);
      var yr = view === "second" ? F.yr : F.gr;
      var v = new P.View(s.w, s.h, F.xr[0], F.xr[1], yr[0], yr[1], 18);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal);
      var g = inDom ? F.d1(x) : NaN, h = inDom ? F.d2(x) : NaN;
      var nx = inDom ? x - g / h : NaN;
      if (view === "second") {
        P.curve(ctx, v, F.f, pal.ink, 2.2);
        if (inDom) P.curve(ctx, v, function (y) { return F.f(x) + g * (y - x) + 0.5 * h * (y - x) * (y - x); }, pal.red, 2, [5, 4]);
      } else {
        if (fn === "kink") { P.curve(ctx, v, F.d1, pal.ink, 2.2, null, F.xr[0], 0); P.curve(ctx, v, F.d1, pal.ink, 2.2, null, 1e-9, F.xr[1]); }
        else P.curve(ctx, v, F.d1, pal.ink, 2.2, null, fn === "exam" ? 0.04 : null);
        if (inDom) P.curve(ctx, v, function (y) { return g + h * (y - x); }, pal.red, 2, [5, 4]);
      }
      // earlier iterates
      var yOf = function (t) { return view === "second" ? F.f(t) : F.d1(t); };
      for (var i = 0; i < path.length - 1; i++) {
        if (!F.dom(path[i])) continue;
        P.dot(ctx, v.px(path[i]), v.py(yOf(path[i])), 4, pal.gold);
        P.text(ctx, "x" + toSub(i), v.px(path[i]), v.py(yOf(path[i])) - 13, pal.ink3, 11, "center");
      }
      if (F.star !== null) {
        ctx.save(); ctx.strokeStyle = pal.ink3; ctx.setLineDash([2, 4]); P.line(ctx, v.px(F.star), v.py(yr[0]), v.px(F.star), v.py(yr[1])); ctx.restore();
        P.text(ctx, "x*", v.px(F.star) + 4, v.py(yr[1]) + 10, pal.ink3, 11);
      }
      if (inDom) {
        P.dot(ctx, v.px(x), v.py(yOf(x)), 6, pal.ink, pal.bg);
        P.text(ctx, "x" + toSub(path.length - 1), v.px(x) + 9, v.py(yOf(x)) - 12, pal.ink, 12);
        if (isFinite(nx) && nx > F.xr[0] - 1 && nx < F.xr[1] + 1) {
          var ny = view === "second" ? F.f(x) + g * (nx - x) + 0.5 * h * (nx - x) * (nx - x) : 0;
          P.dot(ctx, v.px(nx), v.py(ny), 6, pal.red);
          P.text(ctx, "next", v.px(nx), v.py(ny) + 15, pal.red, 11, "center");
        }
      }
      legend(ctx, view === "second"
        ? [["f", pal.ink], ["second-order model at xₖ", pal.red, [5, 4]]]
        : [["f′ (the gradient)", pal.ink], ["first-order model of f′ at xₖ", pal.red, [5, 4]]], s.w - 230, 26, pal);
      // stats
      b.querySelector(".x0o").textContent = P.fmt(parseFloat(x0.value), 2);
      b.querySelector(".k").textContent = path.length - 1;
      b.querySelector(".xk").textContent = P.fmt(x, 6);
      b.querySelector(".g").textContent = inDom ? P.fmt(g, 4) : "n/a";
      b.querySelector(".h").textContent = inDom ? P.fmt(h, 4) : "n/a";
      b.querySelector(".dec").textContent = inDom && h > 0 ? P.fmt(g * g / (2 * h), 4) : "n/a";
      var vd = b.querySelector(".verdict"), k = path.length - 1;
      if (status === "domain") { vd.className = "verdict bad"; vd.textContent = "x" + toSub(k) + " = " + P.fmt(x, 4) + " is outside the domain x > 0. Pure Newton has no safeguard: the error ratio |xₖ₊₁ − x*| / |xₖ − x*| = |1 − 6xₖ| was above 1, so the step overshot."; }
      else if (status === "diverged") { vd.className = "verdict bad"; vd.textContent = "The iterates blew up."; }
      else if (inDom && Math.abs(g) < 1e-9) {
        vd.className = h > 0 ? "verdict good" : "verdict bad";
        vd.textContent = "Stationary point reached after " + k + " steps: x = " + P.fmt(x, 6) + ". " + (h > 0 ? "f″ > 0, so it is a local minimum." : "f″ < 0, so it is a local maximum. Newton only looks for ∇f = 0 and cannot tell minima from maxima.");
      } else if (fn === "kink" && k >= 3 && Math.abs(Math.abs(x) - 1) < 1e-9) {
        vd.className = "verdict bad"; vd.textContent = "The iterates alternate between −1 and 1 forever. On each side the quadratic model is the parabola itself, so Newton jumps to its minimum, which lies on the other side of the kink. f is not twice differentiable at the minimum x = 0, so the convergence theory does not apply.";
      } else if (inDom && h <= 0) {
        vd.className = "verdict warn"; vd.textContent = "f″(xₖ) < 0: the second-order model curves downward, and its stationary point is a maximum. Newton jumps there anyway, because it only solves ∇f = 0. This is how Newton is attracted to local maxima.";
      } else {
        vd.className = "verdict"; vd.textContent = view === "second"
          ? "The next iterate is the minimizer of the red parabola: xₖ₊₁ = xₖ − f′(xₖ)/f″(xₖ). λ(xₖ)²/2 is how much the parabola promises to lower f."
          : "The next iterate is where the red tangent line of f′ crosses zero. Same point as in the second-order view.";
      }
    }
    function toSub(n) { return String(n).split("").map(function (c) { return "₀₁₂₃₄₅₆₇₈₉"[+c]; }).join(""); }
    setFn(fn);
    P.responsive(canvas, function () { draw(); });
  }

  /* =========================================================
     2. Newton versus gradient descent on the lecture example
     ========================================================= */
  var XS = 1 / 3, GD_ALPHA = 0.02, NMAX = 40;
  function bf(x, y) { var s = 1 - x - y; return x > 0 && y > 0 && s > 0 ? -Math.log(s) - Math.log(x) - Math.log(y) : Infinity; }
  function bg(x, y) { var s = 1 - x - y; return [1 / s - 1 / x, 1 / s - 1 / y]; }
  function bh(x, y) { var s = 1 - x - y, a = 1 / (s * s); return [a + 1 / (x * x), a, a + 1 / (y * y)]; }
  function inside(x, y) { return isFinite(bf(x, y)); }
  function runNewton(x, y) {
    var p = [[x, y]];
    for (var k = 0; k < NMAX; k++) {
      var g = bg(x, y), H = bh(x, y), det = H[0] * H[2] - H[1] * H[1];
      x += -(H[2] * g[0] - H[1] * g[1]) / det; y += -(-H[1] * g[0] + H[0] * g[1]) / det;
      p.push([x, y]);
      if (!inside(x, y)) return { p: p, out: true };
      if (Math.hypot(x - XS, y - XS) < 1e-14) break;
    }
    return { p: p, out: false };
  }
  function runGD(x, y) {
    var p = [[x, y]];
    for (var k = 0; k < NMAX; k++) {
      var g = bg(x, y); x -= GD_ALPHA * g[0]; y -= GD_ALPHA * g[1];
      p.push([x, y]);
      if (!inside(x, y)) return { p: p, out: true };
    }
    return { p: p, out: false };
  }
  function compare(w) {
    var b = body(w);
    b.innerHTML = '<canvas class="cont" aria-label="Contour plot of the barrier function with Newton and gradient descent iterates. Click inside the triangle to choose a start."></canvas>' +
      '<canvas class="err" aria-label="Distance to the optimum versus iteration, log scale"></canvas>' +
      '<div class="controls"><button type="button" class="btn ghost reset">Reset start</button></div>' +
      '<div class="stats"><div><b>Newton: iterations to 10⁻¹⁰</b><span class="kn"></span></div><div><b>gradient descent: iterations to 10⁻¹⁰</b><span class="kg"></span></div></div>' +
      '<div class="table-wrap"><table class="compare errs"><thead><tr><th>k</th><th>Newton ‖xₖ − x*‖</th><th>gradient descent ‖xₖ − x*‖</th></tr></thead><tbody></tbody></table></div>';
    var cv = b.querySelector(".cont"), ev = b.querySelector(".err");
    var start = [0.85, 0.07], N, G, layer = null, layerKey = "", view;
    function compute() { N = runNewton(start[0], start[1]); G = runGD(start[0], start[1]); }
    cv.addEventListener("click", function (e) {
      if (!view) return;
      var r = cv.getBoundingClientRect(), x = view.ix(e.clientX - r.left), y = view.iy(e.clientY - r.top);
      if (x > 0.02 && y > 0.02 && x + y < 0.98) { start = [x, y]; compute(); draw(); }
    });
    b.querySelector(".reset").addEventListener("click", function () { start = [0.85, 0.07]; compute(); draw(); });
    function firstBelow(R) { for (var i = 0; i < R.p.length; i++) if (Math.hypot(R.p[i][0] - XS, R.p[i][1] - XS) < 1e-10) return i; return null; }
    function draw() {
      var pal = P.palette();
      var s = P.setup(cv, 0.6), ctx = s.ctx;
      var hy = 1.1, hx = hy * s.w / s.h, cx = 0.5;
      view = new P.View(s.w, s.h, cx - hx / 2, cx + hx / 2, -0.05, 1.05, 0);
      var key = s.w + "|" + document.documentElement.getAttribute("data-theme") + "|" + pal.accent;
      if (!layer || key !== layerKey) {
        var fs = 3 * Math.log(3);
        layer = P.contourLayer(s.w, s.h, s.dpr, view, bf, pal, { nx: 170, levelsList: [0.03, 0.1, 0.22, 0.4, 0.65, 1, 1.45, 2, 2.7, 3.6, 4.8].map(function (d) { return fs + d; }) });
        layerKey = key;
      }
      ctx.drawImage(layer, 0, 0, s.w, s.h);
      ctx.save(); ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(view.px(0), view.py(0)); ctx.lineTo(view.px(1), view.py(0)); ctx.lineTo(view.px(0), view.py(1)); ctx.closePath(); ctx.stroke(); ctx.restore();
      function path(R, col) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        R.p.forEach(function (q, i) { var X = view.px(q[0]), Y = view.py(q[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke(); ctx.restore();
        R.p.forEach(function (q) { P.dot(ctx, view.px(q[0]), view.py(q[1]), 3, col); });
      }
      path(G, pal.accent2); path(N, pal.red);
      P.dot(ctx, view.px(start[0]), view.py(start[1]), 5.5, pal.bg, pal.ink);
      var sx = view.px(XS), sy = view.py(XS);
      ctx.save(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; P.line(ctx, sx - 6, sy - 6, sx + 6, sy + 6); P.line(ctx, sx - 6, sy + 6, sx + 6, sy - 6); ctx.restore();
      legend(ctx, [["Newton's method", pal.red], ["gradient descent, α = 0.02", pal.accent2]], s.w - 210, 22, pal);
      P.text(ctx, "click inside the triangle to choose a start", s.w - 10, s.h - 12, pal.ink3, 11, "right");

      // error chart
      var e = P.setup(ev, 0.4), c2 = e.ctx, padL = 46, padB = 26;
      P.clear(c2, e.w, e.h, pal.bg);
      var px = function (k) { return padL + k / NMAX * (e.w - padL - 12); };
      var py = function (d) { var l = Math.log10(Math.max(d, 1e-16)); return 30 + (0 - l) / 16 * (e.h - padB - 30); };
      c2.strokeStyle = pal.grid; c2.lineWidth = 1;
      [1, 1e-4, 1e-8, 1e-12, 1e-16].forEach(function (t) { P.line(c2, padL, py(t), e.w - 12, py(t)); P.text(c2, t === 1 ? "1" : "1e" + Math.round(Math.log10(t)), padL - 6, py(t), pal.ink3, 11, "right"); });
      [0, 10, 20, 30, 40].forEach(function (k) { P.text(c2, String(k), px(k), e.h - 10, pal.ink3, 11, "center"); });
      function series(R, col) {
        c2.save(); c2.strokeStyle = col; c2.lineWidth = 2; c2.beginPath();
        var n = 0;
        R.p.forEach(function (q, i) {
          if (!inside(q[0], q[1])) return;
          var d = Math.hypot(q[0] - XS, q[1] - XS); var X = px(i), Y = py(d);
          n++ ? c2.lineTo(X, Y) : c2.moveTo(X, Y);
        });
        c2.stroke(); c2.restore();
        R.p.forEach(function (q, i) { if (inside(q[0], q[1])) P.dot(c2, px(i), py(Math.hypot(q[0] - XS, q[1] - XS)), 2.6, col); });
      }
      series(G, pal.accent2); series(N, pal.red);
      P.text(c2, "distance to x* (log scale) against iteration k", padL + 6, 18, pal.ink3, 11);

      var kn = firstBelow(N), kg = firstBelow(G);
      b.querySelector(".kn").textContent = N.out ? "left the domain" : kn === null ? "> " + NMAX : kn;
      b.querySelector(".kg").textContent = G.out ? "left the domain" : kg === null ? "> " + NMAX : kg;
      var rows = "";
      for (var k = 0; k <= 8; k++) {
        var dn = N.p[k] && inside(N.p[k][0], N.p[k][1]) ? Math.hypot(N.p[k][0] - XS, N.p[k][1] - XS) : null;
        var dg = G.p[k] && inside(G.p[k][0], G.p[k][1]) ? Math.hypot(G.p[k][0] - XS, G.p[k][1] - XS) : null;
        rows += "<tr><td>" + k + "</td><td>" + (dn === null ? "" : dn.toExponential(1)) + "</td><td>" + (dg === null ? "" : dg.toExponential(1)) + "</td></tr>";
      }
      b.querySelector(".errs tbody").innerHTML = rows;
    }
    compute();
    P.responsive(cv, function () { layer = null; draw(); });
  }

  /* =========================================================
     3. Pure versus damped Newton (global convergence)
     ========================================================= */
  // f(x) = log cosh x + 0.05 x^2: m = 0.1, M = 1.1, Hessian L-Lipschitz with L = 4/(3 sqrt 3)
  var gm = 0.1, gM = 1.1, gL = 4 / (3 * Math.sqrt(3)), gEta = gm * gm / gL;
  function lc(x) { var a = Math.abs(x); return a + Math.log((1 + Math.exp(-2 * a)) / 2); }
  function gf(x) { return lc(x) + 0.05 * x * x; }
  function gd1(x) { return Math.tanh(x) + 0.1 * x; }
  function gd2(x) { var c = Math.cosh(x); return 1 / (c * c) + 0.1; }
  function global(w) {
    var mode = "pure";
    var b = body(w);
    b.innerHTML = '<canvas class="fx" aria-label="The function with Newton iterates"></canvas>' +
      '<canvas class="gx" aria-label="Gradient norm against iteration, log scale"></canvas>' +
      '<div class="controls">' + seg([["pure", "Pure Newton (α = 1)"], ["damped", "Newton with step size (theorem)"]], mode) +
      '<label>Start x₀ <input type="range" class="x0" min="-4" max="4" step="0.05" value="1.5"><output class="x0o"></output></label></div>' +
      '<div class="stats"><div><b>damped steps (α = m/M)</b><span class="nd"></span></div><div><b>local steps (α = 1)</b><span class="nl"></span></div><div><b>status</b><span class="st"></span></div></div>' +
      '<div class="verdict"></div>';
    var cf = b.querySelector(".fx"), cg = b.querySelector(".gx"), x0 = b.querySelector(".x0");
    var path = [], phase = [], status = "";
    function compute() {
      var x = parseFloat(x0.value); path = [x]; phase = []; status = "";
      for (var k = 0; k < 120; k++) {
        var g = gd1(x);
        if (Math.abs(g) < 1e-12) { status = "converged"; break; }
        var a = mode === "pure" ? 1 : (Math.abs(g) >= gEta ? gm / gM : 1);
        phase.push(a < 1 ? "d" : "l");
        x = x - a * g / gd2(x); path.push(x);
        if (Math.abs(x) > 1e6) { status = "diverged"; break; }
      }
      if (!status) status = "no convergence";
    }
    bindSeg(b.querySelector(".seg"), function (v) { mode = v; compute(); draw(); });
    x0.addEventListener("input", function () { compute(); draw(); });
    function draw() {
      var pal = P.palette();
      var s = P.setup(cf, 0.45), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -12, 12, -0.8, 15, 16);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 2, gy: 5 });
      P.curve(ctx, v, gf, pal.ink, 2.2);
      var shown = Math.min(path.length, 30);
      ctx.save(); ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath();
      for (var i = 0; i < shown; i++) { var X = v.px(path[i]), Y = v.py(gf(path[i])); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke(); ctx.restore();
      for (i = 0; i < shown; i++) P.dot(ctx, v.px(path[i]), v.py(gf(path[i])), 4, i === 0 ? pal.ink : phase[i - 1] === "d" ? pal.gold : pal.red);
      P.text(ctx, "x₀", v.px(path[0]), v.py(gf(path[0])) - 14, pal.ink, 12, "center");
      P.text(ctx, "f(x) = log cosh x + 0.05x²,  m = 0.1,  M = 1.1", s.w / 2, 20, pal.ink3, 11, "center");

      var e = P.setup(cg, 0.38), c2 = e.ctx, padL = 46, padB = 26, K = Math.max(10, path.length - 1);
      P.clear(c2, e.w, e.h, pal.bg);
      var px = function (k) { return padL + k / K * (e.w - padL - 12); };
      var py = function (d) { var l = Math.log10(Math.max(d, 1e-14)); return 30 + (1 - l) / 15 * (e.h - padB - 30); };
      c2.strokeStyle = pal.grid; c2.lineWidth = 1;
      [10, 1e-2, 1e-6, 1e-10, 1e-14].forEach(function (t) { P.line(c2, padL, py(t), e.w - 12, py(t)); P.text(c2, t === 10 ? "10" : "1e" + Math.round(Math.log10(t)), padL - 6, py(t), pal.ink3, 11, "right"); });
      [0, 0.5, 1].forEach(function (t) { P.text(c2, String(Math.round(t * K)), px(t * K), e.h - 10, pal.ink3, 11, "center"); });
      c2.save(); c2.setLineDash([5, 4]); c2.strokeStyle = pal.ink2; P.line(c2, padL, py(gEta), e.w - 12, py(gEta)); c2.restore();
      P.text(c2, "η = m²/L", e.w - 16, py(gEta) - 9, pal.ink2, 11, "right");
      c2.save(); c2.strokeStyle = pal.ink3; c2.lineWidth = 1.2; c2.beginPath();
      path.forEach(function (x, k) { var X = px(k), Y = py(Math.abs(gd1(x))); k ? c2.lineTo(X, Y) : c2.moveTo(X, Y); });
      c2.stroke(); c2.restore();
      path.forEach(function (x, k) { P.dot(c2, px(k), py(Math.abs(gd1(x))), 3, k === 0 ? pal.ink : phase[k - 1] === "d" ? pal.gold : pal.red); });
      P.text(c2, "|f′(xₖ)| (log scale): gold = damped step, red = full step", padL + 6, 18, pal.ink3, 11);

      b.querySelector(".x0o").textContent = parseFloat(x0.value).toFixed(2);
      var nd = phase.filter(function (p) { return p === "d"; }).length;
      b.querySelector(".nd").textContent = nd;
      b.querySelector(".nl").textContent = phase.length - nd;
      b.querySelector(".st").textContent = status === "converged" ? "converged in " + (path.length - 1) : status;
      var vd = b.querySelector(".verdict"), up = path.length > 1 && gf(path[1]) > gf(path[0]);
      if (mode === "pure" && status !== "converged") {
        vd.className = "verdict bad";
        vd.textContent = "Pure Newton never settles. Far from the minimum f is almost linear, f″ is small, so the step −f′/f″ is huge and overshoots to the other side, where the same happens again." + (up ? " Already the first step increases f: with step size 1, Newton is not a descent method." : "");
      } else if (mode === "pure") {
        vd.className = "verdict good";
        vd.textContent = "Close enough to the minimum, pure Newton converges in a handful of steps, and |f′| collapses at a quadratic rate. Now move the start beyond about ±1.25.";
      } else {
        vd.className = "verdict good";
        vd.textContent = "Two phases, as in the theorem. While |f′(xₖ)| ≥ η, the step is α = m/M and each step lowers f by at least γ = mη²/(2M²). Once |f′(xₖ)| < η, full steps take over and |f′| drops quadratically.";
      }
    }
    compute();
    P.responsive(cf, function () { draw(); });
  }

  var REG = { "newton-views": views, "newton-vs-gd": compare, "newton-global": global };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
