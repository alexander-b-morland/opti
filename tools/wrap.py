"""Wrap a page fragment in the shared Opti page shell.

Usage: python tools/wrap.py fragment.txt [more fragments...]

A fragment starts with "key: value" lines, then a line with "---", then the HTML that goes
inside <main>. Keys:
  out       output path relative to the repo root, e.g. class13/index.html (required)
  title     <title> text (required)
  desc      meta description
  crumb     "href|text" for the back link in the nav (default: home)
  eyebrow   small label above the heading
  h1        heading HTML
  lede      intro paragraph HTML
  scripts   space-separated extra scripts, e.g. "/assets/plot.js widgets.js"
  toc       "overview" to add the Big picture / Parts / Flashcards / Test yourself bar
  sources   footer source line

The generated pages are plain static HTML and are committed. There is no build step for deploys.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script>try{{var t=localStorage.getItem("opti-theme");if(t)document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="/assets/style.css">
<script defer src="/assets/site.js"></script>
{scripts}</head>
<body>
<nav class="site-nav"><div class="container">
  <a class="brand" href="/">OPTI</a>
  <a class="nav-crumb" href="{crumb_href}">&larr; {crumb_text}</a>
  <span class="nav-spacer"></span>
  <div class="search-wrap"><span class="s-icon">&#9906;</span><input type="search" placeholder="Search…" aria-label="Search all classes"><div class="search-results"></div></div>
  <button class="theme-btn" type="button" aria-label="Toggle dark mode"></button>
</div></nav>

<header class="hero container">
  <p class="eyebrow">{eyebrow}</p>
  <h1>{h1}</h1>
  <p class="lede">{lede}</p>
</header>
{toc}
<main class="container">
{body}
</main>

<footer class="site-foot"><div class="container">
  <span>{sources}</span>
  <a href="https://github.com/alexander-b-morland/opti">Source on GitHub</a>
</div></footer>
</body>
</html>
"""

TOC = """
<nav class="chapter-toc" aria-label="On this page"><div class="container">
  <ol>
    <li><a href="#big-picture"><span>01</span>Big picture</a></li>
    <li><a href="#parts"><span>02</span>Parts</a></li>
    <li><a href="#flashcards"><span>03</span>Flashcards</a></li>
    <li><a href="#quiz"><span>04</span>Test yourself</a></li>
  </ol>
</div></nav>
"""


def wrap(path):
    text = pathlib.Path(path).read_text(encoding="utf-8")
    header, body = text.split("\n---\n", 1)
    meta = {}
    for line in header.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    crumb = meta.get("crumb", "/|All classes").split("|", 1)
    scripts = "".join(f'<script defer src="{s}"></script>\n' for s in meta.get("scripts", "").split())
    html = HEAD.format(
        title=meta["title"], desc=meta.get("desc", ""), scripts=scripts,
        crumb_href=crumb[0], crumb_text=crumb[1], eyebrow=meta.get("eyebrow", ""),
        h1=meta.get("h1", ""), lede=meta.get("lede", ""),
        toc=TOC if meta.get("toc") == "overview" else "",
        body=body.strip("\n"), sources=meta.get("sources", ""),
    )
    out = ROOT / meta["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    for p in sys.argv[1:]:
        wrap(p)
