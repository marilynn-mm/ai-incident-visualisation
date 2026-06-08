/*
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {
  width, height, center, splitCenters, forceStrength,
  defaultRadius, timelineMargin, timelineRadius, timelineDotPitch,
  vennRadius,
} from './constants.js';
import { TECH_BUCKET_ORDER } from './tech_buckets.js';
import { buildTargetMap } from './consequence_buckets.js';
import { buildResponseTargetMap } from './response_buckets.js';
import {
  QUADRANT_LAYOUT,
  CONS_BREAKDOWN_TARGETS, RESP_BREAKDOWN_TARGETS,
  VERTICAL_BAR_BASELINE_Y, VERTICAL_BAR_SUBCOLS, VERTICAL_BAR_PITCH,
  HORIZONTAL_BAR_LEFT_X, HORIZONTAL_BAR_SUBROWS, HORIZONTAL_BAR_PITCH,
  quadrantPercentages, dominantTechPerQuadrant, assignQuadrantScatter,
} from './quadrant_buckets.js';

let simulation = null;
let yearAxis = null;   // { years: number[], colCenters: number[] } — set by computeTimelineTargets
let quadrantStats = null;  // { percentages, dominantTech } — computed once on first quadrant layout

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

// export function splitByResponse() {
//   restoreFreeForm();
//   simulation.force('x', d3.forceX().strength(forceStrength).x(function(d) {
//     return d.hasResponse ? splitCenters.responded.x : splitCenters.no_response.x;
//   }));
//   simulation.alpha(1).restart();
// }

// Consequence Venn view: each dot is pulled toward its consequenceRegion's
// target point. Charge keeps dots inside a region from collapsing onto a
// single pixel; the (tx, ty) targets do the heavy lifting of region
// assignment. Background outlines and labels are drawn by the renderer.
// export function consequenceVennLayout() {
//   applyRegionForces(buildTargetMap(), d => d.consequenceRegion);
// }

// Response split view: same mechanism as consequenceVennLayout, just with
// a different region→target map.
// export function responseBubblesLayout() {
//   applyRegionForces(buildResponseTargetMap(), d => d.responseRegion);
// }


// --- Quadrant Act -------------------------------------------------
// All five scenes use the timeline-style force profile (no repulsion, weak
// forceX/forceY toward exact per-dot (tx, ty) targets).
//
// Q3 and Q4 swap the active-half dots from scatter positions to a bar grid
// computed by computeVerticalBarTargets or computeHorizontalBarTargets

export function quadrantLayout() {
  ensureQuadrantStats();
  const nodes = simulation.nodes();
  nodes.forEach(d => {
    d.tx = d.quadrantTx;
    d.ty = d.quadrantTy;
    d.targetRadius = timelineRadius;
  });
  applyTimelineForces();
}

export function consequenceBreakdownLayout() {
  ensureQuadrantStats();
  const nodes = simulation.nodes();
  const activeNodes = nodes.filter(d => d.hasConsequence);
  computeHorizontalBarTargets(activeNodes, d => d.primaryConsequence, CONS_BREAKDOWN_TARGETS);
  // dim dots: stay parked at scatter positions
  for (const d of nodes) {
    if (!d.hasConsequence) {
      d.tx = d.quadrantTx;
      d.ty = d.quadrantTy;
    }
    d.targetRadius = timelineRadius;
  }
  applyTimelineForces();
}

export function responseBreakdownLayout() {
  ensureQuadrantStats();
  const nodes = simulation.nodes();
  const activeNodes = nodes.filter(d => d.hasResponse);
  computeVerticalBarTargets(activeNodes, d => d.primaryResponse, RESP_BREAKDOWN_TARGETS);
  for (const d of nodes) {
    if (!d.hasResponse) {
      d.tx = d.quadrantTx;
      d.ty = d.quadrantTy;
    }
    d.targetRadius = timelineRadius;
  }
  applyTimelineForces();
}

// Same stacking pattern as computeTimelineTargets, but per response category instead of per year
function computeVerticalBarTargets(activeNodes, categoryKey, targets) {
  const orderIdx = new Map(TECH_BUCKET_ORDER.map((b, i) => [b, i]));
  const subCols = VERTICAL_BAR_SUBCOLS;
  const pitch   = VERTICAL_BAR_PITCH;
  const baseY   = VERTICAL_BAR_BASELINE_Y;

  // group active dots by category
  const byCategory = new Map();
  for (const d of activeNodes) {
    const cat = categoryKey(d);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(d);
  }

  byCategory.forEach((catNodes, cat) => {
    const target = targets[cat];
    if (!target) return;

    catNodes.sort((a, b) => {
      const ai = orderIdx.has(a.bucket) ? orderIdx.get(a.bucket) : TECH_BUCKET_ORDER.length;
      const bi = orderIdx.has(b.bucket) ? orderIdx.get(b.bucket) : TECH_BUCKET_ORDER.length;
      if (ai !== bi) return ai - bi;
      return a.id.localeCompare(b.id);
    });

    catNodes.forEach((node, i) => {
      const row    = Math.floor(i / subCols);
      const subCol = i % subCols;
      const offset = (subCol - (subCols - 1) / 2) * pitch;
      node.tx = target.x + offset;
      node.ty = baseY - row * pitch - timelineRadius;
    });
  });
}


// Similar stacking pattern as computeTimelineTargets, but horizontal and per conseuqnece category
function computeHorizontalBarTargets(activeNodes, categoryKey, targets) {
  const orderIdx = new Map(TECH_BUCKET_ORDER.map((b, i) => [b, i]));
  const subRows = HORIZONTAL_BAR_SUBROWS;
  const pitch   = HORIZONTAL_BAR_PITCH;
  const baseX   = HORIZONTAL_BAR_LEFT_X;

  // group active dots by category
  const byCategory = new Map();
  for (const d of activeNodes) {
    const cat = categoryKey(d);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(d);
  }

  byCategory.forEach((catNodes, cat) => {
    const target = targets[cat];
    if (!target) return;

    catNodes.sort((a, b) => {
      const ai = orderIdx.has(a.bucket) ? orderIdx.get(a.bucket) : TECH_BUCKET_ORDER.length;
      const bi = orderIdx.has(b.bucket) ? orderIdx.get(b.bucket) : TECH_BUCKET_ORDER.length;
      if (ai !== bi) return ai - bi;
      return a.id.localeCompare(b.id);
    });

    catNodes.forEach((node, i) => {
      const col    = Math.floor(i / subRows);
      const subRow = i % subRows;
      const offset = (subRow - (subRows - 1) / 2) * pitch;
      node.tx = baseX + col * pitch + timelineRadius;
      node.ty = target.y + offset;
    });
  });
}


function ensureQuadrantStats() {
  if (quadrantStats) return;
  const nodes = simulation.nodes();
  assignQuadrantScatter(nodes);
  quadrantStats = {
    percentages:   quadrantPercentages(nodes),
    dominantTech:  dominantTechPerQuadrant(nodes),
  };
}

export function getQuadrantStats() {
  return quadrantStats;
}

function applyRegionForces(targets, regionKey) {
  const nodes = simulation.nodes();
  nodes.forEach(d => {
    const t = targets.get(regionKey(d)) || { x: 470, y: 300 };
    d.tx = t.x;
    d.ty = t.y;
    d.targetRadius = vennRadius;
  });
  simulation.force('charge', d3.forceManyBody().strength(d => -Math.pow(d.radius, 2) * 0.04));
  simulation.force('x', d3.forceX().strength(0.08).x(d => d.tx));
  simulation.force('y', d3.forceY().strength(0.08).y(d => d.ty));
  simulation.velocityDecay(0.3);
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
  computeTimelineTargets(nodes, {});
  applyTimelineForces();
}

// Same chart layout as timelineLayout, except fatal dots sink to the
// bottom of each year column. Non-fatal dots restack above them, sorted
// by tech bucket as usual. The simulation's force-based easing handles
// the visual: fatal dots drift down, non-fatal drift up to fill in.
export function fatalSpotlightLayout() {
  const nodes = simulation.nodes();
  computeTimelineTargets(nodes, { fatalFirst: true });
  applyTimelineForces();
}

// Smooth entry: no positional snap. Dots ease from their current
// positions (cluster centre, accountability split, etc.) directly to
// (tx, ty), while the radius tween shrinks them from defaultRadius to
// timelineRadius over the same ticks. Equal x and y strengths so the
// motion reads as a coherent settle rather than a horizontal blast
// followed by vertical drift.
function applyTimelineForces() {
  const nodes = simulation.nodes();
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

function computeTimelineTargets(nodes, opts = {}) {
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
      if (opts.fatalFirst) {
        // Fatal dots stack at the bottom of the column (lower row index).
        if (a.isFatal && !b.isFatal) return -1;
        if (!a.isFatal && b.isFatal) return 1;
      }
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

  // Per-column accountability rate (fraction with has_consequence = True).
  // Matches notebook cell 17: `dfy.groupby("year")["has_consequence"].mean()`.
  // Stored as an array aligned with columnKeys/colCenters so the renderer
  // can look up by column index without a Map lookup.
  const accountabilityRate = columnKeys.map(key => {
    const colNodes = byCol.get(key) || [];
    if (colNodes.length === 0) return null;
    const withConsequence = colNodes.filter(n => n.hasConsequence).length;
    return withConsequence / colNodes.length;
  });

  // Per-column response rate. Same shape — matches the accountability_patterns
  // notebook's per-year cons + resp lines.
  const responseRate = columnKeys.map(key => {
    const colNodes = byCol.get(key) || [];
    if (colNodes.length === 0) return null;
    return colNodes.filter(n => n.hasResponse).length / colNodes.length;
  });

  // Mark columns that are likely affected by reporting lag (latest two
  // real years plus the partial year). The renderer styles their points
  // differently so the viewer sees why the line bounces back at the end.
  const lagFlags = columnKeys.map((key, i) => {
    if (key === UNDATED) return false;
    // last two real years + the partial year if it's there
    return i >= realYears.length - 2;
  });

  yearAxis = {
    columnLabels, colCenters, chartBottom, chartTop,
    accountabilityRate, responseRate, lagFlags,
  };
}
