/* Opti: shared behaviour (theme, search, math, flashcards, quizzes) */
(function () {
  "use strict";

  /* ---------- search index: one entry per page ---------- */
  var PAGES = [
    { t: "Class 13: Robust optimization modeling", d: "Data uncertainty, robust formulations, uncertainty sets, price of robustness", u: "/class13/", k: "robust optimization uncertainty set adversary" },
    { t: "13a: Why uncertainty matters", d: "PILOT4, sources of uncertainty, limits of probability models", u: "/class13/why-uncertainty.html", k: "pilot4 netlib constraint violation data uncertainty measurement estimation implementation error probability distribution" },
    { t: "13b: Robust formulations", d: "Adversary, uncertainty set, robust LP, row-wise uncertainty", u: "/class13/robust-formulations.html", k: "adversary worst case robust counterpart epigraph uncertain cost right-hand side row-wise feasible region" },
    { t: "13c: Building uncertainty sets", d: "Capacity expansion, box set, central limit theorem set, price of robustness, nurse scheduling", u: "/class13/uncertainty-sets.html", k: "box element-wise clt central limit theorem gamma price of robustness capacity expansion knapsack nurse scheduling hyperparameter" },
    { t: "Class 14: Robust optimization algorithms", d: "Robust counterparts, dual norms, duality, cutting planes", u: "/class14/", k: "robust counterpart reformulation algorithm" },
    { t: "14a: Norm sets and dual norms", d: "Box, ellipsoidal and budget sets, dual norm, safety buffer", u: "/class14/norm-sets.html", k: "norm uncertainty set box ellipsoid ellipsoidal budget dual norm cauchy-schwarz second-order cone conic safety buffer direct method" },
    { t: "14b: Reformulation via duality", d: "Polyhedral sets, strong duality, budget of uncertainty example", u: "/class14/duality.html", k: "polyhedral strong duality dual variables max to min bertsimas sim budget-box robust counterpart linear" },
    { t: "14c: Cutting planes", d: "Master problem, subproblem, bounds, nurse scheduling", u: "/class14/cutting-planes.html", k: "cutting planes master problem subproblem oracle relaxation upper bound lower bound dual simplex nurse scheduling" },
    { t: "Class 15: Adaptive optimization", d: "Two-stage stochastic optimization, Benders decomposition, VSS and EVPI", u: "/class15/", k: "adaptive stochastic two-stage scenario" },
    { t: "15a: Here and now, wait and see", d: "First and second stage, adaptive facility location, block-angular structure", u: "/class15/two-stage.html", k: "here and now wait and see first stage second stage scenario non-anticipativity recourse facility location block angular deterministic to stochastic recipe" },
    { t: "15b: Benders decomposition", d: "Recourse function, cuts from duality, master problem and subproblem, bounds", u: "/class15/benders.html", k: "benders decomposition recourse function dual extreme point cut master subproblem lower bound upper bound relatively complete recourse row generation" },
    { t: "15c: The value of adapting", d: "Deterministic, adaptive and wait-and-see plans, VSS, EVPI", u: "/class15/value.html", k: "vss value of stochastic solution evpi expected value of perfect information wait and see deterministic flexibility commitment" },
    { t: "Class 16: Dynamic programming", d: "Knapsack recursion, Bellman's equation, backward induction, inventory, recruiting", u: "/class16/", k: "dynamic programming dp bellman" },
    { t: "16a: The knapsack recursion", d: "Subproblems, skip or take, the DP table, O(nK)", u: "/class16/knapsack.html", k: "knapsack recursion subproblem table principle of optimality pseudo-polynomial complexity" },
    { t: "16b: States, decisions and Bellman's equation", d: "DP modeling, cost-to-go, backward induction, curse of dimensionality", u: "/class16/bellman.html", k: "state decision transition cost terminal policy cost-to-go bellman equation backward induction curse of dimensionality reinforcement learning approximate" },
    { t: "16c: Inventory and recruiting", d: "Order-up-to (s, S) policy, hiring thresholds", u: "/class16/applications.html", k: "inventory order-up-to s S policy fixed cost holding backlog recruiting hiring threshold secretary optimal stopping" },
    { t: "Class 17: Non-linear optimization modeling", d: "Applications, problem classes, convexity, convex optimization", u: "/class17/", k: "non-linear nonlinear modeling convex" },
    { t: "17a: A tour of non-linear models", d: "Approximation norms, regression, denoising, geometry, portfolio, Fermat-Weber, floor planning, ride-sharing", u: "/class17/applications.html", k: "approximation least squares minimax absolute residual norm regression logistic regularization denoising projection ellipsoid portfolio variance covariance fermat-weber ball circumscription power plant floor planning ride-sharing pickup" },
    { t: "17b: Problem classes and convexity", d: "QP, QCQP, SOCP, SDP, NLP, convex sets and functions, convexity tests", u: "/class17/convexity.html", k: "qp qcqp socp sdp nlp local global convex set convex function concave chord tangent first-order second-order hessian positive semidefinite composition max" },
    { t: "17c: Convex optimization", d: "Convex problems, which models are convex, local equals global", u: "/class17/convex-optimization.html", k: "convex optimization problem feasible region local minimum global minimum proof equality constraints linear tractable" },
    { t: "Class 18: Gradient descent", d: "Unconstrained minimization, optimality conditions, gradient descent, convergence, step sizes", u: "/class18/", k: "gradient descent unconstrained minimization overview" },
    { t: "18a: Optimality conditions", d: "Stationary points, Hessian, positive definite, local vs global minimum, convexity", u: "/class18/optimality-conditions.html", k: "stationary point hessian positive definite semidefinite indefinite saddle necessary sufficient convex global local first-order second-order taylor ridge regression" },
    { t: "18b: The gradient descent algorithm", d: "Descent directions, the update rule, rates of convergence", u: "/class18/gradient-descent.html", k: "descent direction update rule step size algorithm rate of convergence linear sublinear superlinear quadratic order" },
    { t: "18c: Convergence guarantees", d: "M-smoothness, m-strong convexity, sub-linear and linear rates, the proof", u: "/class18/convergence.html", k: "smooth lipschitz strongly convex strong convexity sublinear linear 1/M rate proof telescoping iterations epsilon condition number" },
    { t: "18d: Step sizes, initialization and scaling", d: "Constant, diminishing, exact and backtracking line search, condition number, diagonal scaling, steepest descent", u: "/class18/step-sizes.html", k: "step size line search exact backtracking armijo diminishing constant initialization local minimum condition number kantorovich zigzag scaling diagonal steepest descent norm coordinate descent rosenbrock" },
    { t: "Class 19: Stochastic gradient descent", d: "Finite sums, backpropagation, noise ball, step sizes, mini-batches", u: "/class19/", k: "sgd stochastic gradient descent learning rate" },
    { t: "19a: Why stochastic gradients", d: "Neural networks, training as a finite sum, forward and backward propagation, cost of a gradient", u: "/class19/why-stochastic.html", k: "neural network training loss finite sum backpropagation forward propagation relu weights bias cost" },
    { t: "19b: The SGD algorithm", d: "Random and cyclic sampling, unbiased gradient, not a descent method, regression update, network by hand", u: "/class19/algorithm.html", k: "sgd algorithm index randomized cyclic unbiased descent direction lucky unlucky regression update chain rule backpropagation example" },
    { t: "19c: Convergence and step sizes", d: "Noise ball, objective and gradient guarantees, constant and diminishing steps", u: "/class19/convergence.html", k: "convergence noise ball variance strongly convex bound gradient norm constant step diminishing step schedule best iterate" },
    { t: "19d: Mini-batches and practice", d: "Mini-batch SGD, variance reduction, heart disease case, practical checklist", u: "/class19/mini-batches.html", k: "mini-batch batch size variance reduction epoch heart disease cross-entropy initialization warm start early stopping regularization" }
  ];

  /* ---------- theme ---------- */
  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("opti-theme"); } catch (e) {}
    if (stored === "light" || stored === "dark") document.documentElement.setAttribute("data-theme", stored);
    var btn = document.querySelector(".theme-btn");
    if (!btn) return;
    function isDark() {
      var t = document.documentElement.getAttribute("data-theme");
      if (t) return t === "dark";
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    function label() { btn.textContent = isDark() ? "☀" : "☾"; btn.title = isDark() ? "Light mode" : "Dark mode"; }
    label();
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("opti-theme", next); } catch (e) {}
      label();
      document.dispatchEvent(new CustomEvent("opti-theme"));
    });
  }

  /* ---------- search ---------- */
  function initSearch() {
    document.querySelectorAll(".search-wrap").forEach(function (wrap) {
      var input = wrap.querySelector("input");
      var box = wrap.querySelector(".search-results");
      var active = -1;
      function score(p, q) {
        var hay = (p.t + " " + p.d + " " + p.k).toLowerCase();
        var words = q.toLowerCase().split(/\s+/).filter(Boolean);
        var s = 0;
        for (var i = 0; i < words.length; i++) {
          var w = words[i];
          if (hay.indexOf(w) < 0) return 0;
          s += p.t.toLowerCase().indexOf(w) >= 0 ? 3 : 1;
        }
        return s;
      }
      function render() {
        var q = input.value.trim();
        if (!q) { box.classList.remove("open"); return; }
        var hits = PAGES.map(function (p) { return { p: p, s: score(p, q) }; })
          .filter(function (h) { return h.s > 0; })
          .sort(function (a, b) { return b.s - a.s; });
        active = -1;
        box.innerHTML = hits.length
          ? hits.map(function (h) { return '<a href="' + h.p.u + '">' + h.p.t + "<small>" + h.p.d + "</small></a>"; }).join("")
          : '<div class="empty">No matches. Try "Hessian" or "step size".</div>';
        box.classList.add("open");
      }
      input.addEventListener("input", render);
      input.addEventListener("focus", render);
      input.addEventListener("keydown", function (e) {
        var links = box.querySelectorAll("a");
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!links.length) return;
          active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
          links.forEach(function (l, i) { l.classList.toggle("active", i === active); });
        } else if (e.key === "Enter") {
          var target = links[active >= 0 ? active : 0];
          if (target) window.location.href = target.getAttribute("href");
        } else if (e.key === "Escape") {
          box.classList.remove("open"); input.blur();
        }
      });
      document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) box.classList.remove("open"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        var i = document.querySelector(".search-wrap input");
        if (i && i.offsetParent) { e.preventDefault(); i.focus(); }
      }
    });
  }

  /* ---------- math ---------- */
  function renderMath(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el || document.body, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }
  }

  /* ---------- flashcards ---------- */
  function initFlashcards() {
    document.querySelectorAll(".flashcards").forEach(function (root) {
      var src = root.querySelector("script[type='application/json']");
      if (!src) return;
      var cards = JSON.parse(src.textContent);
      var order = cards.map(function (_, i) { return i; });
      var idx = 0;
      root.insertAdjacentHTML("beforeend",
        '<div class="fc-stage"><div class="fc-card" tabindex="0" aria-live="polite">' +
        '<div class="fc-face fc-front"><span class="fc-label">Question</span><div class="fc-text"></div><span class="fc-hint">Click or press space to flip</span></div>' +
        '<div class="fc-face fc-back"><span class="fc-label">Answer</span><div class="fc-text"></div></div>' +
        "</div></div>" +
        '<div class="fc-controls"><button class="btn ghost fc-prev" aria-label="Previous card">←</button>' +
        '<span class="fc-counter"></span><div class="fc-bar"><div class="fc-bar-fill"></div></div>' +
        '<button class="btn ghost fc-shuffle">Shuffle</button><button class="btn fc-next" aria-label="Next card">→</button></div>');
      var card = root.querySelector(".fc-card");
      var front = root.querySelector(".fc-front .fc-text");
      var back = root.querySelector(".fc-back .fc-text");
      function show() {
        card.classList.remove("flipped");
        var c = cards[order[idx]];
        front.innerHTML = c.q;
        back.innerHTML = c.a;
        renderMath(card);
        root.querySelector(".fc-counter").textContent = (idx + 1) + " / " + cards.length;
        root.querySelector(".fc-bar-fill").style.width = ((idx + 1) / cards.length * 100) + "%";
      }
      function flip() { card.classList.toggle("flipped"); }
      card.addEventListener("click", flip);
      card.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
        if (e.key === "ArrowRight") { idx = (idx + 1) % cards.length; show(); }
        if (e.key === "ArrowLeft") { idx = (idx - 1 + cards.length) % cards.length; show(); }
      });
      root.querySelector(".fc-next").addEventListener("click", function () { idx = (idx + 1) % cards.length; show(); });
      root.querySelector(".fc-prev").addEventListener("click", function () { idx = (idx - 1 + cards.length) % cards.length; show(); });
      root.querySelector(".fc-shuffle").addEventListener("click", function () {
        for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
        idx = 0; show();
      });
      show();
    });
  }

  /* ---------- quizzes ---------- */
  function initQuizzes() {
    var all = document.querySelectorAll(".quiz");
    var answered = 0, right = 0;
    var scoreEl = document.querySelector(".quiz-score");
    function updateScore() {
      if (scoreEl) scoreEl.textContent = answered === 0 ? "" : "Score: " + right + " / " + answered + " answered (" + all.length + " questions in total)";
    }
    all.forEach(function (q) {
      var opts = q.querySelectorAll(".opt");
      var fb = q.querySelector(".feedback");
      opts.forEach(function (o) {
        o.addEventListener("click", function () {
          var ok = o.hasAttribute("data-correct");
          opts.forEach(function (x) {
            x.disabled = true;
            if (x.hasAttribute("data-correct")) x.classList.add("correct");
          });
          if (!ok) o.classList.add("wrong");
          if (fb) {
            fb.insertAdjacentHTML("afterbegin", ok ? "<b>Correct.</b> " : "<b>Not quite.</b> ");
            fb.classList.add("show");
          }
          answered++; if (ok) right++;
          updateScore();
        });
      });
    });
  }

  /* ---------- tabs ---------- */
  function initTabs() {
    document.querySelectorAll(".tabs").forEach(function (t) {
      var panels = t.querySelectorAll(":scope > .tab-panel");
      var bar = document.createElement("div");
      bar.className = "tab-bar"; bar.setAttribute("role", "tablist");
      panels.forEach(function (p, i) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = p.getAttribute("data-tab"); b.setAttribute("role", "tab");
        if (i === 0) { b.classList.add("on"); p.classList.add("on"); }
        b.addEventListener("click", function () {
          bar.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
          panels.forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on"); p.classList.add("on");
        });
        bar.appendChild(b);
      });
      t.insertBefore(bar, t.firstChild);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initTheme();
    initSearch();
    initQuizzes();
    renderMath();
    initFlashcards();
  });
  window.Opti = { renderMath: renderMath };
})();
