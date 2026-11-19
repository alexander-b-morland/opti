/* Opti, class 19: stochastic gradient descent widgets */
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
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- a small regression dataset: y = 4 + 1.5 t + noise, t centred on 0 ---------- */
  function makeData(n, seed) {
    var r = rng(seed), pts = [];
    for (var i = 0; i < n; i++) {
      var t = 4 * (i + r()) / n - 2;
      var u = r() || 1e-9, v = r(), z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      pts.push([t, 4 + 1.5 * t + 0.9 * z]);
    }
    return pts;
  }
  function lsq(pts) {
    var n = pts.length, st = 0, sy = 0, stt = 0, sty = 0;
    pts.forEach(function (p) { st += p[0]; sy += p[1]; stt += p[0] * p[0]; sty += p[0] * p[1]; });
    var b = (n * sty - st * sy) / (n * stt - st * st); return [(sy - b * st) / n, b]; // [intercept, slope]
  }
  // f(x) = (1/n) sum 1/2 (a + b t_i - y_i)^2, with x = (a, b)
  function F(pts, a, b) { var s = 0; for (var i = 0; i < pts.length; i++) { var r = a + b * pts[i][0] - pts[i][1]; s += 0.5 * r * r; } return s / pts.length; }
  function gradIdx(pts, a, b, idx) {
    var ga = 0, gb = 0;
    for (var k = 0; k < idx.length; k++) { var p = pts[idx[k]], r = a + b * p[0] - p[1]; ga += r; gb += r * p[0]; }
    return [ga / idx.length, gb / idx.length];
  }

  /* ---------- 1. Playground: GD, SGD and mini-batches on the same problem ---------- */
  function playground(w) {
    var N = 40, seed = 7, pts = makeData(N, 3), xs = lsq(pts), zs = F(pts, xs[0], xs[1]);
    var BS = [1, 2, 5, 10, 20, 40];
    var B = parseInt(w.getAttribute("data-batch") || "1", 10), rule = "const", K = 300, xaxis = "iter";
    var b = body(w), layer = null, layerKey = "", view;
    b.innerHTML = '<canvas class="cv" aria-label="Contour plot of the regression loss with iterates"></canvas>' +
      '<div class="controls"><label>Batch size B <input type="range" class="bs" min="0" max="5" step="1"><output class="bso"></output></label>' +
      seg([["const", "Constant step"], ["sqrt", "α/√(k+1)"], ["inv", "α/(k+1)"]], rule) + "</div>" +
      '<div class="controls"><label>Step size α <input type="range" class="al" min="-2.3" max="-0.6" step="0.01" value="-1"><output class="alo"></output></label>' +
      '<button type="button" class="btn rs">New random draws</button></div>' +
      '<canvas class="lc" aria-label="Optimality gap versus iterations" style="margin-top:12px"></canvas>' +
      '<div class="controls">' + seg([["iter", "x-axis: iterations"], ["work", "x-axis: gradient evaluations"]], "iter").replace('class="seg"', 'class="seg xa"') + "</div>" +
      '<div class="stats"><div><b>final gap f(xₖ) − z*</b><span class="fg"></span></div><div><b>best gap visited</b><span class="bg"></span></div><div><b>gradient evaluations</b><span class="ge"></span></div></div>' +
      '<p class="muted" style="font-family:var(--sans);font-size:14px;margin:10px 0 0">40 data points, fit y ≈ a + b·t by least squares. B = 1 is stochastic gradient descent, B = 40 is gradient descent. Grey curve in the lower chart: gradient descent with the same step, for reference.</p>';
    var cv = b.querySelector(".cv"), lc = b.querySelector(".lc"), bs = b.querySelector(".bs"), al = b.querySelector(".al");
    bs.value = BS.indexOf(B) >= 0 ? BS.indexOf(B) : 0;
    bindSeg(b.querySelectorAll(".seg")[0], function (v) { rule = v; draw(); });
    bindSeg(b.querySelector(".seg.xa"), function (v) { xaxis = v; draw(); });
    bs.addEventListener("input", function () { draw(); });
    al.addEventListener("input", function () { draw(); });
    b.querySelector(".rs").addEventListener("click", function () { seed = Math.floor(Math.random() * 1e9); draw(); });
    function run(Bsz, alpha, rl, sd) {
      var r = rng(sd), a = xs[0] - 3.2, bb = xs[1] + 1.6, path = [[a, bb]], idxAll = [];
      for (var i = 0; i < N; i++) idxAll.push(i);
      for (var k = 0; k < K; k++) {
        var idx;
        if (Bsz >= N) idx = idxAll;
        else { // sample B indices without replacement
          var pool = idxAll.slice(); idx = [];
          for (var j = 0; j < Bsz; j++) { var q = j + Math.floor(r() * (N - j)); var t = pool[j]; pool[j] = pool[q]; pool[q] = t; idx.push(pool[j]); }
        }
        var g = gradIdx(pts, a, bb, idx);
        var st = rl === "const" ? alpha : rl === "sqrt" ? alpha / Math.sqrt(k + 1) : alpha / (k + 1);
        a -= st * g[0]; bb -= st * g[1];
        if (!isFinite(a) || Math.abs(a) > 1e6) { path.push([NaN, NaN]); break; }
        path.push([a, bb]);
      }
      return path;
    }
    function draw(resized) {
      B = BS[parseInt(bs.value, 10)];
      var alpha = Math.pow(10, parseFloat(al.value));
      b.querySelector(".bso").textContent = B + (B === 1 ? " (SGD)" : B === N ? " (GD)" : " (mini-batch)");
      b.querySelector(".alo").textContent = P.fmt(alpha, 3);
      var path = run(B, alpha, rule, seed), gd = run(N, alpha, rule, seed);
      // contour panel
      var s = P.setup(cv, 0.5), pal = P.palette(), ctx = s.ctx;
      var hx = 4.2, hy = hx * 0.5;
      view = new P.View(s.w, s.h, xs[0] - hx, xs[0] + hx, xs[1] - hy, xs[1] + hy, 0);
      var key = s.w + "|" + pal.accent + "|" + document.documentElement.getAttribute("data-theme");
      if (!layer || key !== layerKey || resized) { layer = P.contourLayer(s.w, s.h, s.dpr, view, function (a, c) { return F(pts, a, c); }, pal, { nx: 140, levels: 16 }); layerKey = key; }
      ctx.drawImage(layer, 0, 0, s.w, s.h);
      ctx.save(); ctx.strokeStyle = pal.ink3; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.beginPath();
      gd.forEach(function (p, i) { if (!isFinite(p[0])) return; var X = view.px(p[0]), Y = view.py(p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = pal.gold; ctx.lineWidth = 1.5; ctx.beginPath();
      path.forEach(function (p, i) { if (!isFinite(p[0])) return; var X = Math.max(-1e4, Math.min(1e4, view.px(p[0]))), Y = Math.max(-1e4, Math.min(1e4, view.py(p[1]))); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.restore();
      var sx = view.px(xs[0]), sy = view.py(xs[1]);
      ctx.save(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; P.line(ctx, sx - 6, sy - 6, sx + 6, sy + 6); P.line(ctx, sx - 6, sy + 6, sx + 6, sy - 6); ctx.restore();
      P.dot(ctx, view.px(path[0][0]), view.py(path[0][1]), 5, pal.bg, pal.ink);
      var last = path[path.length - 1];
      if (isFinite(last[0])) P.dot(ctx, view.px(last[0]), view.py(last[1]), 5, pal.gold, pal.bg);
      P.text(ctx, "intercept a →", s.w - 10, s.h - 10, pal.ink3, 11, "right");
      P.text(ctx, "slope b ↑", 10, 12, pal.ink3, 11);
      // loss chart
      var s2 = P.setup(lc, 0.36), ctx2 = s2.ctx, padL = 46, padB = 24;
      var gaps = path.map(function (p) { return isFinite(p[0]) ? F(pts, p[0], p[1]) - zs : Infinity; });
      var ggaps = gd.map(function (p) { return isFinite(p[0]) ? F(pts, p[0], p[1]) - zs : Infinity; });
      var maxX = xaxis === "iter" ? K : K * N;
      var px = function (x) { return padL + x / maxX * (s2.w - padL - 12); };
      var py = function (g) { var L = Math.log10(Math.max(g, 1e-6)); return s2.h - padB - (L + 6) / 8 * (s2.h - padB - 10); };
      P.clear(ctx2, s2.w, s2.h, pal.bg);
      ctx2.strokeStyle = pal.grid; ctx2.lineWidth = 1;
      [100, 1, 1e-2, 1e-4, 1e-6].forEach(function (t) { P.line(ctx2, padL, py(t), s2.w - 12, py(t)); P.text(ctx2, t >= 1 ? String(t) : "1e" + Math.round(Math.log10(t)), padL - 6, py(t), pal.ink3, 11, "right"); });
      [0, 0.5, 1].forEach(function (t) { P.text(ctx2, Math.round(t * maxX).toLocaleString("en-US"), px(t * maxX), s2.h - 8, pal.ink3, 11, t === 0 ? "left" : t === 1 ? "right" : "center"); });
      function plot(arr, cost, col, width) {
        ctx2.save(); ctx2.strokeStyle = col; ctx2.lineWidth = width; ctx2.beginPath(); var started = false;
        for (var i = 0; i < arr.length; i++) { var x = i * cost; if (x > maxX) break; if (!isFinite(arr[i])) break; var X = px(x), Y = Math.max(0, py(arr[i])); if (!started) { ctx2.moveTo(X, Y); started = true; } else ctx2.lineTo(X, Y); }
        ctx2.stroke(); ctx2.restore();
      }
      plot(ggaps, xaxis === "iter" ? 1 : N, pal.ink3, 1.4);
      plot(gaps, xaxis === "iter" ? 1 : B, pal.gold, 1.8);
      P.text(ctx2, "optimality gap f(xₖ) − z* (log scale)", padL + 6, 12, pal.ink3, 11);
      var finite = gaps.filter(isFinite);
      b.querySelector(".fg").textContent = isFinite(gaps[gaps.length - 1]) ? P.fmt(gaps[gaps.length - 1], 4) : "diverged";
      b.querySelector(".bg").textContent = finite.length ? P.fmt(Math.min.apply(null, finite), 4) : "n/a";
      b.querySelector(".ge").textContent = (K * B).toLocaleString("en-US") + " (GD: " + (K * N).toLocaleString("en-US") + ")";
    }
    P.responsive(cv, function (r) { draw(r); });
  }

  /* ---------- 2. One data point at a time: lucky and unlucky iterations ---------- */
  function lucky(w) {
    var pts = makeData(12, 11), xs = lsq(pts), cur, last = null, r = rng(5), lucky = 0, unlucky = 0;
    var b = body(w);
    b.innerHTML = '<canvas aria-label="Data, optimal fit and current fit"></canvas>' +
      '<div class="controls"><label>Learning rate η <input type="range" class="et" min="0.01" max="0.12" step="0.005" value="0.05"><output class="eto"></output></label>' +
      '<button type="button" class="btn st">Sample a point and update</button><button type="button" class="btn ghost rs">Reset</button></div>' +
      '<div class="stats"><div><b>full loss f(β)</b><span class="fl"></span></div><div><b>lucky steps</b><span class="lk"></span></div><div><b>unlucky steps</b><span class="uk"></span></div></div>' +
      '<div class="verdict stepper-text"></div>';
    var canvas = b.querySelector("canvas"), et = b.querySelector(".et");
    function reset() { cur = [xs[0] + 2.8, xs[1]]; last = null; lucky = 0; unlucky = 0; draw(); }
    b.querySelector(".rs").addEventListener("click", reset);
    et.addEventListener("input", function () { b.querySelector(".eto").textContent = et.value; });
    b.querySelector(".st").addEventListener("click", function () {
      var i = Math.floor(r() * pts.length), eta = parseFloat(et.value), before = F(pts, cur[0], cur[1]);
      var p = pts[i], res = p[1] - (cur[0] + cur[1] * p[0]);
      var prev = cur.slice();
      cur = [cur[0] + eta * res, cur[1] + eta * res * p[0]];
      var after = F(pts, cur[0], cur[1]);
      if (after < before) lucky++; else unlucky++;
      last = { i: i, res: res, before: before, after: after, prev: prev };
      draw();
    });
    function draw() {
      b.querySelector(".eto").textContent = et.value;
      var s = P.setup(canvas, 0.5), pal = P.palette(), ctx = s.ctx;
      var v = new P.View(s.w, s.h, -2.3, 2.3, -0.5, 9, 8);
      P.clear(ctx, s.w, s.h, pal.bg); P.axes(ctx, v, pal, { gx: 1, gy: 2 });
      P.curve(ctx, v, function (t) { return xs[0] + xs[1] * t; }, pal.ink3, 1.6, [6, 4]);
      if (last) P.curve(ctx, v, function (t) { return last.prev[0] + last.prev[1] * t; }, pal.gold, 1.2, [2, 3]);
      P.curve(ctx, v, function (t) { return cur[0] + cur[1] * t; }, pal.accent, 2.4);
      pts.forEach(function (p, i) {
        var chosen = last && last.i === i;
        if (chosen) { ctx.save(); ctx.strokeStyle = pal.red; ctx.lineWidth = 1.5; P.line(ctx, v.px(p[0]), v.py(p[1]), v.px(p[0]), v.py(last.prev[0] + last.prev[1] * p[0])); ctx.restore(); }
        P.dot(ctx, v.px(p[0]), v.py(p[1]), chosen ? 7 : 4.5, chosen ? pal.red : pal.ink, pal.bg);
      });
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = pal.bg; ctx.fillRect(8, 6, 170, 58); ctx.restore();
      P.text(ctx, "optimal fit", 14, 16, pal.ink3, 12);
      P.text(ctx, "current fit", 14, 34, pal.accent, 12);
      P.text(ctx, "fit before the last step", 14, 52, pal.gold, 12);
      b.querySelector(".fl").textContent = P.fmt(F(pts, cur[0], cur[1]), 4) + "  (optimum " + P.fmt(F(pts, xs[0], xs[1]), 4) + ")";
      b.querySelector(".lk").textContent = lucky;
      b.querySelector(".uk").textContent = unlucky;
      var vd = b.querySelector(".verdict");
      if (!last) { vd.className = "verdict stepper-text"; vd.textContent = "Each step looks at one random data point and nudges the line towards it. The full loss is computed here only to judge the step: SGD itself never evaluates it."; return; }
      var dir = last.res > 0 ? "above" : "below";
      var good = last.after < last.before;
      vd.className = "verdict " + (good ? "good" : "bad") + " stepper-text";
      vd.textContent = "The sampled point lies " + dir + " the line (residual " + P.fmt(last.res, 2) + "), so the line moved " + (last.res > 0 ? "up" : "down") + " towards it. The full loss went from " + P.fmt(last.before, 3) + " to " + P.fmt(last.after, 3) + ": " + (good ? "a lucky iteration." : "an unlucky iteration. The step helped this one point and hurt the average.");
    }
    reset();
    P.responsive(canvas, draw);
  }

  /* ---------- 3. The lecture's neural network: forward, backward, update ---------- */
  function network(w) {
    var X = [0.5, 0.8], Y = 1, W0 = { w13: 0.2, w23: 0.4, w14: 0.5, w24: 0.1, b3: 0.1, b4: 0.1, w35: 0.5, w45: 0.2, b5: 0.3 };
    var Wt, stage, fw, gr, steps;
    var b = body(w);
    b.innerHTML = '<canvas aria-label="A small neural network with its weights and values"></canvas>' +
      '<div class="controls"><label>Learning rate η <input type="range" class="et" min="0.05" max="1" step="0.05" value="0.1"><output class="eto"></output></label>' +
      '<button type="button" class="btn nx">Next stage</button><button type="button" class="btn ghost rs">Reset</button></div>' +
      '<div class="table-wrap"><table class="compare gt" style="margin-top:12px"></table></div>' +
      '<div class="verdict stepper-text"></div>';
    var canvas = b.querySelector("canvas"), et = b.querySelector(".et");
    function relu(z) { return Math.max(z, 0); }
    function forward() {
      var z3 = Wt.w13 * X[0] + Wt.w23 * X[1] + Wt.b3, z4 = Wt.w14 * X[0] + Wt.w24 * X[1] + Wt.b4;
      var h3 = relu(z3), h4 = relu(z4), z5 = Wt.w35 * h3 + Wt.w45 * h4 + Wt.b5, y5 = relu(z5);
      return { h3: h3, h4: h4, y5: y5, z3: z3, z4: z4, z5: z5, L: 0.5 * (Y - y5) * (Y - y5) };
    }
    function backward() {
      var e = -(Y - fw.y5) * (fw.z5 > 0 ? 1 : 0); // dL/dz5
      var d3 = e * Wt.w35 * (fw.z3 > 0 ? 1 : 0), d4 = e * Wt.w45 * (fw.z4 > 0 ? 1 : 0);
      return { w35: e * fw.h3, w45: e * fw.h4, b5: e, w13: d3 * X[0], w23: d3 * X[1], b3: d3, w14: d4 * X[0], w24: d4 * X[1], b4: d4 };
    }
    function reset() { Wt = Object.assign({}, W0); stage = 0; fw = null; gr = null; steps = 0; draw(); }
    b.querySelector(".rs").addEventListener("click", reset);
    et.addEventListener("input", function () { b.querySelector(".eto").textContent = et.value; });
    b.querySelector(".nx").addEventListener("click", function () {
      if (stage === 0 || stage === 3) { fw = forward(); gr = null; stage = 1; }
      else if (stage === 1) { gr = backward(); stage = 2; }
      else if (stage === 2) { var eta = parseFloat(et.value); Object.keys(gr).forEach(function (k) { Wt[k] -= eta * gr[k]; }); steps++; stage = 3; }
      draw();
    });
    function draw() {
      b.querySelector(".eto").textContent = et.value;
      var s = P.setup(canvas, 0.46), pal = P.palette(), ctx = s.ctx;
      P.clear(ctx, s.w, s.h, pal.bg);
      var pos = { x1: [0.12, 0.28], x2: [0.12, 0.72], h3: [0.5, 0.28], h4: [0.5, 0.72], y5: [0.86, 0.5] };
      function at(n) { return [pos[n][0] * s.w, pos[n][1] * s.h]; }
      var edges = [["x1", "h3", "w13"], ["x2", "h3", "w23"], ["x1", "h4", "w14"], ["x2", "h4", "w24"], ["h3", "y5", "w35"], ["h4", "y5", "w45"]];
      edges.forEach(function (e) {
        var A = at(e[0]), Bp = at(e[1]), changed = stage >= 2 && gr;
        ctx.save(); ctx.strokeStyle = changed ? pal.red : pal.ink3; ctx.lineWidth = 1.4; P.line(ctx, A[0], A[1], Bp[0], Bp[1]); ctx.restore();
        var t = e[0] === "x1" && e[1] === "h4" ? 0.28 : e[0] === "x2" && e[1] === "h3" ? 0.28 : 0.5;
        var mx = A[0] + (Bp[0] - A[0]) * t, my = A[1] + (Bp[1] - A[1]) * t;
        var label = e[2] + " = " + P.fmt(Wt[e[2]], 4) + (stage === 2 && gr ? "  (∂L = " + P.fmt(gr[e[2]], 3) + ")" : "");
        ctx.save(); ctx.font = "11px Inter, system-ui, sans-serif"; var tw = ctx.measureText(label).width; ctx.fillStyle = pal.bg; ctx.globalAlpha = 0.92; ctx.fillRect(mx - tw / 2 - 3, my - 9, tw + 6, 17); ctx.restore();
        P.text(ctx, label, mx, my, stage === 2 ? pal.red : pal.ink2, 11, "center");
      });
      var vals = { x1: "x₁ = 0.5", x2: "x₂ = 0.8", h3: "h₃" + (fw ? " = " + P.fmt(fw.h3, 3) : ""), h4: "h₄" + (fw ? " = " + P.fmt(fw.h4, 3) : ""), y5: "ŷ₅" + (fw ? " = " + P.fmt(fw.y5, 3) : "") };
      Object.keys(pos).forEach(function (n) {
        var A = at(n); P.dot(ctx, A[0], A[1], 22, n === "y5" ? pal.soft : pal.card || pal.bg, pal.accent);
        P.text(ctx, vals[n], A[0], A[1] + 34, pal.ink, 12, "center");
      });
      P.text(ctx, "b₃ = " + P.fmt(Wt.b3, 4) + ",  b₄ = " + P.fmt(Wt.b4, 4) + ",  b₅ = " + P.fmt(Wt.b5, 4), 10, s.h - 10, pal.ink3, 11);
      P.text(ctx, "target y = 1", s.w - 10, 14, pal.ink3, 11, "right");
      var tb = b.querySelector(".gt"), vd = b.querySelector(".verdict");
      if (stage === 0) {
        tb.innerHTML = ""; vd.className = "verdict stepper-text";
        vd.textContent = "One hidden layer with two ReLU nodes, the weights from the lecture, one data point x = (0.5, 0.8) with target y = 1, loss ½(y − ŷ₅)². Press Next stage to run the forward pass.";
      } else if (stage === 1 || stage === 3) {
        tb.innerHTML = "<tbody><tr><td>h₃ = max(w₁₃x₁ + w₂₃x₂ + b₃, 0)</td><td>" + P.fmt(fw.h3, 4) + "</td></tr><tr><td>h₄ = max(w₁₄x₁ + w₂₄x₂ + b₄, 0)</td><td>" + P.fmt(fw.h4, 4) + "</td></tr><tr><td>ŷ₅ = max(w₃₅h₃ + w₄₅h₄ + b₅, 0)</td><td>" + P.fmt(fw.y5, 4) + "</td></tr><tr><td>Loss ½(y − ŷ₅)²</td><td>" + P.fmt(fw.L, 4) + "</td></tr></tbody>";
        vd.className = "verdict stepper-text";
        vd.textContent = (stage === 3 ? "Update " + steps + " done. Weights changed in red above. " : "") + "Forward pass: the network predicts " + P.fmt(fw.y5, 3) + " for a target of 1. Next stage: backpropagate the error to get the gradient." + (stage === 3 ? " (Run the forward pass again with Next stage to see the loss drop.)" : "");
        if (stage === 3) { vd.className = "verdict good stepper-text"; vd.textContent = "Update " + steps + " applied with η = " + et.value + ". Press Next stage to run the forward pass with the new weights and see the smaller loss."; }
      } else {
        var rows = ["w35", "w45", "b5", "w13", "w23", "b3", "w14", "w24", "b4"].map(function (k) { return "<tr><td>∂L/∂" + k.replace(/(\d)(\d)/, "$1$2") + "</td><td>" + P.fmt(gr[k], 4) + "</td></tr>"; }).join("");
        tb.innerHTML = "<tbody>" + rows + "</tbody>";
        vd.className = "verdict warn stepper-text";
        vd.textContent = "Backward pass: every partial derivative is negative, because the network undershoots (ŷ₅ < 1) and all hidden activations are positive. The last layer is differentiated directly, the first layer through the chain rule. Next stage: take a step w ← w − η·∂L/∂w.";
      }
    }
    reset();
    P.responsive(canvas, draw);
  }

  var REG = { "sgd-playground": playground, "sgd-lucky": lucky, "nn-backprop": network };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      var fn = REG[w.getAttribute("data-widget")];
      if (fn) { try { fn(w); } catch (e) { console.error("[opti] widget failed", e); } }
    });
  });
})();
