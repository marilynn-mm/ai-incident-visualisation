# Project — AI Incident Data Visualization

A click-driven narrative visualization of the AI harm landscape, built on the AIAAIC database (2,243 raw incidents 2008–2026; the visualization filters globally to 2015+ for ~2,200 dots). The project comprises a Python data-cleaning pipeline and a static D3 + Canvas website that tells the story across 11 scenes in a 4-act arc.

This document records the project framing, the planned narrative arc, and the design decisions made so far — including the rationale behind each. It is a living doc; update it when decisions change so future-you (and future collaborators) don't re-litigate settled questions.

For codebase mechanics, see `CLAUDE.md`. For the data pipeline, see `analysis/AIAAIC/README.md`. For the harm bucket taxonomy, see `analysis/AIAAIC/HARM_TAXONOMY.md`.

## Framing

The story this project tells is **"what we know and what we don't know about AI harm"** — not a cleaned landscape view. Data gaps (missing year, missing harm coding, declining response coverage) are part of the narrative, not noise to suppress. This framing shapes nearly every design decision below.

## Session log

### 2026-06-06 — Tech regime pivot, scene stepper, fatal + accountability scenes

The full narrative spine got built out in one extended session. Major moves:

- **Narrative pivot from harm to technology.** Color encoding changed from harm-bucket to tech-bucket; eras and copy rewired around the regime-change story (ML era → FR peak → GenAI explosion → GenAI majority) using findings and percentages drawn directly from `analysis/AIAAIC/explore.ipynb`. Harm bucketing is preserved for the future Scene 3.
- **Global year filter to 2015+.** Aligns with the notebook's analytical range; drops 40 sparse pre-regime outliers. Undated rows are kept.
- **Toolbar → single scene stepper.** Three independent toolbar buttons replaced by a single ◀ ▶ stepper walking an 11-scene array. Within-timeline sub-scenes (overview, 6 eras, fatal spotlight, accountability line) no longer re-trigger the timeline layout; they update annotation + dimming only.
- **Smooth radius tween.** Dots shrink/grow smoothly between cluster (radius 5) and timeline (2.5) via a per-tick interpolator rather than snapping. Mockup at `website/mockup.html` shows the three cluster-radius options that were compared.
- **Accountability-rate line overlay.** New scene draws the per-year `has_consequence` rate as a line over a dimmed histogram. Solid line + filled markers through 2024; dashed line + hollow markers through 2025–26 to flag reporting lag.
- **Fatal incidents spotlight.** New scene re-sorts each year column so fatal dots (rows with "Loss of life" in harm fields) sink to the bottom, forming a colored stripe along the chart while non-fatal dots float up as a gray ghost layer. Smooth force-eased transition into and out of the scene.
- **Notebook-grounded copy.** Every percentage in `narrative.js` traces to a specific notebook cell (cell 8 for the regime stackplot, cell 17 for the accountability line, cell 45 for the fatal definition).

Pending after this session: falling animation (current transition is a smooth ease, not literal rain), Scene 1 case studies, Scene 3 victim matrix, visual polish (cluster footprint shrunk after radius change, page `<h1>` outdated).

## Narrative arc

The story unfolds as 11 scenes navigated with ◀ ▶, grouped into 4 acts:

| Act | Scenes | Status |
|---|---|---|
| 1. Anchor cases → cloud | (planned scene 0): introduce 3–4 hand-picked incidents, dissolve into the cluster | Not started |
| 1b. Scale | Scene 1: cluster of ~2,200 dots colored by tech bucket | Done |
| 2. Timeline by tech | Scene 2: overview · Scenes 3–8: six era walkthroughs (ML era → 2026 partial) · Scene 9: fatal incidents spotlight · Scene 10: accountability-rate line overlay | Done; copy is provisional |
| 3. Accountability gap | Scene 11: response-based split into two clusters | Done; victim regroup deferred |
| 4. Deep-dive (TBD) | Some specific accountability finding — needs to come from analysis, not be designed before the finding exists | Deferred |

## Key design decisions

### Interaction model: click-driven, not scroll-driven

Toolbar buttons trigger view changes. No scrollytelling library.

