// tech_filters.js
// Tech-filter narrative (replaces the era-cycling timeline scenes).
// Each filter declares: which boolean flag on the node identifies it,
// the display label, and the color used for the harm-bar overlay.
// Matches the order the user wanted: GenAI → ML → FR → Deepfake → CV → AV.

import { TECH_BUCKET_COLORS, TECH_BUCKET_LABELS } from './tech_buckets.js';

export const TECH_FILTERS = [
  { id: 'genai',    flag: 'isGenAI',    bucket: 'genai',    label: TECH_BUCKET_LABELS.genai,    color: TECH_BUCKET_COLORS.genai },
  { id: 'ml',       flag: 'isML',       bucket: 'ml',       label: TECH_BUCKET_LABELS.ml,       color: TECH_BUCKET_COLORS.ml },
  { id: 'facial',   flag: 'isFacial',   bucket: 'facial',   label: TECH_BUCKET_LABELS.facial,   color: TECH_BUCKET_COLORS.facial },
  { id: 'deepfake', flag: 'isDeepfake', bucket: 'deepfake', label: TECH_BUCKET_LABELS.deepfake, color: TECH_BUCKET_COLORS.deepfake },
  { id: 'cv',       flag: 'isCV',       bucket: 'cv',       label: TECH_BUCKET_LABELS.cv,       color: TECH_BUCKET_COLORS.cv },
  { id: 'av',       flag: 'isAV',       bucket: 'av',       label: TECH_BUCKET_LABELS.av,       color: TECH_BUCKET_COLORS.av },
];

// Lookup by filter id (used by main.js and renderer.js)
export const TECH_FILTER_BY_ID = Object.fromEntries(TECH_FILTERS.map(f => [f.id, f]));


// Match the notebook recipe (explore.ipynb, "Harm types by technology type"):
// flatten harm_individual + harm_societal tag lists across all rows matching
// the tech flag, count occurrences, return top N descending.
export function topHarmTagsForTech(nodes, flag, topN = 8) {
  const counts = new Map();
  for (const d of nodes) {
    if (!d[flag]) continue;
    addTags(counts, d.harmIndividual);
    addTags(counts, d.harmSocietal);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

function addTags(counts, raw) {
  if (!raw || !String(raw).trim()) return;
  for (const t of String(raw).split(';')) {
    const tag = t.trim();
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
}
