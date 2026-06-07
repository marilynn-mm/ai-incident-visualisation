// response_buckets.js
// Region assignment and layout for State 3 (response split).
// Response is 94% single-coded, so no Venn — just named clusters inside an
// oval. Policy review/update, Policy update, and Public apology are merged
// into a single "Policy / apology" bucket because each is small.

// Priority order — each row goes to the FIRST matching bucket.
const PRIORITY = [
  { id: 'sys-review',      tags: ['System review/update'] },
  { id: 'sys-termination', tags: ['System termination'] },
  { id: 'sys-suspension',  tags: ['System suspension'] },
  { id: 'content-removal', tags: ['Content/data removal'] },
  { id: 'policy-apology',  tags: ['Policy review/update', 'Policy update', 'Public apology'] },
];

function tagset(raw) {
  if (!raw || !String(raw).trim()) return new Set();
  return new Set(String(raw).split(';').map(t => t.trim()).filter(t => t));
}

export function responseRegion(row) {
  const tags = tagset(row.response);
  if (tags.size === 0) {
    // No response → split by whether the row had a consequence. This is
    // what makes the State 2 → State 3 transition look like a flow rather
    // than a reset: the has-cons-no-resp dots end up in their own cluster
    // instead of merging back into a single "no response" group.
    return row.has_consequence === 'True'
      ? 'no-resp-has-cons'
      : 'no-resp-no-cons';
  }
  for (const p of PRIORITY) {
    if (p.tags.some(t => tags.has(t))) return p.id;
  }
  return 'other-response';
}

// Layout — three clusters arranged left-to-right:
//   - "No consequence, no response" (1322): far-left, big
//   - "Has consequence, no response" (417): beside it, smaller
//   - "Has response" (464): right, oval container with 6 sub-buckets
// The transition from State 2 reads as "consequence dots that picked up a
// response migrate right; the rest stay where they are but separate by
// whether they had a consequence."
export const RESPONSE_LAYOUT = {
  noRespNoCons: { x: 125, y: 320, r: 130, count: 1322,
                  label: 'No consequence', sublabel: '· no response' },

  noRespHasCons: { x: 365, y: 320, r: 78, count: 417,
                   label: 'Has consequence', sublabel: '· no response' },

  hasResponse: { x: 700, y: 310, rx: 220, ry: 200, count: 464,
                 label: 'Has response' },

  // 6 buckets inside the has-response oval.
  buckets: [
    { id: 'sys-review',      target: { x: 600, y: 215 }, r: 16,
      count: 194, label: 'System review / update' },
    { id: 'sys-termination', target: { x: 720, y: 195 }, r: 9,
      count: 51,  label: 'System termination' },
    { id: 'sys-suspension',  target: { x: 820, y: 195 }, r: 8,
      count: 41,  label: 'System suspension' },
    { id: 'content-removal', target: { x: 855, y: 290 }, r: 7,
      count: 27,  label: 'Content / data removal' },
    { id: 'policy-apology',  target: { x: 615, y: 410 }, r: 8,
      count: 32,  label: 'Policy / apology' },
    { id: 'other-response',  target: { x: 800, y: 400 }, r: 12,
      count: 119, label: 'Other responses' },
  ],
};

export function buildResponseTargetMap() {
  const map = new Map();
  map.set('no-resp-no-cons',  { x: RESPONSE_LAYOUT.noRespNoCons.x,  y: RESPONSE_LAYOUT.noRespNoCons.y });
  map.set('no-resp-has-cons', { x: RESPONSE_LAYOUT.noRespHasCons.x, y: RESPONSE_LAYOUT.noRespHasCons.y });
  for (const b of RESPONSE_LAYOUT.buckets) {
    map.set(b.id, { x: b.target.x, y: b.target.y });
  }
  return map;
}
