/* Opti: tiny canvas plotting helpers shared by the interactive widgets */
(function () {
  "use strict";

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
  }

  function palette() {
    return {
      bg: css("--plot-bg"), grid: css("--plot-grid"), ink: css("--ink"), ink2: css("--ink-2"),
      ink3: css("--ink-3"), accent: css("--accent"), accent2: css("--accent-2"), soft: css("--accent-soft"),
      gold: css("--gold"), red: css("--red"), rule: css("--rule")
    };
  }

  /* Make a canvas crisp on HiDPI screens. aspect = height / width. */
  function setup(canvas, aspect) {
    var w = canvas.clientWidth || canvas.parentNode.clientWidth || 600;
    var h = Math.round(w * (aspect || 0.6));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  /* Map math coordinates to pixels. pad in px. */
  function View(w, h, xmin, xmax, ymin, ymax, pad) {
    pad = pad == null ? 0 : pad;
    this.w = w; this.h = h; this.xmin = xmin; this.xmax = xmax; this.ymin = ymin; this.ymax = ymax; this.pad = pad;
  }
  View.prototype.px = function (x) { return this.pad + (x - this.xmin) / (this.xmax - this.xmin) * (this.w - 2 * this.pad); };
  View.prototype.py = function (y) { return this.h - this.pad - (y - this.ymin) / (this.ymax - this.ymin) * (this.h - 2 * this.pad); };
  View.prototype.ix = function (px) { return this.xmin + (px - this.pad) / (this.w - 2 * this.pad) * (this.xmax - this.xmin); };
  View.prototype.iy = function (py) { return this.ymin + (this.h - this.pad - py) / (this.h - 2 * this.pad) * (this.ymax - this.ymin); };

  function clear(ctx, w, h, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, w, h); }

  function axes(ctx, v, pal, opts) {
    opts = opts || {};
    ctx.save();
    ctx.lineWidth = 1;
    if (opts.grid !== false) {
      ctx.strokeStyle = pal.grid;
      var gx = opts.gx || niceStep(v.xmax - v.xmin), gy = opts.gy || niceStep(v.ymax - v.ymin);
      for (var x = Math.ceil(v.xmin / gx) * gx; x <= v.xmax + 1e-9; x += gx) { line(ctx, v.px(x), v.py(v.ymin), v.px(x), v.py(v.ymax)); }
      for (var y = Math.ceil(v.ymin / gy) * gy; y <= v.ymax + 1e-9; y += gy) { line(ctx, v.px(v.xmin), v.py(y), v.px(v.xmax), v.py(y)); }
    }
    ctx.strokeStyle = pal.ink3;
    if (v.ymin <= 0 && v.ymax >= 0) line(ctx, v.px(v.xmin), v.py(0), v.px(v.xmax), v.py(0));
    if (v.xmin <= 0 && v.xmax >= 0) line(ctx, v.px(0), v.py(v.ymin), v.px(0), v.py(v.ymax));
    ctx.restore();
  }

  function niceStep(span) {
    var raw = span / 8, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function curve(ctx, v, f, col, width, dash, x0, x1) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = width || 2; if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    var a = x0 == null ? v.xmin : x0, b = x1 == null ? v.xmax : x1, n = 400, started = false;
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (!isFinite(y)) { started = false; continue; }
      var py = Math.max(-2000, Math.min(4000, v.py(y)));
      if (!started) { ctx.moveTo(v.px(x), py); started = true; } else ctx.lineTo(v.px(x), py);
    }
    ctx.stroke(); ctx.restore();
  }

  function dot(ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function arrow(ctx, x1, y1, x2, y2, col, width) {
    var ang = Math.atan2(y2 - y1, x2 - x1), hl = 9;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = width || 2;
    line(ctx, x1, y1, x2, y2);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl * Math.cos(ang - 0.4), y2 - hl * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - hl * Math.cos(ang + 0.4), y2 - hl * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function text(ctx, s, x, y, col, size, align, font) {
    ctx.save(); ctx.fillStyle = col; ctx.font = (size || 12) + "px " + (font || "Inter, system-ui, sans-serif");
    ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y); ctx.restore();
  }

  function hexToRgb(c) {
    c = c.trim();
    if (c[0] === "#") {
      if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
    }
    var m = c.match(/\d+/g); return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
  }

  /* Contour plot of f(x, y). Returns an offscreen canvas you can blit each frame. */
  function contourLayer(w, h, dpr, v, f, pal, opts) {
    opts = opts || {};
    var off = document.createElement("canvas");
    off.width = Math.round(w * dpr); off.height = Math.round(h * dpr);
    var ctx = off.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clear(ctx, w, h, pal.bg);
    var nx = opts.nx || 140, ny = Math.round(nx * h / w);
    var vals = new Float64Array((nx + 1) * (ny + 1)), fmin = Infinity, fmax = -Infinity;
    for (var j = 0; j <= ny; j++) for (var i = 0; i <= nx; i++) {
      var val = f(v.ix(i / nx * w), v.iy(j / ny * h));
      vals[j * (nx + 1) + i] = val;
      if (isFinite(val)) { if (val < fmin) fmin = val; if (val > fmax) fmax = val; }
    }
    var levels = [], n;
    if (opts.levelsList) {
      levels = opts.levelsList.slice().sort(function (p, q) { return p - q; }); n = levels.length;
    } else {
      n = opts.levels || 16;
      var span = fmax - fmin, lo = span * (opts.lowFrac || 2e-4);
      for (var k = 0; k < n; k++) levels.push(fmin + lo * Math.pow(span / lo, k / (n - 1)));
    }
    // shaded bands
    var rgb = hexToRgb(pal.accent), cw = w / nx, ch = h / ny;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var c = vals[j * (nx + 1) + i], band = 0;
      while (band < n && c > levels[band]) band++;
      var a = 0.17 * (1 - band / n);
      if (a <= 0.005) continue;
      ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a.toFixed(3) + ")";
      ctx.fillRect(i * cw, j * ch, cw + 0.6, ch + 0.6);
    }
    // level lines via marching squares
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.55)";
    for (var L = 0; L < levels.length; L++) {
      var lev = levels[L];
      ctx.beginPath();
      for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
        var a0 = vals[j * (nx + 1) + i], b0 = vals[j * (nx + 1) + i + 1], c0 = vals[(j + 1) * (nx + 1) + i + 1], d0 = vals[(j + 1) * (nx + 1) + i];
        var idx = (a0 > lev ? 8 : 0) | (b0 > lev ? 4 : 0) | (c0 > lev ? 2 : 0) | (d0 > lev ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var x0 = i * cw, y0 = j * ch;
        var top = [x0 + cw * t(a0, b0, lev), y0], right = [x0 + cw, y0 + ch * t(b0, c0, lev)];
        var bottom = [x0 + cw * t(d0, c0, lev), y0 + ch], left = [x0, y0 + ch * t(a0, d0, lev)];
        var segs = MS[idx];
        for (var s = 0; s < segs.length; s++) {
          var p = pick(segs[s][0]), q = pick(segs[s][1]);
          ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
        }
      }
      ctx.stroke();
    }
    function pick(e) { return e === 0 ? top : e === 1 ? right : e === 2 ? bottom : left; }
    return off;
  }
  function t(a, b, lev) { var d = b - a; return d === 0 ? 0.5 : Math.max(0, Math.min(1, (lev - a) / d)); }
  // edges: 0 top, 1 right, 2 bottom, 3 left
  var MS = {
    1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[3, 0], [2, 1]], 6: [[0, 2]], 7: [[3, 0]],
    8: [[3, 0]], 9: [[0, 2]], 10: [[0, 1], [3, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]]
  };

  /* Re-run a draw function on resize and on theme change. */
  function responsive(canvas, draw) {
    var last = 0;
    var ro = new ResizeObserver(function () {
      var w = canvas.clientWidth;
      if (Math.abs(w - last) > 1) { last = w; draw(true); }
    });
    ro.observe(canvas);
    document.addEventListener("opti-theme", function () { draw(true); });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", function () { draw(true); });
    }
  }

  function fmt(x, d) {
    if (!isFinite(x)) return x > 0 ? "∞" : x < 0 ? "-∞" : "NaN";
    d = d == null ? 3 : d;
    var a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return x.toExponential(2);
    return (+x.toFixed(d)).toString();
  }

  window.Plot = {
    palette: palette, setup: setup, View: View, clear: clear, axes: axes, line: line, curve: curve,
    dot: dot, arrow: arrow, text: text, contourLayer: contourLayer, responsive: responsive, fmt: fmt
  };
})();
