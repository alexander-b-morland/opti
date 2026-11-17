/* Opti, class 16: dynamic programming widgets */
(function () {
  "use strict";
  var P = window.Plot;
  function body(w) { return w.querySelector(".widget-body"); }

  /* ---------------- Knapsack table, filled cell by cell ---------------- */
  var ITEMS = [{ c: 6, w: 2 }, { c: 10, w: 3 }, { c: 12, w: 4 }, { c: 7, w: 2 }];
  var CAPK = 7;
  function knapsack(w) {
    var b = body(w);
    var n = ITEMS.length;
    b.innerHTML =
      '<div class="table-wrap"><table class="compare kn-items" style="max-width:420px"><thead><tr><th>Item j</th>' + ITEMS.map(function (_, j) { return "<th>" + (j + 1) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      "<tr><td>value cⱼ</td>" + ITEMS.map(function (it) { return "<td>" + it.c + "</td>"; }).join("") + "</tr>" +
      "<tr><td>weight wⱼ</td>" + ITEMS.map(function (it) { return "<td>" + it.w + "</td>"; }).join("") + "</tr></tbody></table></div>" +
      '<div class="table-wrap"><table class="dp-grid"><thead><tr><th>Cᵢ(κ)</th>' +
      Array.from({ length: CAPK + 1 }, function (_, k) { return "<th>κ=" + k + "</th>"; }).join("") + "</tr></thead><tbody>" +
      Array.from({ length: n }, function (_, i) { return '<tr><th>i=' + (i + 1) + "</th>" + Array.from({ length: CAPK + 1 }, function (_, k) { return '<td data-i="' + i + '" data-k="' + k + '"></td>'; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>" +
      '<div class="controls"><button type="button" class="btn step">Fill next cell</button><button type="button" class="btn ghost row">Fill row</button><button type="button" class="btn ghost all">Fill all</button><button type="button" class="btn ghost reset">Reset</button></div>' +
      '<div class="verdict stepper-text"></div>';
    var C = [], filled = 0, total = n * (CAPK + 1);
    for (var i = 0; i < n; i++) { C.push([]); for (var k = 0; k <= CAPK; k++) C[i].push(null); }
    function val(i, k) {
      var it = ITEMS[i];
      if (i === 0) return k >= it.w ? it.c : 0;
      var skip = C[i - 1][k], take = k >= it.w ? it.c + C[i - 1][k - it.w] : -Infinity;
      return Math.max(skip, take);
    }
    function cell(i, k) { return b.querySelector('td[data-i="' + i + '"][data-k="' + k + '"]'); }
    function explain(i, k) {
      var it = ITEMS[i];
      if (i === 0) return "C₁(" + k + "): only item 1 is available. " + (k >= it.w ? "It fits (weight " + it.w + " ≤ " + k + "), so take it: value " + it.c + "." : "It does not fit (weight " + it.w + " > " + k + "): value 0.");
      var skip = C[i - 1][k];
      if (k < it.w) return "C" + sub(i + 1) + "(" + k + "): item " + (i + 1) + " (weight " + it.w + ") does not fit, so copy the cell above: C" + sub(i) + "(" + k + ") = " + skip + ".";
      var take = it.c + C[i - 1][k - it.w];
      return "C" + sub(i + 1) + "(" + k + ") = max{ skip: C" + sub(i) + "(" + k + ") = " + skip + ",  take: " + it.c + " + C" + sub(i) + "(" + (k - it.w) + ") = " + take + " } = " + Math.max(skip, take) + (take > skip ? ". Taking item " + (i + 1) + " wins." : take === skip ? ". A tie." : ". Skipping wins.");
    }
    function sub(x) { return String(x).replace(/\d/g, function (d) { return "₀₁₂₃₄₅₆₇₈₉"[d]; }); }
    function render(lastI, lastK) {
      b.querySelectorAll("td[data-i]").forEach(function (td) { td.className = ""; });
      for (var i = 0; i < n; i++) for (var k = 0; k <= CAPK; k++) { var td = cell(i, k); td.textContent = C[i][k] === null ? "" : C[i][k]; }
      if (lastI != null) {
        cell(lastI, lastK).className = "cur";
        if (lastI > 0) { cell(lastI - 1, lastK).className = "dep"; if (lastK >= ITEMS[lastI].w) cell(lastI - 1, lastK - ITEMS[lastI].w).className = "dep2"; }
      }
      var vd = b.querySelector(".verdict");
      if (filled === total) {
        // trace back the optimal set
        var kk = CAPK, chosen = [];
        for (var j = n - 1; j >= 0; j--) {
          var prev = j === 0 ? 0 : C[j - 1][kk];
          if (C[j][kk] !== prev) { chosen.push(j + 1); kk -= ITEMS[j].w; }
        }
        vd.className = "verdict good stepper-text";
        vd.textContent = "Done. The answer is C" + sub(n) + "(" + CAPK + ") = " + C[n - 1][CAPK] + ". Tracing back where the value changed gives items {" + chosen.reverse().join(", ") + "}. " + n * (CAPK + 1) + " cells instead of 2ⁿ = " + Math.pow(2, n) + " subsets here, and the gap explodes for larger n.";
      } else if (lastI == null) {
        vd.className = "verdict stepper-text"; vd.textContent = "Each cell Cᵢ(κ) is the best value using only the first i items with capacity κ. Each one needs only two cells from the row above.";
      } else { vd.className = "verdict stepper-text"; vd.textContent = explain(lastI, lastK); }
    }
    function step() {
      if (filled >= total) return null;
      var i = Math.floor(filled / (CAPK + 1)), k = filled % (CAPK + 1);
      C[i][k] = val(i, k); filled++;
      return [i, k];
    }
    b.querySelector(".step").addEventListener("click", function () { var p = step(); if (p) render(p[0], p[1]); });
    b.querySelector(".row").addEventListener("click", function () { var p, q; do { q = step(); if (q) p = q; } while (q && filled % (CAPK + 1) !== 0); if (p) render(p[0], p[1]); });
    b.querySelector(".all").addEventListener("click", function () { var p, q; while ((q = step())) p = q; render(p ? p[0] : null, p ? p[1] : null); });
    b.querySelector(".reset").addEventListener("click", function () { for (var i = 0; i < n; i++) for (var k = 0; k <= CAPK; k++) C[i][k] = null; filled = 0; render(null); });
    render(null);
  }

  /* ---------------- Inventory control by backward induction ---------------- */
  function inventory(w) {
    var N = 12, XMAX = 30, D = [], prices = { p: 5, c: 2, F: 12, h: 0.5 };
    for (var d = 4; d <= 16; d++) D.push(d); // uniform demand 4..16
    var b = body(w);
    b.innerHTML = '<div class="controls">' +
      '<label>Month k <input type="range" class="mo" min="1" max="12" step="1" value="1"><output class="moo"></output></label>' +
      '<label>Fixed order cost F <input type="range" class="F" min="0" max="40" step="1" value="12"><output class="Fo"></output></label></div>' +
      '<canvas aria-label="Optimal order quantity as a function of current inventory"></canvas>' +
      '<div class="stats"><div><b>reorder point sₖ</b><span class="sk"></span></div><div><b>order-up-to level Sₖ</b><span class="Sk"></span></div><div><b>expected profit from month 1, empty</b><span class="j0"></span></div></div>' +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">Price 5, unit cost 2, holding cost 0.5 per unit at the start of each month, demand uniform on 4 to 16, no backlog, inventory capped at 30. Solved exactly by backward induction over 12 months.</p>';
    var mo = b.querySelector(".mo"), Fs = b.querySelector(".F"), canvas = b.querySelector("canvas");
    var policy, J0;
    function solve() {
      var F = parseFloat(Fs.value), J = new Array(XMAX + 1), next = new Array(XMAX + 1);
      for (var x = 0; x <= XMAX; x++) next[x] = -prices.h * x; // terminal
      policy = [];
      for (var k = N - 1; k >= 0; k--) {
        var pol = new Array(XMAX + 1);
        for (x = 0; x <= XMAX; x++) {
          var best = -Infinity, bu = 0;
          for (var u = 0; x + u <= XMAX; u++) {
            var ev = 0;
            for (var di = 0; di < D.length; di++) {
              var dd = D[di], sold = Math.min(dd, x + u), xn = Math.max(x + u - dd, 0);
              ev += prices.p * sold + next[xn];
            }
            ev = ev / D.length - prices.h * x - (u > 0 ? F + prices.c * u : 0);
            if (ev > best + 1e-9) { best = ev; bu = u; }
          }
          J[x] = best; pol[x] = bu;
        }
        policy[k] = pol; next = J.slice();
      }
      J0 = next[0];
    }
    function draw() {
      var k = parseInt(mo.value, 10) - 1, pol = policy[k];
      b.querySelector(".moo").textContent = k + 1;
      b.querySelector(".Fo").textContent = Fs.value;
      var s = P.setup(canvas, 0.42), pal = P.palette(), ctx = s.ctx;
      var ymax = 32, v = new P.View(s.w, s.h, -1.5, XMAX + 1, -2.5, ymax, 0);
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      for (var gx = 0; gx <= XMAX; gx += 5) { P.line(ctx, v.px(gx), v.py(0), v.px(gx), v.py(ymax)); P.text(ctx, String(gx), v.px(gx), s.h - 8, pal.ink3, 11, "center"); }
      for (var gy = 0; gy <= 30; gy += 10) { P.line(ctx, v.px(0), v.py(gy), v.px(XMAX), v.py(gy)); P.text(ctx, String(gy), v.px(-0.6), v.py(gy), pal.ink3, 11, "right"); }
      var bw = (v.px(1) - v.px(0)) * 0.7;
      for (var x = 0; x <= XMAX; x++) {
        if (pol[x] <= 0) continue;
        ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.85;
        ctx.fillRect(v.px(x) - bw / 2, v.py(pol[x]), bw, v.py(0) - v.py(pol[x])); ctx.globalAlpha = 1;
      }
      P.text(ctx, "inventory at the start of the month, xₖ", s.w - 10, s.h - 24, pal.ink3, 11, "right");
      P.text(ctx, "order uₖ", v.px(0.3), 12, pal.ink3, 11);
      var sk = 0; while (sk <= XMAX && pol[sk] > 0) sk++;
      var Sk = pol[0];
      b.querySelector(".sk").textContent = sk === 0 ? "never orders" : "order if xₖ < " + sk;
      b.querySelector(".Sk").textContent = sk === 0 ? "n/a" : String(Sk);
      b.querySelector(".j0").textContent = P.fmt(J0, 1);
    }
    mo.addEventListener("input", draw);
    Fs.addEventListener("input", function () { solve(); draw(); });
    solve();
    P.responsive(canvas, draw);
  }

  /* ---------------- Recruiting: hiring thresholds ---------------- */
  function recruiting(w) {
    var b = body(w);
    b.innerHTML = '<div class="controls"><label>Number of candidates n <input type="range" class="n" min="2" max="20" step="1" value="10"><output class="no"></output></label></div>' +
      '<canvas aria-label="Minimum score needed to be hired, by interview slot"></canvas>' +
      '<div class="verdict"></div>';
    var ns = b.querySelector(".n"), canvas = b.querySelector("canvas");
    ns.addEventListener("input", function () { draw(); });
    function thresholds(n) {
      // scores uniform on {0, ..., 100}. V_{n+1} = 0, V_k = E[max(s, V_{k+1})]. Hire candidate k iff score >= V_{k+1}.
      var V = new Array(n + 2); V[n + 1] = 0;
      for (var k = n; k >= 1; k--) {
        var e = 0; for (var sc = 0; sc <= 100; sc++) e += Math.max(sc, V[k + 1]); V[k] = e / 101;
      }
      var th = []; for (k = 1; k <= n; k++) th.push(V[k + 1]);
      return { th: th, value: V[1] };
    }
    function draw() {
      var n = parseInt(ns.value, 10), r = thresholds(n);
      b.querySelector(".no").textContent = n;
      var s = P.setup(canvas, 0.42), pal = P.palette(), ctx = s.ctx, padL = 36, padB = 26;
      var px = function (k) { return padL + (k - 0.5) / n * (s.w - padL - 10); };
      var py = function (y) { return s.h - padB - y / 100 * (s.h - padB - 12); };
      P.clear(ctx, s.w, s.h, pal.bg);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      [0, 25, 50, 75, 100].forEach(function (t) { P.line(ctx, padL, py(t), s.w - 10, py(t)); P.text(ctx, String(t), padL - 6, py(t), pal.ink3, 11, "right"); });
      var bw = (s.w - padL - 10) / n * 0.62;
      r.th.forEach(function (t, i) {
        ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.85; ctx.fillRect(px(i + 1) - bw / 2, py(t), bw, py(0) - py(t)); ctx.globalAlpha = 1;
        if (n <= 12) P.text(ctx, Math.ceil(t - 1e-9).toString(), px(i + 1), py(t) - 9, pal.ink2, 11, "center");
        if (n <= 12 || (i + 1) % 2 === 1) P.text(ctx, String(i + 1), px(i + 1), s.h - 9, pal.ink3, 11, "center");
      });
      var vd = b.querySelector(".verdict"); vd.className = "verdict";
      vd.textContent = "Hire candidate k if their score is at least the bar for slot k, which equals E[Jₖ₊₁], the expected value of continuing. The bar falls over time and is 0 for the last candidate. Expected score of the hire with the optimal policy: " + r.value.toFixed(1) + ".";
    }
    P.responsive(canvas, draw);
  }

  var REG = { knapsack: knapsack, inventory: inventory, recruiting: recruiting };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
