/*
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {
  width, height, center, splitCenters, forceStrength,
  defaultRadius, timelineMargin, timelineRadius, timelineDotPitch,
} from './constants.js';
import { TECH_BUCKET_ORDER } from './tech_buckets.js';

let simulation = null;
let yearAxis = null;   // { years: number[], colCenters: number[] } — set by computeTimelineTargets

// charge function
function charge(d) {
  return -Math.pow(d.radius, 2.0) * forceStrength;
}

// Per-tick radius interpolator. View changes set d.targetRadius; this nudges
// d.radius toward it at ~10% per tick so size changes animate smoothly
// across the same simulation ticks that move the dots.
function radiusTween() {
  let nodes;
  const tween = function() {
    for (const d of nodes) {
      if (d.targetRadius == null) continue;
      const delta = d.targetRadius - d.radius;
      if (Math.abs(delta) < 0.05) d.radius = d.targetRadius;
      else d.radius += delta * 0.1;
    }
  };
  tween.initialize = (ns) => { nodes = ns; };
  return tween;
}

export function setupSimulation(nodes, onTick) {
  nodes.forEach(d => { d.targetRadius = defaultRadius; });

  simulation = d3.forceSimulation(nodes)
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .force('radius', radiusTween())
    .on('tick', onTick);

  simulation.stop();
}

function restoreFreeForm() {
  // restore charge and damping; radius animates back to defaultRadius via
  // the radius tween rather than snapping
  // cluster size determined by forceManyBody (repulsion pushing nodes away from each other)
  //    and forceX / forceY (centering attraction pulling nodes toward the center point) 
  simulation.nodes().forEach(d => { d.targetRadius = defaultRadius; });
  simulation.force('charge', d3.forceManyBody().strength(charge));
  simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));
  simulation.velocityDecay(0.2);
}

export function groupBubbles() {
  restoreFreeForm();
  simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));
  simulation.alpha(1).restart();
}

export function splitByResponse() {
  restoreFreeForm();
  simulation.force('x', d3.forceX().strength(forceStrength).x(function(d) {
    return d.hasResponse ? splitCenters.responded.x : splitCenters.no_response.x;
  }));
  simulation.alpha(1).restart();
}

/*
 * Timeline view: deterministic stacked histogram by year, coloured by harm
 * bucket. Each dot gets an exact target (tx, ty); the force simulation eases
 * dots in from wherever they currently are.
 *
 * Layout per year column:
 *   - dots are filled bottom-up, row by row
 *   - within a row, dots are placed across `colsPerYear` sub-columns
 *   - within a year, dots are sorted by TECH_BUCKET_ORDER so buckets stack as
 *     horizontal layers (physical at the bottom, uncoded at the top)
 */
export function timelineLayout() {
  const nodes = simulation.nodes();
  computeTimelineTargets(nodes);

  // Smooth entry: no positional snap. Dots ease from their current
  // positions (cluster centre, accountability split, etc.) directly to
  // (tx, ty), while the radius tween shrinks them from defaultRadius to
  // timelineRadius over the same ticks. Equal x and y strengths so the
  // motion reads as a coherent settle rather than a horizontal blast
  // followed by vertical drift.
  nodes.forEach(d => { d.targetRadius = timelineRadius; });

  simulation.force('charge', null);
  simulation.force('x', d3.forceX().strength(0.05).x(d => d.tx));
  simulation.force('y', d3.forceY().strength(0.05).y(d => d.ty));
  simulation.velocityDecay(0.25);
  simulation.alpha(1).restart();
}

export function getYearAxis() {
  return yearAxis;
}

// Sentinel key for the rightmost column holding incidents with no year.
const UNDATED = '__undated__';

function computeTimelineTargets(nodes) {
  const realYears = Array.from(new Set(nodes.map(n => n.year)))
    .filter(y => Number.isFinite(y))
    .sort((a, b) => a - b);

  const hasUndated = nodes.some(n => n.year === null);
  // columnKeys mixes year numbers and the UNDATED sentinel; columnLabels
  // is what the axis renders.
  const columnKeys   = hasUndated ? [...realYears, UNDATED] : [...realYears];
  const columnLabels = hasUndated ? [...realYears.map(String), 'Undated'] : realYears.map(String);

  const chartLeft   = timelineMargin.left;
  const chartRight  = width - timelineMargin.right;
  const chartBottom = height - timelineMargin.bottom;
  const chartTop    = timelineMargin.top;
  const chartW = chartRight - chartLeft;

  const colW = chartW / columnKeys.length;
  // small inter-column gutter; tightened from 0.85 so 20 columns still fit
  // 2024's 404 dots at pitch=6
  const innerColW = colW * 0.92;
  const colsPerYear = Math.max(1, Math.floor(innerColW / timelineDotPitch));

  const colIndex   = new Map(columnKeys.map((k, i) => [k, i]));
  const colCenters = columnKeys.map((_, i) => chartLeft + colW * (i + 0.5));

  // group nodes by column key
  const byCol = new Map();
  for (const n of nodes) {
    const key = n.year === null ? UNDATED : n.year;
    if (!colIndex.has(key)) continue;
    if (!byCol.has(key)) byCol.set(key, []);
    byCol.get(key).push(n);
  }

  const orderIdx = new Map(TECH_BUCKET_ORDER.map((b, i) => [b, i]));

  byCol.forEach((colNodes, key) => {
    colNodes.sort((a, b) => {
      const ai = orderIdx.has(a.bucket) ? orderIdx.get(a.bucket) : TECH_BUCKET_ORDER.length;
      const bi = orderIdx.has(b.bucket) ? orderIdx.get(b.bucket) : TECH_BUCKET_ORDER.length;
      if (ai !== bi) return ai - bi;
      return a.id.localeCompare(b.id);
    });

    const centerX = colCenters[colIndex.get(key)];

    colNodes.forEach((node, i) => {
      const row    = Math.floor(i / colsPerYear);
      const subCol = i % colsPerYear;
      const offset = (subCol - (colsPerYear - 1) / 2) * timelineDotPitch;
      node.tx = centerX + offset;
      node.ty = chartBottom - row * timelineDotPitch - timelineRadius;
    });
  });

  // Clamp to top margin if any column overflows
  nodes.forEach(d => { if (d.ty < chartTop) d.ty = chartTop; });

  yearAxis = { columnLabels, colCenters, chartBottom };
}