**Why.** Click works and the implementation surface is roughly half what scroll requires. We can revisit if the narrative grows enough that the continuity scroll provides becomes valuable.

**How it applies.** Each scene is a button. Within Scene 2 (and possibly 3), sub-stepping is also click-driven via ◀ ▶ buttons.

### Global year filter: 2015 onward (plus undated)

`createNodes()` in `data.js` filters out rows with `year < 2015` before any view sees them. Undated rows (year = null) are kept.

**Why.** The notebook analyses (`analysis/AIAAIC/explore.ipynb`) all use `range(2015, 2027)` for tech regime and accountability charts. The 40 pre-2015 incidents are also sparse outliers (1–13 per year, taxonomy not yet stable) and were producing a "pre-regime" era that was more about coding gaps than a real trend. Aligning the website with the notebook frame keeps the analysis grounded in what was actually studied.

**How it applies.** Cluster shows ~2,200 incidents (was 2,243). Timeline year columns start at 2015 (no 2008–2014 columns). The Undated column at the right still holds the 170 incidents with no year.

**Cost accepted.** Loses some narrative continuity (no longer "the whole AIAAIC corpus"), but gains analytical alignment.

### Data filtering: per-scene, not upstream

The cleaned CSV (`aiaaic_cleaned.csv`) retains all 2,243 incidents, including 609 with no harm coded and 170 with no parseable year. Filtering happens at the visualization layer, declared explicitly per scene.

**Why.**
- *Survivorship bias.* AIAAIC is volunteer-curated. Recent incidents (2024–26) are less fully coded because they're new; older incidents (2008–14) less because the taxonomy was less developed. Both ends of the timeline get disproportionately dropped by a global filter, distorting the curve.
- *The gap is the story.* The framing committed to in this project is "what we know and don't know." Dropping uncoded rows in `clean.py` would quietly contradict that frame and remove the visual moments where we can point at the gap.
- *Honest counts.* "AIAAIC has documented 2,243 incidents" survives. A filtered "~1,500 after filtering" invites "why filtered?" and the honest answer is exactly what we're trying to make visible.
- *Per-scene needs differ.* The accountability scene needs `has_response`; the victims scene needs harm coded. A single upstream filter forces these to overlap; a per-scene filter lets each declare what it actually requires.

**How it applies.**
- Scene 2 (timeline): all 2,243. Uncoded → gray. Undated → rightmost "Undated" column.
- Scene 3 (victims, TBD): probably filter to harm-coded only, with caption stating the filter.
- Scene 4 (accountability deep-dive, TBD): filter to known-response only, with caption.

**Cost accepted.** More conditional rendering code per scene than if everything were pre-filtered.

### Color encoding: primary technology bucket (was: harm bucket)

Every view colours dots by their **primary technology**, not their primary harm. Buckets: Generative AI, Machine learning, Facial recognition, Deepfake, Computer vision, Self-driving, Other / mixed. Source of truth: `website/src/tech_buckets.js`.

**Why technology, not harm.** The headline finding from `analysis/AIAAIC/explore.ipynb` (cell 8, "Technology regime change — GenAI displaces prior risk landscape") is about *which* technologies produce incidents, not which *harms* they produce. Coloring by tech makes the regime change visible directly — the GenAI wedge appears in 2023 and grows. Coloring by harm would tell a different (and noisier — 27% uncoded) story.

**Why one palette across all views.** Cluster, timeline, and accountability all use the same tech palette. A purple dot is GenAI everywhere. The legend stays visible across views.

**Rule for primary tech.** First matching boolean flag in priority order: `is_generative_ai → is_facial_recognition → is_deepfake → is_self_driving_system → is_computer_vision → is_machine_learning → other`. GenAI is checked first because the regime-change narrative treats GenAI as absorbing categories that would have been deepfake/CV pre-2022.

**Harm bucketing is preserved for Scene 3.** `harm_buckets.js` and `HARM_TAXONOMY.md` stay in the codebase; the victim scene will still use them. They are simply not the timeline's colour signal.

### Cluster dot radius: 5 px (Option B)

The cluster (and accountability split) views use 5 px dot radius; the timeline view uses 2.5 px. The radius tween animates smoothly between them across view transitions.

