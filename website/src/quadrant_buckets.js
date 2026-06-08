// quadrant_buckets.js
// Quadrant Act (Scenes Q1–Q5). Each row is placed into one of four buckets
// based on (has_consequence × has_response). Axes match the spec:
//   x = consequence (right = has_consequence)
//   y = response    (top   = has_response)
// So the four quadrants are:
//   top-right    = both
//   top-left     = response only
//   bottom-right = consequence only
//   bottom-left  = neither


// --- Quadrant assignment --------------------------------------------------

export function quadrantOf(row) {
  const hc = row.has_consequence === 'True';
  const hr = row.has_response === 'True';
  if (hc && hr) return 'both';
  if (hr)       return 'resp-only';
  if (hc)       return 'cons-only';
  return 'neither';
}


// --- Quadrant centers (Scene Q1, Q2, Q5) ----------------------------------
// Canvas is 940 × 600. neither holds ≈1322 dots so its center is pushed
// slightly toward the bottom-left corner to give the cluster room. The
// quadrant dividers are still at the canvas midlines (x=470, y=300).

export const QUADRANT_LAYOUT = {
  'both':       { x: 700, y: 170, label: 'Both' },
  'resp-only':  { x: 240, y: 170, label: 'Response only' },
  'cons-only':  { x: 700, y: 440, label: 'Consequence only' },
  'neither':    { x: 200, y: 440, label: 'Neither' },
};

export const QUADRANT_DIVIDERS = { x: 470, y: 300 };

// Bar layout for Scenes Q3 / Q4. Bars stack UP from BREAKDOWN_BASELINE_Y,
// matching the timeline view's chartBottom convention.
export const BREAKDOWN_BASELINE_Y = 540;
export const BREAKDOWN_BAR_SUBCOLS = 4;
export const BREAKDOWN_BAR_PITCH   = 5;   // matches timelineDotPitch


// --- Shared tag parser ----------------------------------------------------

function tagset(raw) {
  if (!raw || !String(raw).trim()) return new Set();
  return new Set(String(raw).split(';').map(t => t.trim()).filter(t => t));
}


// --- Consequence breakdown (Scene Q3) -------------------------------------
// Each row with hasConsequence=true gets a single primary consequence tag
// (priority = frequency). Used to spread the right column horizontally.

const CONS_PRIORITY = [
  { id: 'litigation',            tags: ['Litigation'] },
  { id: 'regulatory',            tags: ['Regulatory investigation'] },
  { id: 'fine',                  tags: ['Fine/settlement'] },
  { id: 'police',                tags: ['Police investigation'] },
  { id: 'legal-complaint',       tags: ['Legal complaint'] },
  { id: 'legislative-complaint', tags: ['Legislative complaint'] },
  { id: 'legislator-letter',     tags: ['Legislator letter'] },
  { id: 'legal-warning',         tags: ['Legal warning'] },
];

export function primaryConsequence(row) {
  const tags = tagset(row.consequence);
  if (tags.size === 0) return null;
  for (const p of CONS_PRIORITY) {
    if (p.tags.some(t => tags.has(t))) return p.id;
  }
  return 'other-cons';
}

// Horizontal layout: bar center x per category. Each bar stacks UP from
// BREAKDOWN_BASELINE_Y. y is computed per-dot by computeBreakdownTargets.
export const CONS_BREAKDOWN_TARGETS = {
  'litigation':            { x: 124, label: 'Litigation' },
  'regulatory':            { x: 213, label: 'Regulatory inv.' },
  'fine':                  { x: 302, label: 'Fine / settlement' },
  'police':                { x: 391, label: 'Police inv.' },
  'legal-complaint':       { x: 480, label: 'Legal complaint' },
  'legislative-complaint': { x: 569, label: 'Legislative complaint' },
  'legislator-letter':     { x: 658, label: 'Legislator letter' },
  'legal-warning':         { x: 747, label: 'Legal warning' },
  'other-cons':            { x: 836, label: 'Other' },
};

export const CONS_BREAKDOWN_ORDER = [
  'litigation', 'regulatory', 'fine', 'police',
  'legal-complaint', 'legislative-complaint', 'legislator-letter', 'legal-warning',
  'other-cons',
];


// --- Response breakdown (Scene Q4) ----------------------------------------

