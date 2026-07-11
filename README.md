# Orthographica

An interactive atlas of the world's writing systems — 202 scripts (living, historical,
and constructed) catalogued after ISO 15924, for typography and linguistics enthusiasts.

## Run it

No build step, no server. Just open `index.html` in a browser.
(D3, topojson-client, the world basemap, and the UI fonts load from CDNs; without a
network connection everything still works except the Atlas coastlines and custom fonts.)

## The five views

| View | What it shows |
|---|---|
| **Lineage** | Radial evolutionary tree — every script hangs from its parent; independent inventions radiate from the centre. Zoom/pan enabled. |
| **Chronology** | Lifespan bars from 3350 BCE to now, sorted by birth; living scripts run to the present. |
| **Glyph Field** | Force-packed bubbles, area ∝ log of encoded grapheme count, clustered by mechanism (alphabet, abjad, abugida, syllabary, logographic, featural). |
| **Atlas** | Geographic origin of each script on a Natural Earth projection; hollow dots are extinct. |
| **Specimens** | Type-foundry card gallery with each script set in its native hand. |

## Interactions

- **Sticky global filters** — status (all / living / historical / constructed), type,
  directionality (LTR / RTL / TTB / boustrophedon), and free-text search over names,
  ISO codes, and languages. Filters apply to every view.
- **Nerd Detail panel** — click any node/bar/bubble/dot/card: native specimen (rendered
  RTL or vertically where appropriate), grapheme count, first attestation, full clickable
  ancestor chain and descendants, languages written, and typography quirks.
- **Deep links** — `#view` or `#view:Code`, e.g. `index.html#specimens:Arab`.

## Files

```
dataset.json        source data (202 scripts)
js/data.js          generated from dataset.json — do not edit by hand
tools/build_data.py regenerates js/data.js after editing dataset.json
js/app.js           all views + UI logic (vanilla JS + D3 v7)
css/style.css       ink-and-paper dark theme
index.html          shell
```

Native samples depend on installed system fonts; scripts without Unicode encoding
(or without a sample in the dataset) show a dotted-circle "no digital type yet" state.
