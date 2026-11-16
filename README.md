# Opti

A study site for MIT 15.C57 Optimization Methods (Fall 2026). Each class gets a big-picture overview, short parts with interactive visuals, flashcards and exam-style questions.

Unofficial. Built from the lecture notes and the course textbooks (Bertsimas and Tsitsiklis, Boyd and Vandenberghe). No course PDFs are stored in this repository.

## Structure

- `index.html`: home page with all classes
- `classNN/`: one folder per class. `index.html` is the overview, the other pages are the parts, `widgets.js` holds that class's interactive visuals
- `assets/style.css`, `assets/site.js` (theme, search, math, flashcards, quizzes), `assets/plot.js` (canvas helpers)

Plain HTML, CSS and JavaScript. No build step. Math is rendered with KaTeX from a CDN.

## Run locally

```
python -m http.server 8418
```

Then open http://127.0.0.1:8418. Pages use root-relative paths, so opening the files directly from disk will not load the styles.

## Adding a class

Copy the `class18` folder structure, add the class to the search index in `assets/site.js` (`PAGES`) and turn its card on the home page into a link.