const RESP_PRIORITY = [
  { id: 'sys-review',      tags: ['System review/update'] },
  { id: 'sys-termination', tags: ['System termination'] },
  { id: 'sys-suspension',  tags: ['System suspension'] },
  { id: 'content-removal', tags: ['Content/data removal'] },
  { id: 'policy-update',   tags: ['Policy review/update', 'Policy update'] },
  { id: 'public-apology',  tags: ['Public apology'] },
];

export function primaryResponse(row) {
  const tags = tagset(row.response);
  if (tags.size === 0) return null;
  for (const p of RESP_PRIORITY) {
    if (p.tags.some(t => tags.has(t))) return p.id;
  }
  return 'other-resp';
}

export const RESP_BREAKDOWN_TARGETS = {
  'sys-review':      { x: 137, label: 'System review / update' },
  'sys-termination': { x: 251, label: 'System termination' },
  'sys-suspension':  { x: 365, label: 'System suspension' },
  'content-removal': { x: 480, label: 'Content / data removal' },
  'policy-update':   { x: 594, label: 'Policy update' },
  'public-apology':  { x: 708, label: 'Public apology' },
  'other-resp':      { x: 822, label: 'Other' },
};

export const RESP_BREAKDOWN_ORDER = [
  'sys-review', 'sys-termination', 'sys-suspension', 'content-removal',
  'policy-update', 'public-apology', 'other-resp',
];


// --- Live computations from node array ------------------------------------
// Both functions iterate the dataset once and are called at simulation
// init, then stored. They aren't called per frame.

export function quadrantPercentages(nodes) {
  const tot = nodes.length || 1;
  const counts = { both: 0, 'resp-only': 0, 'cons-only': 0, neither: 0 };
  for (const d of nodes) counts[d.quadrant]++;
  const result = {};
  for (const k in counts) result[k] = { n: counts[k], pct: counts[k] / tot * 100 };
  return result;
}

// Assign deterministic scatter positions per dot within each quadrant.
// We use a Vogel (sunflower) spiral so the cluster fills a disk evenly without
// the visible bands a regular grid would produce. neither has so many dots
// (≈1322) that we squash the disk into a wide ellipse to fit the bottom-left
// quadrant without overflowing into the divider.
//
// These positions are precomputed once and stored on the node as
// quadrantTx / quadrantTy, so every quadrant-act scene can reuse the same
// resting positions for dim dots without re-running force clustering.
export function assignQuadrantScatter(nodes) {
  const byQuadrant = {};
  for (const d of nodes) {
    (byQuadrant[d.quadrant] = byQuadrant[d.quadrant] || []).push(d);
  }

  const golden = Math.PI * (3 - Math.sqrt(5));   // ≈137.5°

  for (const q in byQuadrant) {
    const dots = byQuadrant[q];
    const center = QUADRANT_LAYOUT[q];
    // Spacing controls cluster radius — smaller spacing packs tighter.
    // neither has 1322 dots so we both pack tighter AND squash horizontally.
    const spacing = q === 'neither' ? 4.0 : 5.0;
    const aspectX = q === 'neither' ? 1.3 : 1.0;
    const aspectY = q === 'neither' ? 0.8 : 1.0;

    dots.forEach((d, i) => {
      const r = Math.sqrt(i + 0.5) * spacing;
      const angle = i * golden;
      d.quadrantTx = center.x + r * Math.cos(angle) * aspectX;
      d.quadrantTy = center.y + r * Math.sin(angle) * aspectY;
    });
  }
}


// For Scene Q2: which tech bucket dominates each quadrant. Returns the top
// bucket name + its count + the quadrant total, per quadrant id.
export function dominantTechPerQuadrant(nodes) {
  const counts = {};
  for (const d of nodes) {
    const q = d.quadrant;
    if (!counts[q]) counts[q] = {};
    counts[q][d.bucket] = (counts[q][d.bucket] || 0) + 1;
  }
  const result = {};
  for (const q in counts) {
    const ranked = Object.entries(counts[q]).sort((a, b) => b[1] - a[1]);
    const total = Object.values(counts[q]).reduce((s, v) => s + v, 0);
    result[q] = {
      top:    ranked[0],         // [bucket, count]
      second: ranked[1] || null, // [bucket, count] or null if only one bucket present
      total,
    };
  }
  return result;
}
