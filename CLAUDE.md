# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Two loosely coupled halves:

- `analysis/` — Python data pipeline (pandas + Jupyter) that cleans and explores two AI incident datasets:
  - **AIAAIC** (`analysis/AIAAIC/`) — raw CSV with a non-standard 3-row header, cleaned by `clean.py` into `aiaaic_cleaned.csv`. See `analysis/AIAAIC/README.md` for the cleaning steps and known dataset limitations (reporting lag, English-language bias, harm-field coding shift around 2021, declining response coverage).
  - **AIID** (`analysis/AIID/`) — the standard AI Incident Database snapshot (`aiid_03302026/`) plus an exploratory notebook.
  - `compare_aiaaic_aiid.ipynb` cross-references the two.
- `website/` — a static D3v7 + Canvas2D bubble chart visualizing the cleaned AIAAIC data. Loaded via ES modules from CDN; no build step.

`bubble_chart_v4-master/` is a vendored reference copy of Vallandingham's original D3v4 bubble chart that the website is adapted from — treat it as read-only inspiration, not part of the build.

## Common commands

### Python analysis
```bash
# Activate the existing venv (Python deps are pinned in requirements.txt)
source venv/bin/activate

# Re-clean the AIAAIC CSV (writes aiaaic_cleaned.csv next to the input)
python analysis/AIAAIC/clean.py
python analysis/AIAAIC/clean.py --input <raw.csv> --output <cleaned.csv>

# Notebooks
jupyter lab     # or: jupyter notebook
```

The cleaned AIAAIC CSV consumed by the website is `website/data/aiaaic_cleaned.csv` — when re-running `clean.py`, copy the output there if the website needs to pick up changes.

### Website
No package manager, no bundler. D3v7 is imported from `cdn.jsdelivr.net` inside the JS modules. You need a local static server because `d3.csv` won't load over `file://`:

```bash
cd website
python3 -m http.server 8000          # then open http://localhost:8000
# or: npx http-server -p 8000
```

## Website architecture

The website is intentionally split into three layers with no shared state beyond the node array. The control flow is documented in the header comment of `website/src/main.js` and is worth preserving when editing:

- **`data.js`** — `loadData()` reads `data/aiaaic_cleaned.csv`; `createNodes()` maps each row into a node object with `{id, radius, value, name, org, group, year, hasResponse, x, y}`. `group` (technology) drives color; `hasResponse` drives the accountability split.
- **`simulation.js`** — owns the d3 force simulation. `setupSimulation(nodes, onTick)` wires forces and stores `onTick` as the tick handler. `groupBubbles()` and `splitByResponse()` swap the `forceX` target to move bubbles between the single-cluster and two-cluster layouts. The simulation knows nothing about canvas or rendering.
- **`renderer.js`** — owns the canvas. `initCanvas()` handles devicePixelRatio scaling (drawing buffer in physical pixels, CSS size in logical pixels — don't break this). `drawFrame(nodes, currentView)` repaints every tick. `getHoveredNode()` + `toCanvasCoords()` implement hit-testing manually because Canvas2D has no DOM event targets.
- **`main.js`** — the only module that holds view state (`currentView`) and wires user input (toolbar buttons + canvas mousemove for the tooltip).

`constants.js` centralizes layout (`width`, `height`, `center`, `splitCenters`, `forceStrength`). When adding a new view mode: define new centers/labels in `constants.js`, add a new `splitBy…` function in `simulation.js`, and branch on `currentView` inside `drawFrame` for any new labels.

## Working notes

- The `# examplar data` comment blocks in `simulation.js`, `renderer.js`, and `constants.js` are leftover scaffolding from the Vallandingham tutorial (year-based split). Keep them around as reference until the new views stabilize.
- `clean.py` is the single source of truth for the AIAAIC taxonomy normalization — never hand-edit `aiaaic_cleaned.csv`. If the data looks wrong, fix the cleaning rules in `clean.py` and regenerate.
- Both `aiaaic_cleaned.csv` files (in `analysis/AIAAIC/` and `website/data/`) are generated artifacts but are currently checked into git (the `.gitignore` excludes the raw `AIAAIC Repository - Incidents.csv` and the AIID dump, but not the cleaned outputs).
