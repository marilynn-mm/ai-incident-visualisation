# Project — AI Incident Data Visualization

A click-driven narrative visualization of the AI harm landscape, built on the AIAAIC database (2,243 documented incidents, 2008–2026). The project comprises a Python data-cleaning pipeline and a static D3 + Canvas website that tells the story in 3–4 scenes.

This document records the project framing, the planned narrative arc, and the design decisions made so far — including the rationale behind each. It is a living doc; update it when decisions change so future-you (and future collaborators) don't re-litigate settled questions.

For codebase mechanics, see `CLAUDE.md`. For the data pipeline, see `analysis/AIAAIC/README.md`. For the harm bucket taxonomy, see `analysis/AIAAIC/HARM_TAXONOMY.md`.

## Framing

The story this project tells is **"what we know and what we don't know about AI harm"** — not a cleaned landscape view. Data gaps (missing year, missing harm coding, declining response coverage) are part of the narrative, not noise to suppress. This framing shapes nearly every design decision below.

## Narrative arc

| Scene | Goal | Status |
|---|---|---|
| 1. Anchor cases → cloud | Establish stakes via 3–4 specific incidents, then dissolve into the full 2,243-dot field. Introduce AIAAIC and limitations. | Not started |
| 2. Timeline by harm | Stacked histogram by year, dots colored by primary harm bucket. Click-stepper through trend eras (early trickle → ramp → surge → GenAI explosion). | Static layout done; stepper, annotations, legend, falling animation pending |
| 3. Accountability gap | Which incidents have consequences/responses? Reorganize by victim category. | Response split done; victim reorganization TBD |
| 4. Deep-dive (TBD) | Some specific accountability finding — needs to come from analysis, not be designed before the finding exists. | Deferred |

## Key design decisions

### Interaction model: click-driven, not scroll-driven

Toolbar buttons trigger view changes. No scrollytelling library.

**Why.** Click works and the implementation surface is roughly half what scroll requires. We can revisit if the narrative grows enough that the continuity scroll provides becomes valuable.

**How it applies.** Each scene is a button. Within Scene 2 (and possibly 3), sub-stepping is also click-driven via ◀ ▶ buttons.

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

### Timeline layout: 19 year columns + Undated column at right

170 incidents have no extractable year (both `year` and `occurred` blank). They get a dedicated rightmost "Undated" column, not dropped, not mis-bucketed into a phantom year-0 slot.

**Why.** Consistent with the "include gaps as the story" framing. Lets viewers see how many incidents are undocumented without distorting the year axis.

### Multi-victim representation (Scene 3): dot-matrix duplication

301 of 809 harm_individual-coded incidents are tagged with multiple victim types. Provisional decision: in Scene 3, dots will appear in every category they touch, with a caption explaining the duplication. The visual inflation is itself the message.

**Status.** Decision provisional, not yet built. Other candidates (sankey, UpSet plot, petal glyphs) were considered and ranked below dot-matrix for continuity with the dot metaphor and narrative honesty.

## Open questions

- **Scene 4 headline finding.** What pattern does the data actually show about which incidents lead to consequences? Needs notebook analysis before view design.
- **Scene 1 anchor cases.** Three slots filled by hand-picked AIAAIC entries (chatbot, facial recognition, deepfake). Fourth slot (politics/war/missile) needs identification in the corpus.
- **Color palette refinement.** Current 8-color swatch is first-pass; may need adjustment for distinguishability and semantic feel.
- **Stepper era boundaries.** Provisional eras (early trickle → ramp → surge → GenAI explosion → sustained). Annotation copy not yet written.

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

- ✓ `All Incidents` view — technology-colored bubble cloud
- ✓ `Accountability Gap` view — split by `has_response`
- ✓ `Timeline by Harm` view — static stacked histogram by year, harm-bucket colors, year axis with Undated column
- ☐ Legend for harm buckets (immediate next step)
- ☐ Era stepper and annotation panel
- ☐ "Falling" entry animation
- ☐ Scene 1 case-study sequence
- ☐ Scene 3 victim matrix


