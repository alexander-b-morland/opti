/* Opti, class 15: two-stage stochastic optimization and Benders decomposition */
(function () {
  "use strict";
  var P = window.Plot;
  function body(w) { return w.querySelector(".widget-body"); }

  /* A one-facility example.
     First stage: build capacity x (cost c per unit).
     Second stage: demand d_s is revealed; unmet demand costs u per unit. */
  var EX = { c: 1, d: [40, 100, 160], p: [0.35, 0.3, 0.35], xmax: 200 };
  function Q(x, u) { var q = 0; for (var s = 0; s < EX.d.length; s++) q += EX.p[s] * u * Math.max(EX.d[s] - x, 0); return q; }
  function slopeQ(x, u) { var g = 0; for (var s = 0; s < EX.d.length; s++) if (EX.d[s] > x) g -= EX.p[s] * u; return g; }
  function total(x, u) { return EX.c * x + Q(x, u); }
  function best(u) {
    // piecewise linear convex: the optimum is at a breakpoint (0 or a demand level)
    var cands = [0].concat(EX.d), b = null;
    cands.forEach(function (x) { var v = total(x, u); if (!b || v < b.v - 1e-12) b = { x: x, v: v }; });
    return b;
  }
  function meanD() { var m = 0; for (var s = 0; s < EX.d.length; s++) m += EX.p[s] * EX.d[s]; return m; }

  function twoStage(w) {
    var b = body(w);
    b.innerHTML = '<div class="controls">' +
      '<label>Capacity built now, x <input type="range" class="x" min="0" max="200" step="1" value="100"><output class="xo"></output></label>' +
      '<label>Shortage cost u per unit <input type="range" class="u" min="1.2" max="6" step="0.1" value="4"><output class="uo"></output></label></div>' +
      '<canvas aria-label="Expected total cost as a function of the first-stage capacity"></canvas>' +
      '<div class="stats"><div><b>build cost c·x</b><span class="bc"></span></div><div><b>expected shortage cost Q(x)</b><span class="qc"></span></div><div><b>expected total</b><span class="tc"></span></div></div>' +
      '<div class="table-wrap"><table class="compare" style="margin-top:14px"><thead><tr><th>Approach</th><th>Capacity</th><th>Expected cost</th></tr></thead><tbody class="tb"></tbody></table></div>' +
      '<div class="verdict"></div>';
    var xs = b.querySelector(".x"), us = b.querySelector(".u"), canvas = b.querySelector("canvas");
    [xs, us].forEach(function (s) { s.addEventListener("input", function () { draw(); }); });
    function draw() {
      var x = parseFloat(xs.value), u = parseFloat(us.value);
      b.querySelector(".xo").textContent = x;
      b.querySelector(".uo").textContent = u.toFixed(1);
      var s = P.setup(canvas, 0.45), pal = P.palette(), ctx = s.ctx;
      var ymax = Math.max(total(0, u), total(200, u)) * 1.05;
      var v = new P.View(s.w, s.h, -8, 208, -ymax * 0.08, ymax, 0);
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      for (var gx = 0; gx <= 200; gx += 40) { P.line(ctx, v.px(gx), v.py(0), v.px(gx), v.py(ymax)); P.text(ctx, String(gx), v.px(gx), s.h - 8, pal.ink3, 11, "center"); }
      ctx.strokeStyle = pal.ink3; P.line(ctx, v.px(-8), v.py(0), v.px(208), v.py(0));
      // demand scenarios as ticks
      EX.d.forEach(function (d, i) {
        ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = pal.ink3; P.line(ctx, v.px(d), v.py(0), v.px(d), v.py(ymax)); ctx.restore();
        P.text(ctx, "d = " + d + " (p = " + EX.p[i] + ")", v.px(d) + 4, 12 + 14 * i, pal.ink3, 11);
      });
      P.curve(ctx, v, function (z) { return EX.c * z; }, pal.ink3, 1.4, [5, 4], 0, 200);
      P.curve(ctx, v, function (z) { return Q(z, u); }, pal.gold, 1.8, [5, 4], 0, 200);
      P.curve(ctx, v, function (z) { return total(z, u); }, pal.accent, 2.6, null, 0, 200);
      var opt = best(u), det = meanD();
      P.dot(ctx, v.px(opt.x), v.py(opt.v), 6, pal.accent, pal.bg);
      P.dot(ctx, v.px(det), v.py(total(det, u)), 5.5, pal.bg, pal.red);
      P.dot(ctx, v.px(x), v.py(total(x, u)), 5, pal.gold, pal.bg);
      ctx.save(); ctx.globalAlpha = 0.92; ctx.fillStyle = pal.bg; ctx.fillRect(s.w - 200, s.h - 92, 192, 64); ctx.restore();
      P.text(ctx, "expected total cost", s.w - 192, s.h - 80, pal.accent, 12);
      P.text(ctx, "build cost c·x", s.w - 192, s.h - 62, pal.ink3, 12);
      P.text(ctx, "recourse Q(x)", s.w - 192, s.h - 44, pal.gold, 12);
      b.querySelector(".bc").textContent = P.fmt(EX.c * x, 1);
      b.querySelector(".qc").textContent = P.fmt(Q(x, u), 1);
      b.querySelector(".tc").textContent = P.fmt(total(x, u), 1);
      var detCost = total(det, u), ws = 0;
      for (var k = 0; k < EX.d.length; k++) ws += EX.p[k] * EX.c * EX.d[k]; // perfect information: build exactly d_s
      b.querySelector(".tb").innerHTML =
        "<tr><td>Deterministic (plan for mean demand " + det + ")</td><td>" + det + "</td><td>" + P.fmt(detCost, 1) + "</td></tr>" +
        "<tr><td>Adaptive (two-stage stochastic)</td><td>" + opt.x + "</td><td>" + P.fmt(opt.v, 1) + "</td></tr>" +
        "<tr><td>Wait and see (perfect information)</td><td>dₛ in each scenario</td><td>" + P.fmt(ws, 1) + "</td></tr>";
      var vss = detCost - opt.v, evpi = opt.v - ws;
      var vd = b.querySelector(".verdict"); vd.className = "verdict";
      vd.textContent = "Value of the stochastic solution VSS = " + P.fmt(vss, 1) + " (deterministic minus adaptive). Expected value of perfect information EVPI = " + P.fmt(evpi, 1) + " (adaptive minus wait and see). The teal dot is the adaptive optimum, the red ring the deterministic plan.";
    }
    P.responsive(canvas, draw);
  }

  /* Benders decomposition on the same example: approximate Q(x) from below with cuts. */
  function benders(w) {
    var u = 4;
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Benders cuts approximating the recourse function"></canvas>' +
      '<div class="controls"><button type="button" class="btn next">Next iteration</button><button type="button" class="btn ghost reset">Restart</button></div>' +
      '<div class="stats"><div><b>iteration t</b><span class="it"></span></div><div><b>master xₜ</b><span class="xt"></span></div><div><b>lower bound</b><span class="lb"></span></div><div><b>upper bound</b><span class="ub"></span></div></div>' +
      '<div class="verdict"></div>';
    var canvas = b.querySelector("canvas"), cuts, t, xt, theta, ubBest, done, lastQ;
    function master() {
      // min c x + theta, theta >= 0 and theta >= cut_k(x), x in [0, 200]
      var lines = [[0, 0]].concat(cuts); // theta >= a + g x
      var pts = [0, EX.xmax];
      for (var i = 0; i < lines.length; i++) for (var j = i + 1; j < lines.length; j++) {
        var dg = lines[i][1] - lines[j][1]; if (Math.abs(dg) < 1e-12) continue;
        var z = (lines[j][0] - lines[i][0]) / dg; if (z > 0 && z < EX.xmax) pts.push(z);
      }
      var bestv = null;
      pts.forEach(function (z) {
        var th = Math.max.apply(null, lines.map(function (L) { return L[0] + L[1] * z; }));
        var val = EX.c * z + th;
        if (!bestv || val < bestv.v - 1e-9) bestv = { x: z, th: th, v: val };
      });
      return bestv;
    }
    function reset() { cuts = []; t = 1; done = false; ubBest = Infinity; var m = master(); xt = m.x; theta = m.th; lastQ = Q(xt, u); ubBest = Math.min(ubBest, EX.c * xt + lastQ); draw(); }
    function next() {
      if (done) return;
      lastQ = Q(xt, u);
      if (lastQ <= theta + 1e-9) { done = true; draw(); return; }
      var g = slopeQ(xt, u);
      cuts.push([lastQ - g * xt, g]);
      t++;
      var m = master(); xt = m.x; theta = m.th; lastQ = Q(xt, u);
      ubBest = Math.min(ubBest, EX.c * xt + lastQ);
      if (lastQ <= theta + 1e-9) done = true;
      draw();
    }
    b.querySelector(".next").addEventListener("click", next);
    b.querySelector(".reset").addEventListener("click", reset);
    function draw() {
      var s = P.setup(canvas, 0.45), pal = P.palette(), ctx = s.ctx;
      var ymax = Q(0, u) * 1.08, v = new P.View(s.w, s.h, -8, 208, -ymax * 0.1, ymax, 0);
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      for (var gx = 0; gx <= 200; gx += 40) { P.line(ctx, v.px(gx), v.py(0), v.px(gx), v.py(ymax)); P.text(ctx, String(gx), v.px(gx), s.h - 8, pal.ink3, 11, "center"); }
      ctx.strokeStyle = pal.ink3; P.line(ctx, v.px(-8), v.py(0), v.px(208), v.py(0));
      P.curve(ctx, v, function (z) { return Q(z, u); }, pal.gold, 2.4, null, 0, 200);
      cuts.forEach(function (L, i) {
        ctx.save(); ctx.globalAlpha = 0.45 + 0.55 * (i + 1) / cuts.length;
        P.curve(ctx, v, function (z) { return L[0] + L[1] * z; }, pal.red, i === cuts.length - 1 ? 2 : 1.2, null, 0, 200); ctx.restore();
      });
      // current approximation max(0, cuts)
      P.curve(ctx, v, function (z) { var m = 0; cuts.forEach(function (L) { m = Math.max(m, L[0] + L[1] * z); }); return m; }, pal.accent, 2.2, [6, 3], 0, 200);
      P.dot(ctx, v.px(xt), v.py(theta), 5.5, pal.accent, pal.bg);
      P.dot(ctx, v.px(xt), v.py(Q(xt, u)), 5.5, pal.gold, pal.bg);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(s.w - 250, 8, 242, 50); ctx.restore();
      P.text(ctx, "true recourse Q(x)", s.w - 242, 20, pal.gold, 12);
      P.text(ctx, "Benders approximation (max of cuts, θ)", s.w - 242, 38, pal.accent, 12);
      var lb = EX.c * xt + theta;
      b.querySelector(".it").textContent = t;
      b.querySelector(".xt").textContent = P.fmt(xt, 2);
      b.querySelector(".lb").textContent = P.fmt(lb, 2);
      b.querySelector(".ub").textContent = P.fmt(ubBest, 2);
      var vd = b.querySelector(".verdict");
      if (done) { vd.className = "verdict good"; vd.textContent = "θ equals Q(xₜ): the approximation is exact at the master solution, the lower and upper bounds meet, and xₜ = " + P.fmt(xt, 1) + " is optimal."; }
      else if (!cuts.length) { vd.className = "verdict"; vd.textContent = "Iteration 1: no cuts yet, so the master thinks the future is free (θ = 0) and builds nothing. The subproblem will show that Q(0) is large."; }
      else { vd.className = "verdict warn"; vd.textContent = "A new cut from the dual of the subproblem at the previous x: the value of Q and its slope there. The master's estimate θ (teal dot) is still below the true Q (gold dot), so the gap is not closed."; }
    }
    reset();
    P.responsive(canvas, draw);
  }

  var REG = { "two-stage": twoStage, benders: benders };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
