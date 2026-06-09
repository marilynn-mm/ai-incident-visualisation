# AI Incident Project

A data-narrative visualization of documented AI incidents from the [AIAAIC](https://www.aiaaic.org/) repository (snapshot from Mar 2026), exploring trends in technology, harm, and accountability.

The project has two loosely coupled halves:

- **`analysis/`** — Python pipeline that cleans the raw AIAAIC and AIID datasets and explores them in Jupyter notebooks.
- **`website/`** — A D3 + Canvas2D scrollytelling page that visualizes the cleaned data through a sequence of narrative scenes.

## How to run

### Analysis pipeline

The Python deps are pinned in `requirements.txt` and installed into a local `venv/`.

```bash
# activate the existing venv
source venv/bin/activate

# regenerate the cleaned AIAAIC CSV
python analysis/AIAAIC/clean.py

# launch Jupyter to open the exploration / accountability notebooks
jupyter lab
```

The cleaned CSV is written to `analysis/AIAAIC/aiaaic_cleaned.csv`.
If you re-run the cleaner and want the website to pick up the new data, copy it to `website/data/aiaaic_cleaned.csv`.

### Website

```bash
cd website
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Navigation: the ◀ ▶ buttons in the top-right walk through the storyboard.
Hover any dot for incident details.

## The narrative

The story is a linear scene sequence defined in `website/src/narrative.js`. It moves from context, timeline trends, accountability outcomes.

## Data sources

- **AIAAIC repository** — the primary dataset. Cleaning rules, taxonomy normalization, and known limitations.
- **AI Incident Database (AIID)** — secondary dataset used for cross-referencing only.

- **Color = primary technology.** Each dot's color is decided by `primaryTech()` in `tech_buckets.js`. Tech is the primary visual axis because the GenAI regime change is the headline finding; harm is shown contextually (top-left overlay during tech-cycle scenes).
- **Priority-order short-circuit.** A multi-tagged row gets one tag, the first match in order of `genai → facial → deepfake → av → cv → ml → other`. This puts narratively important categories above more general ones. ML at the bottom because almost every AI system uses ML. 

## Credits

- AIAAIC dataset by Charlie Pownall and contributors.
- Bubble chart layout adapted from [Jim Vallandingham's d3v4 bubble chart](https://github.com/vlandham/bubble_chart_v4) (vendored reference in `bubble_chart_v4-master/`).