**Why.** Three options were compared in `website/mockup.html`: 8 px everywhere (the original), 2.5 px everywhere (no size change), and 5 px / 2.5 px (compromise). At 5 px the cluster still reads as a distinct cloud, and the shrink to the timeline is 2× rather than 3.2× — half the visual disruption.

**How it applies.** `defaultRadius` (in `constants.js`) is the source of truth. `data.js` uses it as the initial node radius; `simulation.js` uses it as the tween target for `restoreFreeForm()`. Timeline uses `timelineRadius` (2.5) as the tween target.

### Timeline layout: 12 year columns + Undated column at right

After the 2015+ year filter, the timeline has 12 year columns (2015 → 2026) plus a dedicated rightmost "Undated" column holding the 170 incidents with no extractable year.

**Why.** Consistent with the "include gaps as the story" framing. Undated incidents are real incidents, not noise — keeping them visible lets viewers see how much of the corpus is uncoded without distorting the year axis.

### Accountability metric: `has_consequence`

The accountability-line scene plots the per-year share of incidents with a documented consequence, not a documented response.

**Why.** Notebook cell 17 (`acct_yr = dfy.groupby("year")["has_consequence"].mean() * 100`) is the source of the headline finding: 55% in 2015 → 15% in 2024. Using a different metric on the website would tell a different story and divorce the visualization from the analysis it claims to surface.

**Reporting-lag treatment.** The last two real-year columns (2025 + 2026 partial) are flagged in `simulation.js` as lag-affected. The renderer paints them with hollow markers and a dashed connector so the partial recovery to 28–30% reads as "still incomplete" rather than "the gap closed."

### Fatal-incidents visual: sink to bottom of year column

When the fatal-incidents scene activates, dots re-sort within each year column so fatal incidents (rows where "Loss of life" appears in `harm_individual` or `harm_societal`, matching notebook cell 45) cluster at the bottom. Non-fatal dots float up and are painted gray + heavily dimmed.

**Why.** An earlier attempt to spotlight fatal dots by enlarging them and adding a red glow looked visually noisy and "really bad" per the user. Sinking them to the bottom of each column creates a colored horizontal stripe across the chart that reads as a sub-chart of fatal-incident counts per year, while preserving the actual dot positions inside the existing layout.

**Implementation.** `computeTimelineTargets` takes a `fatalFirst` option that flips the within-column sort. `fatalSpotlightLayout()` exports the same forces as `timelineLayout()` but with the option set. `main.js` dispatches between the two via a `layoutIdFor(scene)` helper so the transition fires only when entering or leaving the fatal scene.

### Scene stepper architecture: single index, layout-id dispatch

Navigation state collapsed to one variable: `currentSceneIdx`. The `SCENES` array in `narrative.js` is the source of truth for both the story spine and the per-scene copy.

**View changes** (cluster → timeline, timeline → split) trigger the corresponding layout function. **Within-view scene changes** (era → era, era → fatal, fatal → accountability line) compare a derived `layoutIdFor(scene)` and re-fire the layout only if the layout id changed. So stepping between eras is free (just dimming + annotation), but entering/leaving the fatal scene re-sorts the histogram.

### Multi-victim representation (Scene 3): dot-matrix duplication

301 of 809 harm_individual-coded incidents are tagged with multiple victim types. Provisional decision: in Scene 3, dots will appear in every category they touch, with a caption explaining the duplication. The visual inflation is itself the message.

**Status.** Decision provisional, not yet built. Other candidates (sankey, UpSet plot, petal glyphs) were considered and ranked below dot-matrix for continuity with the dot metaphor and narrative honesty.

## Open questions

- **Scene 4 headline finding.** What pattern does the data actually show about which incidents lead to consequences? Needs notebook analysis before view design.
- **Scene 1 anchor cases.** Three slots tentatively filled by hand-picked AIAAIC entries (chatbot, facial recognition, deepfake). Fourth slot (politics/war/missile) needs identification in the corpus.
- **Falling animation.** Current cluster → timeline transition is a smooth force-eased flow, not a literal rain from above the canvas. Decide whether the literal "falling" effect is worth the two-phase animation work or whether the current motion is sufficient.
- **Narrative copy refinement.** Era body strings in `narrative.js` are provisional and grounded only in the volume curve + notebook headline numbers. When you return to copy, the dip-year (2022) and partial-year (2026) entries are the weakest and worth a rewrite.

