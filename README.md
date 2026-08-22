# freestyleconcepts.co.za

The Freestyle Concepts website. Static HTML, CSS and JavaScript, no build step
and no dependencies. GitHub Pages serves `main` at the domain in `CNAME`.

```
index.html               the page
assets/css/modernist.css the design system, kept in sync with the design project
assets/css/site.css      brand tokens and this page's layout
assets/js/site.js        behaviour: estimate, occasion finder, gallery, designer
uploads/                 logos, the social card, and the print photos
robots.txt sitemap.xml   crawlers
llms.txt                 a plain-text brief for answer engines
tools/stamp-assets.mjs   cache stamping, see below
```

## Running it locally

Any static file server from the repo root, for example:

```
python -m http.server 8000
```

Then open `http://127.0.0.1:8000`. Opening `index.html` from the filesystem
also mostly works, but a server matches how Pages behaves.

## Before you commit a CSS or JS change

Run this:

```
node tools/stamp-assets.mjs
```

It writes a short content hash onto the stylesheet and script URLs in
`index.html`, so `site.css?v=1889ce88` becomes a new URL whenever the file's
bytes change. Pages serves assets with `Cache-Control: max-age=600`, so without
the stamp a returning visitor can get freshly deployed HTML alongside a
stylesheet up to ten minutes old and see the new markup with the old rules.

The script is idempotent: if nothing changed, `index.html` is left alone. A
local `pre-commit` hook runs it automatically, but hooks are not shared through
git, so run it by hand if you are working from a fresh clone.

## Photos

`uploads/Products/` holds the gallery photos, re-encoded for the sizes the
layout actually renders: 700px on the longest edge, and 1100px for the one
photo that also fills the bulk section. The untouched originals are not in this
repo. Filenames are referenced from `index.html`, so keep them as they are.

## Two things that are deliberate

`.preview-text` in `site.css` stays at 16px. The mock-up download in
`site.js` draws its text at `16 * scale`, and changing one without the other
makes the saved PNG stop matching the on-screen preview.

There is no `aggregateRating` in the JSON-LD. Review markup a business puts on
its own site is not eligible for rich results, and including it risks the whole
block being ignored.
