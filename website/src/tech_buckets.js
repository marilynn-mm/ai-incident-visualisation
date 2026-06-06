// tech_buckets.js
// Technology-bucket assignment and palette. Used everywhere a dot is
// coloured (cluster, timeline, accountability split).
//
// Bucketing follows the boolean flags added by clean.py
// (is_generative_ai, is_facial_recognition, etc.) checked in a priority
// order so each row gets exactly one bucket. See PROJECT.md and the
// 02_tech_regime_change chart in analysis/AIAAIC/explore.ipynb for the
// rationale.

// Stacking order (bottom → top in the timeline histogram), and the order
// the legend renders left → right.
export const TECH_BUCKET_ORDER = [
  'genai',
  'ml',
  'facial',
  'deepfake',
  'cv',
  'av',
  'other',
];

export const TECH_BUCKET_LABELS = {
  genai:    'Generative AI',
  ml:       'Machine learning',
  facial:   'Facial recognition',
  deepfake: 'Deepfake',
  cv:       'Computer vision',
  av:       'Self-driving',
  other:    'Other / mixed',
};

// Palette adapted from the notebook (analysis/AIAAIC/explore.ipynb cell 8).
export const TECH_BUCKET_COLORS = {
  genai:    '#6a51a3',  // purple
  ml:       '#3a80b8',  // blue
  facial:   '#16a085',  // teal
  deepfake: '#e07b39',  // coral
  cv:       '#e6a23c',  // amber
  av:       '#7f4a2e',  // brown
  other:    '#bbbbbb',  // light gray
};

// Primary tech bucket = first matching flag in priority order. Order
// matters because flags overlap: a generative deepfake is tagged as both
// genai and deepfake; checking genai first puts it in the genai bucket
// (matching the regime-change narrative, where GenAI absorbs categories
// that would have been "deepfake" pre-2022).
export function primaryTech(row) {
  if (row.is_generative_ai      === 'True') return 'genai';
  if (row.is_facial_recognition === 'True') return 'facial';
  if (row.is_deepfake           === 'True') return 'deepfake';
  if (row.is_self_driving_system === 'True') return 'av';
  if (row.is_computer_vision    === 'True') return 'cv';
  if (row.is_machine_learning   === 'True') return 'ml';
  return 'other';
}
