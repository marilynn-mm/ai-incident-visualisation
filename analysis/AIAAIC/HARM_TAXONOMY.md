# Harm Taxonomy — Visualization Buckets

This document explains how the AIAAIC harm vocabulary is reduced into a small set of buckets for color encoding in the website, and the tradeoffs that choice entails.

## The problem

AIAAIC codes harm across three columns:

- `harm_individual` — **67 distinct tags**, 1,293 mentions
- `harm_societal` — **92 distinct tags**, 1,787 mentions
- `harm_environmental` — 18 tags, 48 mentions

The long tail is severe: most tags appear ≤5 times, and many are near-duplicates from non-exhaustive cleaning (e.g. `Privacy` vs `Privacy loss`, `Loss of life` appearing in both individual and societal columns for the same event). A direct mapping from tag to color would need a 60+ swatch legend, which is unreadable.

The buckets defined below are the unit of color encoding throughout the website.

## Principle

**Bucket by kind of harm, not by who is harmed.**

The AIAAIC schema separates *who* is harmed (individual / societal / environmental) using three columns. The schema does *not* separate *what kind of harm* — that lives inside the tag itself. For a visualization that asks "what is the landscape of AI harm?" the salient signal is the kind of harm, not which column it was coded under.

Concretely: an incident where `harm_individual: Loss of life` and `harm_societal: Loss of life` is the same conceptual harm twice. Both should map to the same color bucket (Physical / safety) regardless of which column they were entered in.

This means we **flatten across the three columns** when assigning buckets — we treat the union of all harm tags as a single tag-set per incident.

## The buckets

After flattening and assigning by kind-of-harm, with a 6th bucket added for purely-societal tags that don't fit the first five:

| Bucket | Tag mentions (ind + soc) | Unique incidents touched |
|---|---:|---:|
| Privacy / dignity | 778 | **636** |
| Financial / economic | 738 | **524** |
| Psychological | 505 | **437** |
| Civil rights / fairness | 401 | **343** |
| Physical / safety | 441 | **300** |
| Societal / institutional | 216 | **191** |
| Environmental | 48 | **37** |
| Other / uncategorized | 1 | 1 |

**Why a separate Societal / institutional bucket?** Tags like *Institutional trust loss* (71 mentions), *Erosion of community wellbeing* (24), *Societal destabilisation* (20), *Erosion of democratic integrity*, *Political polarisation* are collective harms with no analogue in `harm_individual`. They don't sit comfortably in any of the five person-level buckets, and folding them into "Other" would hide a coherent and increasingly important class of harm (especially post-2020).

**Why Environmental is its own bucket despite being small.** 37 incidents is genuinely small, but the bucket lets us seed an "environmental cost of AI" thread in later scenes without retroactively rebucketing. If it stays a footnote, we can fold it into Other later — the reverse is harder.

## Tag-to-bucket mapping

The full mapping lives in `website/src/harm_buckets.js` (the source of truth). Synopsis:

**Physical / safety** — Loss of life, Bodily injury, Property damage, Health deterioration, Trauma, Operational disruption, Critical infrastructure damage, Damage to public safety, Damage to public health, Safety.

**Financial / economic** — Financial loss, Job loss/losses, Opportunity loss, IP/copyright loss, Fraud, Bankruptcy, Loss of livelihood, Market value loss, Service quality erosion, House foreclosure, plus near-duplicates (IP loss, Copyright loss, Copyright abuse, Benefits loss, etc.).

**Civil rights / fairness** — Discrimination, Loss of rights/freedoms, Autonomy/agency loss, Stereotyping, Marginalisation, Societal inequality, Loss of liberty, Loss of right to information, Loss of right to liberty and security, Financial exclusion, Benefits denial, Unconstitutional.

**Privacy / dignity** — Privacy loss, Confidentiality loss, Reputational damage, Dignity loss, Defamation, Personality rights loss, Identity theft, Identity loss, Misrepresentation, Dehumanisation/objectification, Sexualisation, Public humiliation, Sexual exploitation, Appropriation, Surveillance, Authenticity/integrity, Loss of integrity.

**Psychological** — Anxiety/distress, Harassment, Deception/manipulation, Intimidation, Stigmatisation, Addiction, Psychosis, Emotional dependency, Isolation, Chilling effect, Manipulation, Radicalisation, Victimisation, Desensitisation, Over-reliance.

**Societal / institutional** — Institutional trust loss, Erosion of democratic integrity, Societal destabilisation, Information ecosystem degradation, Political polarisation, Erosion of community wellbeing, Damage to national security, Historical revisionism, Voter manipulation, Cultural identity erosion, Cultural damage, Resource diversion, Competitive loss, Market distortion/monopolisation, Trust loss, Loss of trust, Creativity loss, Public service delivery deterioration.

**Environmental** — all tags in the `harm_environmental` column (Ecological/biodiversity loss, Air pollution, Noise pollution, Excessive energy consumption, Water pollution, Excessive carbon emissions, etc.).

**Other / uncategorized** — `Exploitation` (1 mention) is the only tag in the corpus that doesn't fit; treated as Other.

## Counting conventions

Two ways to count, with different visual consequences:

- **Tag mentions** — `Loss of life` coded in both individual and societal columns for one incident counts twice. Honest about coding density, inflates stack heights above actual incident counts.
- **Unique incidents** — the same incident counts once per bucket regardless of how many columns its tags came from. Stack heights add up correctly to "incidents that year." For incidents that touch multiple buckets, a rule is needed for which bucket the dot lives in.

We use **unique incidents** as the count convention site-wide. Stack heights should match per-year incident counts.

## Per-scene application

### Scene 2 (timeline)
Each dot gets exactly one color. Rule: **primary harm = first listed tag in the first non-empty harm column**, in the order `harm_individual → harm_societal → harm_environmental`. The first tag is what the curator entered first; treating it as "primary" is pragmatic and deterministic.

Incidents with no harm coded in any column (~609 / 2,243 = 27%) render as **gray**, both to preserve their presence in the year totals and to make data-coverage gaps visible as part of the limitations story.

### Scene 3 (victims) — TBD
The "reorganize by victims" view will deliberately allow a single dot to appear in multiple buckets (matrix-style), counted per bucket. The multi-coding is the point of that scene, not a problem to suppress. Conventions documented here when the design lands.

## Known caveats

- 27% of incidents have no harm coded at all. Decisions made: show as gray, do not drop.
- Some tags are spelling variants from incomplete cleaning (e.g. `Privacy` vs `Privacy loss`, `Job elegibility` vs `Job eligibility`). These are mapped to the same bucket, so the bucketing is robust to those typos even though the underlying clean isn't perfect.
- The first-tag-as-primary rule for Scene 2 will sometimes pick a less-salient harm if the curator's data-entry order didn't reflect importance. This is a known limitation of using the data without re-curation. The aggregate composition trends survive this noise; individual dot colors are only suggestive.
- Tag-mention counts in the table above include the same incident's tags in multiple columns. The "Unique incidents" column is the right number to cite when describing landscape size.
