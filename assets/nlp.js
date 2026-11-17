/* Opti, class 17: non-linear modeling widgets */
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
  function canvasPoint(canvas, v, e) {
    var r = canvas.getBoundingClientRect();
    return [v.ix(e.clientX - r.left), v.iy(e.clientY - r.top)];
  }

  /* ---------------- Fitting a line with three norms ---------------- */
  function fitL2(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    var a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return [a, (sy - a * sx) / n];
  }
  function median(arr) { var s = arr.slice().sort(function (a, b) { return a - b; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function bestOver(pts, interceptFor, loss) {
    var best = null;
    function tryA(a) { var b = interceptFor(pts, a), L = loss(pts, a, b); if (!best || L < best.L) best = { a: a, b: b, L: L }; }
    for (var a = -3; a <= 3; a += 0.005) tryA(a);
    var c = best.a; for (a = c - 0.01; a <= c + 0.01; a += 0.0001) tryA(a);
    return [best.a, best.b];
  }
  function fitL1(pts) {
    return bestOver(pts, function (ps, a) { return median(ps.map(function (p) { return p[1] - a * p[0]; })); },
      function (ps, a, b) { return ps.reduce(function (s, p) { return s + Math.abs(p[1] - a * p[0] - b); }, 0); });
  }
  function fitInf(pts) {
    return bestOver(pts, function (ps, a) { var r = ps.map(function (p) { return p[1] - a * p[0]; }); return (Math.max.apply(null, r) + Math.min.apply(null, r)) / 2; },
      function (ps, a, b) { return Math.max.apply(null, ps.map(function (p) { return Math.abs(p[1] - a * p[0] - b); })); });
  }
  function regression(w) {
    var pts = [[0.5, 1.1], [1.2, 1.6], [2, 2.3], [2.8, 2.6], [3.5, 3.3], [4.3, 3.7], [5, 4.6], [5.8, 4.9], [6.6, 5.7], [7.3, 6.2], [8, 2.2]];
    var b = body(w), drag = -1, v;
    b.innerHTML = '<canvas aria-label="Data points with three fitted lines. Drag a point to move it."></canvas>' +
      '<div class="controls"><label><input type="checkbox" class="s2" checked> Least squares (2-norm)</label><label><input type="checkbox" class="s1" checked> Absolute residuals (1-norm)</label><label><input type="checkbox" class="si" checked> Minimax (∞-norm)</label><button type="button" class="btn ghost reset">Reset points</button></div>' +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">Drag any point. The last point (bottom right) is an outlier. Watch which line it pulls.</p>';
    var canvas = b.querySelector("canvas"), orig = pts.map(function (p) { return p.slice(); });
    b.querySelectorAll("input").forEach(function (c) { c.addEventListener("change", function () { draw(); }); });
    b.querySelector(".reset").addEventListener("click", function () { pts = orig.map(function (p) { return p.slice(); }); draw(); });
    canvas.addEventListener("pointerdown", function (e) {
      var q = canvasPoint(canvas, v, e), bi = -1, bd = 0.35;
      pts.forEach(function (p, i) { var d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; } });
      drag = bi; if (drag >= 0) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) { if (drag < 0) return; var q = canvasPoint(canvas, v, e); pts[drag] = [Math.max(0, Math.min(8.5, q[0])), Math.max(0, Math.min(7.5, q[1]))]; draw(); });
    canvas.addEventListener("pointerup", function () { drag = -1; });
    function draw() {
      var s = P.setup(canvas, 0.55), pal = P.palette(), ctx = s.ctx;
      v = new P.View(s.w, s.h, -0.3, 8.8, -0.3, 7.6, 0);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 1, gy: 1 });
      var lines = [];
      if (b.querySelector(".s2").checked) lines.push([fitL2(pts), pal.accent, "2-norm"]);
      if (b.querySelector(".s1").checked) lines.push([fitL1(pts), pal.gold, "1-norm"]);
      if (b.querySelector(".si").checked) lines.push([fitInf(pts), pal.red, "∞-norm"]);
      lines.forEach(function (L) { var a = L[0][0], c = L[0][1]; P.curve(ctx, v, function (x) { return a * x + c; }, L[1], 2.4); });
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(6, 6, 190, 8 + 18 * lines.length); ctx.restore();
      lines.forEach(function (L, i) {
        var a = L[0][0], c = L[0][1];
        P.text(ctx, L[2] + ": y = " + P.fmt(a, 2) + "x + " + P.fmt(c, 2), 12, 16 + 18 * i, L[1], 12);
      });
      pts.forEach(function (p, i) { P.dot(ctx, v.px(p[0]), v.py(p[1]), 5.5, i === pts.length - 1 ? pal.red : pal.ink, pal.bg); });
    }
    P.responsive(canvas, draw);
  }

  /* ---------------- Fermat-Weber versus ball circumscription ---------------- */
  function weiszfeld(pts) {
    var x = [0, 0]; pts.forEach(function (p) { x[0] += p[0] / pts.length; x[1] += p[1] / pts.length; });
    for (var it = 0; it < 500; it++) {
      var nx = 0, ny = 0, den = 0;
      for (var i = 0; i < pts.length; i++) { var d = Math.hypot(x[0] - pts[i][0], x[1] - pts[i][1]); if (d < 1e-9) return pts[i].slice(); nx += pts[i][0] / d; ny += pts[i][1] / d; den += 1 / d; }
      x = [nx / den, ny / den];
    }
    return x;
  }
  function circle2(a, b) { return { c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], r: Math.hypot(a[0] - b[0], a[1] - b[1]) / 2 }; }
  function circle3(a, b, c) {
    var d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-12) return null;
    var ux = ((a[0] * a[0] + a[1] * a[1]) * (b[1] - c[1]) + (b[0] * b[0] + b[1] * b[1]) * (c[1] - a[1]) + (c[0] * c[0] + c[1] * c[1]) * (a[1] - b[1])) / d;
    var uy = ((a[0] * a[0] + a[1] * a[1]) * (c[0] - b[0]) + (b[0] * b[0] + b[1] * b[1]) * (a[0] - c[0]) + (c[0] * c[0] + c[1] * c[1]) * (b[0] - a[0])) / d;
    return { c: [ux, uy], r: Math.hypot(a[0] - ux, a[1] - uy) };
  }
  function enclosing(pts) {
    function covers(C) { return pts.every(function (p) { return Math.hypot(p[0] - C.c[0], p[1] - C.c[1]) <= C.r + 1e-7; }); }
    var best = null, i, j, k, C;
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) { C = circle2(pts[i], pts[j]); if (covers(C) && (!best || C.r < best.r)) best = C; }
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) for (k = j + 1; k < pts.length; k++) { C = circle3(pts[i], pts[j], pts[k]); if (C && covers(C) && (!best || C.r < best.r)) best = C; }
    return best || { c: pts[0].slice(), r: 0 };
  }
  function location(w) {
    var pts = [[1.2, 1.5], [2.0, 3.6], [3.1, 2.2], [2.6, 1.0], [3.6, 3.4], [1.6, 2.6], [7.2, 4.6]];
    var b = body(w), v, drag = -1;
    b.innerHTML = '<canvas aria-label="Demand points with the Fermat-Weber point and the smallest enclosing circle. Drag points, click empty space to add one."></canvas>' +
      '<div class="controls"><button type="button" class="btn ghost reset">Reset</button></div>' +
      '<div class="stats"><div><b>Fermat-Weber: total distance</b><span class="fw"></span></div><div><b>Ball: maximum distance</b><span class="bc"></span></div></div>' +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">Teal: minimizes the sum of distances (the geometric median). Gold: minimizes the largest distance (the center of the smallest circle containing every point). Drag a point, or click empty space to add one.</p>';
    var canvas = b.querySelector("canvas"), orig = pts.map(function (p) { return p.slice(); });
    b.querySelector(".reset").addEventListener("click", function () { pts = orig.map(function (p) { return p.slice(); }); draw(); });
    canvas.addEventListener("pointerdown", function (e) {
      var q = canvasPoint(canvas, v, e), bi = -1, bd = 0.3;
      pts.forEach(function (p, i) { var d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; } });
      if (bi < 0) { if (pts.length < 14) { pts.push(q); draw(); } return; }
      drag = bi; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) { if (drag < 0) return; pts[drag] = canvasPoint(canvas, v, e); draw(); });
    canvas.addEventListener("pointerup", function () { drag = -1; });
    function draw() {
      var s = P.setup(canvas, 0.55), pal = P.palette(), ctx = s.ctx;
      var span = 10.5; v = new P.View(s.w, s.h, -1, span - 1, -1.6, -1.6 + span * s.h / s.w, 0);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 1, gy: 1 });
      var fw = weiszfeld(pts), C = enclosing(pts);
      ctx.save(); ctx.strokeStyle = pal.gold; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath();
      ctx.arc(v.px(C.c[0]), v.py(C.c[1]), v.px(C.c[0] + C.r) - v.px(C.c[0]), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.35;
      pts.forEach(function (p) { P.line(ctx, v.px(fw[0]), v.py(fw[1]), v.px(p[0]), v.py(p[1])); }); ctx.restore();
      pts.forEach(function (p) { P.dot(ctx, v.px(p[0]), v.py(p[1]), 5, pal.ink, pal.bg); });
      P.dot(ctx, v.px(fw[0]), v.py(fw[1]), 7, pal.accent, pal.bg);
      P.dot(ctx, v.px(C.c[0]), v.py(C.c[1]), 7, pal.gold, pal.bg);
      var tot = pts.reduce(function (sum, p) { return sum + Math.hypot(p[0] - fw[0], p[1] - fw[1]); }, 0);
      b.querySelector(".fw").textContent = P.fmt(tot, 2);
      b.querySelector(".bc").textContent = P.fmt(C.r, 2);
    }
    P.responsive(canvas, draw);
  }

  /* ---------------- Convexity checker ---------------- */
  var CF = {
    sq: { f: function (x) { return 0.5 * x * x; }, df: function (x) { return x; }, name: "½x²", convex: true },
    abs: { f: function (x) { return Math.abs(x) + 0.5; }, df: function (x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }, name: "|x| + ½", convex: true },
    exp: { f: function (x) { return Math.exp(0.8 * x) - 0.5; }, df: function (x) { return 0.8 * Math.exp(0.8 * x); }, name: "e^(0.8x)", convex: true },
    sin: { f: function (x) { return 1.2 * Math.sin(1.4 * x) + 1.5; }, df: function (x) { return 1.68 * Math.cos(1.4 * x); }, name: "1.2 sin(1.4x)", convex: false },
    log: { f: function (x) { return x > -2.4 ? Math.log(x + 2.5) : NaN; }, df: function (x) { return 1 / (x + 2.5); }, name: "log(x + 2.5)", convex: false, concave: true },
    cube: { f: function (x) { return 0.25 * x * x * x + 1; }, df: function (x) { return 0.75 * x * x; }, name: "¼x³ + 1", convex: false }
  };
  function convexity(w) {
    var cur = "sq";
    var b = body(w);
    b.innerHTML = '<canvas aria-label="A function with a chord and a tangent line"></canvas>' +
      '<div class="controls">' + seg(Object.keys(CF).map(function (k) { return [k, CF[k].name]; }), cur) + "</div>" +
      '<div class="controls"><label>x <input type="range" class="xa" min="-2.2" max="2.2" step="0.05" value="-1.6"><output class="xao"></output></label>' +
      '<label>y <input type="range" class="ya" min="-2.2" max="2.2" step="0.05" value="1.4"><output class="yao"></output></label>' +
      '<label>tangent at <input type="range" class="ta" min="-2.2" max="2.2" step="0.05" value="0.3"><output class="tao"></output></label></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas");
    bindSeg(b.querySelector(".seg"), function (k) { cur = k; draw(); });
    b.querySelectorAll("input").forEach(function (i) { i.addEventListener("input", function () { draw(); }); });
    function draw() {
      var F = CF[cur], xa = parseFloat(b.querySelector(".xa").value), ya = parseFloat(b.querySelector(".ya").value), ta = parseFloat(b.querySelector(".ta").value);
      b.querySelector(".xao").textContent = xa.toFixed(2); b.querySelector(".yao").textContent = ya.toFixed(2); b.querySelector(".tao").textContent = ta.toFixed(2);
      var s = P.setup(canvas, 0.5), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -2.5, 2.5, -0.6, 4.2, 10);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 0.5, gy: 0.5 });
      // chord
      var chordAbove = true, tangentBelow = true;
      for (var i = 1; i < 100; i++) {
        var l = i / 100, z = l * xa + (1 - l) * ya, fz = F.f(z), ch = l * F.f(xa) + (1 - l) * F.f(ya);
        if (fz > ch + 1e-9) chordAbove = false;
      }
      for (i = 0; i <= 200; i++) { var x = -2.4 + 4.8 * i / 200, fx = F.f(x); if (isFinite(fx) && fx < F.f(ta) + F.df(ta) * (x - ta) - 1e-9) tangentBelow = false; }
      ctx.save(); ctx.strokeStyle = chordAbove ? pal.accent2 : pal.red; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      P.line(ctx, v.px(xa), v.py(F.f(xa)), v.px(ya), v.py(F.f(ya))); ctx.restore();
      P.curve(ctx, v, function (x) { return F.f(ta) + F.df(ta) * (x - ta); }, tangentBelow ? pal.ink3 : pal.gold, 1.4, [3, 3]);
      P.curve(ctx, v, F.f, pal.accent, 2.8);
      P.dot(ctx, v.px(xa), v.py(F.f(xa)), 5, pal.bg, pal.ink); P.dot(ctx, v.px(ya), v.py(F.f(ya)), 5, pal.bg, pal.ink);
      P.dot(ctx, v.px(ta), v.py(F.f(ta)), 4.5, pal.gold, pal.bg);
      P.text(ctx, "chord between x and y (dashed)", 14, 14, chordAbove ? pal.accent2 : pal.red, 12);
      P.text(ctx, "tangent line (dotted)", 14, 32, tangentBelow ? pal.ink3 : pal.gold, 12);
      var vd = b.querySelector(".verdict");
      var msg = "Chord " + (chordAbove ? "lies above the graph" : "dips below the graph somewhere") + " for this pair, and the tangent " + (tangentBelow ? "stays below the graph everywhere." : "crosses above the graph somewhere.") + " ";
      msg += F.convex ? "This function is convex: every chord lies above it, every tangent below it." : F.concave ? "This function is concave (−f is convex), so it is not convex: chords lie below it." : "This function is neither convex nor concave. Find a pair x, y whose chord dips below it.";
      vd.className = "verdict " + (F.convex ? "good" : "bad"); vd.textContent = msg;
    }
    P.responsive(canvas, draw);
  }

  var REG = { regression: regression, location: location, convexity: convexity };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
