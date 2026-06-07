// consequence_buckets.js
// Region assignment and layout for State 2 (consequence split with Venn).
// Each incident is placed into exactly one region based on its consequence
// tag set. The Venn covers the top-3 categories; Lit + Police gets its own
// bridge cluster; the next 4 frequencies become named side clusters; the
// long tail collapses into Other. See PROJECT.md and analysis notebook
// cells 19–22 for the rationale.

const TOP3       = ['Litigation', 'Regulatory investigation', 'Fine/settlement'];
const LIT        = TOP3[0];
const REG        = TOP3[1];
const FINE       = TOP3[2];
const BRIDGE_TAG = 'Police investigation';

// Order matters: each row goes to the FIRST matching side category.
export const NAMED_SIDE_CATEGORIES = [
  { id: 'police',                label: 'Police investigation' },
  { id: 'legislative-complaint', label: 'Legislative complaint' },
  { id: 'legal-complaint',       label: 'Legal complaint' },
  { id: 'legislator-letter',     label: 'Legislator letter' },
  { id: 'legal-warning',         label: 'Legal warning' },
];

function tagset(raw) {
  if (!raw || !String(raw).trim()) return new Set();
  return new Set(String(raw).split(';').map(t => t.trim()).filter(t => t));
}

// Returns one of:
//   'no-consequence'
//   'venn-lit' | 'venn-reg' | 'venn-fine'
//   'venn-lit-reg' | 'venn-lit-fine' | 'venn-reg-fine' | 'venn-all'
//   'bridge'   (Litigation + Police investigation, regardless of other top-3)
//   'side-police' | 'side-legislative-complaint' | ...
//   'other'
export function consequenceRegion(row) {
  const tags = tagset(row.consequence);
  if (tags.size === 0) return 'no-consequence';

  const inLit  = tags.has(LIT);
  const inReg  = tags.has(REG);
  const inFine = tags.has(FINE);
  const inPolice = tags.has(BRIDGE_TAG);
  const hasTop3 = inLit || inReg || inFine;

  // Bridge takes priority over Venn placement when both Lit and Police apply.
  // This is the only cross-category combination we visualize explicitly.
  if (inLit && inPolice) return 'bridge';

  if (hasTop3) {
    if (inLit && inReg && inFine) return 'venn-all';
    if (inLit && inReg)  return 'venn-lit-reg';
    if (inLit && inFine) return 'venn-lit-fine';
    if (inReg && inFine) return 'venn-reg-fine';
    if (inLit)  return 'venn-lit';
    if (inReg)  return 'venn-reg';
    if (inFine) return 'venn-fine';
  }

  for (const cat of NAMED_SIDE_CATEGORIES) {
    if (tags.has(cat.label)) return `side-${cat.id}`;
  }
  return 'other';
}


// Layout config — all coordinates are canvas pixels (940 × 600).
// The has-consequence side is wrapped in a big oval container; sub-cluster
// outlines are deliberately spare so the oval reads as "one group, with
// internal structure" rather than "many competing shapes".
export const VENN_LAYOUT = {
  // Big undifferentiated cluster on the left — the dominant population.
  noConsequence: { x: 160, y: 310, r: 140, count: 1650,
                   label: 'No consequence' },

  // Has-consequence oval container — encompasses every sub-cluster below
  hasConsequence: { x: 620, y: 310, rx: 290, ry: 215, count: 553,
                    label: 'Has consequence' },

  // Three Venn circles inside the oval (top-left area).
  venn: {
    lit:  { x: 450, y: 220, r: 60, count: 272, label: 'Litigation' },
    reg:  { x: 530, y: 220, r: 44, count: 114, label: 'Regulatory investigation' },
    fine: { x: 485, y: 285, r: 34, count: 65,  label: 'Fine / settlement' },
  },

  // 7 within-Venn target points where dots cluster by region.
  vennRegionTargets: {
    'venn-lit':       { x: 420, y: 200 },
    'venn-reg':       { x: 555, y: 200 },
    'venn-fine':      { x: 485, y: 305 },
    'venn-lit-reg':   { x: 490, y: 200 },
    'venn-lit-fine':  { x: 458, y: 252 },
    'venn-reg-fine':  { x: 510, y: 252 },
    'venn-all':       { x: 488, y: 232 },
  },

  // Bridge cluster sits between the Venn and the Police side cluster.
  bridge: { x: 615, y: 225, r: 14, count: 6, label: 'Lit + Police' },

  // Side clusters along the right edge (inside the oval).
  // No background outline; the position + label is the only marker.
  sides: [
    { id: 'side-police',                target: { x: 715, y: 195 }, r: 22,
      count: 31, label: 'Police investigation' },
    { id: 'side-legislative-complaint', target: { x: 830, y: 145 }, r: 13,
      count: 11, label: 'Legislative complaint' },
    { id: 'side-legal-complaint',       target: { x: 830, y: 205 }, r: 12,
      count: 10, label: 'Legal complaint' },
    { id: 'side-legislator-letter',     target: { x: 830, y: 260 }, r: 12,
      count: 10, label: 'Legislator letter' },
    { id: 'side-legal-warning',         target: { x: 830, y: 315 }, r: 11,
      count: 9,  label: 'Legal warning' },
  ],

  // Long-tail bucket inside the oval (lower-left).
  other: { x: 460, y: 440, r: 38, count: 95, label: 'Other consequences' },
};

// Build a flat region→target map for O(1) layout lookup
export function buildTargetMap() {
  const map = new Map();
  map.set('no-consequence', { x: VENN_LAYOUT.noConsequence.x, y: VENN_LAYOUT.noConsequence.y });
  for (const [region, t] of Object.entries(VENN_LAYOUT.vennRegionTargets)) {
    map.set(region, { x: t.x, y: t.y });
  }
  map.set('bridge', { x: VENN_LAYOUT.bridge.x, y: VENN_LAYOUT.bridge.y });
  for (const s of VENN_LAYOUT.sides) {
    map.set(s.id, { x: s.target.x, y: s.target.y });
  }
  map.set('other', { x: VENN_LAYOUT.other.x, y: VENN_LAYOUT.other.y });
  return map;
}