## Style / visual tuning — deferred

Visual polish was paused to focus on narrative mechanism. When returning to it, these are the load-bearing knobs and their current values:

**`constants.js`**
- `defaultRadius = 5` — cluster / split dot radius
- `timelineRadius = 2.5` — timeline dot radius (max value before 2024 overflows)
- `timelineDotPitch = 6` — centre-to-centre spacing in the timeline grid
- `forceStrength = 0.03` — shared by `forceX`, `forceY`, and the charge multiplier in cluster/split views; changing this alone scales speed without changing shape
- `timelineMargin = { top: 60, right: 40, bottom: 45, left: 60 }` — chart inset

**`simulation.js`**
- `charge(d) = -d.radius² × forceStrength` — repulsion. To decouple cluster size from radius (so radius changes don't shrink the cluster), replace `forceStrength` here with a fixed constant.
- `setupSimulation … velocityDecay(0.2)` — global damping
- `timelineLayout`: `forceX/Y strength = 0.05`, `velocityDecay(0.25)` — settle rate when falling into the timeline
- `radiusTween`'s `d.radius += delta * 0.1` — radius animation rate, ~30 ticks to settle

**`renderer.js`**
- `dimmedAlpha = 0.18` — opacity for off-era dots in timeline view

**Known visual issues to revisit**
- Cluster footprint shrank ~30% when `defaultRadius` dropped 8 → 5 because charge ∝ radius². Compensate by either lowering `forceX/Y` strength in `groupBubbles()` or using a fixed charge constant.
- Page title `<h1>AIAAIC Accountability</h1>` no longer fits the broader narrative scope; revisit when the scene list stabilizes.
- Toolbar buttons currently hidden; decide whether they return as a chapter jumper or are removed entirely.

## Implementation status snapshot

Done:
- Scene stepper mechanism (◀ ▶, 11 scenes, layout-id dispatch)
- Cluster view (Scene 1): tech-colored bubble cloud, ~2,200 dots
- Timeline overview (Scene 2): stacked histogram by year, tech-bucket palette, 12 year columns + Undated
- Era walkthrough (Scenes 3–8): 6 eras with dimming and notebook-grounded annotation copy
- Fatal incidents spotlight (Scene 9): re-sorts column so fatal dots cluster at bottom, gray-ghosted non-fatal background, "25 in 2025" canvas caption
- Accountability-rate line overlay (Scene 10): per-year `has_consequence` line over dimmed histogram, dashed lag tail
- Accountability gap split (Scene 11): two-cluster regroup by `has_response`
- Tech legend (always visible, 7 buckets)
- Smooth radius + position transitions between all view changes
- Year filter to 2015+ at the data layer
- Tooltip with headline / org / tech / year
- Mockup file (`website/mockup.html`) for cluster radius design exploration
- Harm taxonomy preserved (`harm_buckets.js`, `HARM_TAXONOMY.md`) for Scene 3 future use

Pending:
- "Falling" entry animation (current transition is smooth force-ease; literal rain would need two-phase animation)
- Scene 1 case-study sequence (anchor cases dissolving into the cluster)
- Scene 3 victim regrouping (dot-matrix duplication, harm-bucket colors)
- Visual polish — cluster shrunk ~30% after the radius drop, page `<h1>` outdated, color palette refinement
- Notebook-grounded copy refinement (era bodies are provisional)

Source files (all under `website/src/`):
- `main.js` — scene stepper, layout dispatch, tooltip
- `data.js` — node creation, year filter, `isFatal` flag
- `narrative.js` — `TIMELINE_ERAS` and `SCENES`
- `simulation.js` — d3 forces, `timelineLayout`, `fatalSpotlightLayout`, radius tween, year axis
- `renderer.js` — `drawFrame`, accountability line, year axis labels, fatal caption
- `tech_buckets.js` — primary tech assignment, palette, stacking order
- `harm_buckets.js` — preserved for future victim scene
- `constants.js` — radii, margins, force strength


