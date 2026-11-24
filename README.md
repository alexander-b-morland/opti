# Opti

A study site for MIT 15.C57 Optimization Methods (Fall 2026), live at **[optimization.click](https://optimization.click)**.

Every class gets the big picture first, then short parts with interactive visuals, flashcards and exam-style multiple-choice questions. The site covers the material for Midterm 2: classes 13 to 20.

Unofficial. The content is written from the lecture notes and the two course textbooks, Bertsimas and Tsitsiklis, *Introduction to Linear Optimization* (BT), and Boyd and Vandenberghe, *Convex Optimization* (BV). No course PDFs (slides, textbooks, exams) are stored in this repository.

## Contents

| Class | Topic | Parts |
|---|---|---|
| 13 | Robust optimization: modeling | Why uncertainty matters · Robust formulations · Building uncertainty sets |
| 14 | Robust optimization: algorithms | Norm sets and dual norms · Reformulation via duality · Cutting planes |
| 15 | Adaptive optimization | Here and now, wait and see · Benders decomposition · The value of adapting |
| 16 | Dynamic programming | The knapsack recursion · States, decisions and Bellman's equation · Inventory and recruiting |
| 17 | Non-linear optimization: modeling | A tour of non-linear models · Problem classes and convexity · Convex optimization |
| 18 | Gradient descent | Optimality conditions · The algorithm · Convergence guarantees · Step sizes and initialization |
| 19 | Stochastic gradient descent | Why stochastic gradients · The SGD algorithm · Convergence and step sizes · Mini-batches and practice |
| 20 | Newton's method | The Newton step · Local convergence · Global convergence |

Each class page has four sections: Big picture, Parts, Flashcards and Test yourself. Each part ends with a short check and a note on how the topic has appeared on past exams.

## Structure

```
index.html              home page with all classes
classNN/index.html      class overview: big picture, parts, flashcards, quiz
classNN/*.html          the parts of the class
class18/widgets.js      class 18 visuals (gradient descent)
assets/style.css        all styles, light and dark theme
assets/site.js          theme toggle, search index, KaTeX rendering, tabs, flashcards, quizzes
assets/plot.js          small canvas plotting helpers shared by the visuals
assets/robust.js        visuals for classes 13 and 14
assets/adaptive.js      visuals for class 15
assets/dp.js            visuals for class 16
assets/nlp.js           visuals for class 17
assets/sgd.js           visuals for class 19
assets/newton.js        visuals for class 20
tools/wrap.py           optional helper that wraps a page fragment in the shared page shell
```

Plain HTML, CSS and JavaScript. No framework and no build step. Math is rendered with KaTeX from a CDN, fonts come from Google Fonts. Every visual is computed in the browser: the knapsack table, the inventory policy and the cutting-plane and Benders iterations are solved live, not drawn from images.

## Run locally

```
python -m http.server 8418
```

Then open http://127.0.0.1:8418. Pages use root-relative paths (`/assets/...`), so opening the HTML files directly from disk will not load styles and scripts.

## Deploy

The repository is connected to Vercel. Every push to `main` deploys automatically. There is no build command and no output directory: Vercel serves the repository root as static files. The custom domain is set under the Vercel project's Settings, Domains.

## Adding a class

1. Create `classNN/` with an `index.html` and one HTML file per part. The fastest way is to write each page as a fragment and run `python tools/wrap.py fragment.txt`. The fragment format is documented at the top of `tools/wrap.py`. Copying an existing class page and editing it works too.
2. Put the class's visuals in a script under `assets/` (or in the class folder) and list it in the fragment's `scripts:` line. Each visual is a `<div class="widget" data-widget="name">` that the script fills in.
3. Add the class and its parts to the `PAGES` search index at the top of `assets/site.js`.
4. On the home page, turn the class card from `<div class="class-card soon">` into a link.

Writing conventions for the content: English, short sentences, no em dashes, math in `\( \)` and `\[ \]`. Every number, table and example taken from the lecture should match the slides. Anything added beyond the slides is marked as such.

## Found an error?

Open an issue on GitHub.
