/*
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { width, height, splitLabels, timelineMargin } from './constants.js';
import { TECH_BUCKET_COLORS, TECH_BUCKET_LABELS } from './tech_buckets.js';
import { TECH_FILTER_BY_ID, topHarmTagsForTech } from './tech_filters.js';
import { VENN_LAYOUT } from './consequence_buckets.js';
import { RESPONSE_LAYOUT } from './response_buckets.js';
import {
  QUADRANT_LAYOUT, QUADRANT_DIVIDERS,
  VERTICAL_BAR_BASELINE_Y, HORIZONTAL_BAR_LEFT_X,
  CONS_BREAKDOWN_TARGETS, CONS_BREAKDOWN_ORDER,
  RESP_BREAKDOWN_TARGETS, RESP_BREAKDOWN_ORDER,
} from './quadrant_buckets.js';
import { getYearAxis, getQuadrantStats } from './simulation.js';


// Every view uses the tech bucket palette, so colour stays consistent as
// dots move between cluster, timeline, and accountability views.
function fillFor(d) {
  return TECH_BUCKET_COLORS[d.bucket] || TECH_BUCKET_COLORS.other;
}


let canvas = null;
let ctx    = null;

export function initCanvas(selector) {
  canvas = document.querySelector(selector);
  const dpr = window.devicePixelRatio || 1;

  canvas.width  = width  * dpr;
  canvas.height = height * dpr;
  canvas.style.width  = width  + 'px';
  canvas.style.height = height + 'px';

  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

export function drawFrame(nodes, currentView, hints = {}) {
  ctx.clearRect(0, 0, width, height);

  const showConsLine = currentView === 'timeline' && hints.showAccountabilityLine === true;
  const showRespLine = currentView === 'timeline' && hints.showResponseLine     === true;
  const showLine     = showConsLine || showRespLine;
  const showFatal    = currentView === 'timeline' && hints.showFatalSpotlight   === true;

  // Background outlines need to be drawn BEFORE the dots so dots sit on top.
  // if (currentView === 'venn-consequence')   drawVennBackdrop();
  // if (currentView === 'response-bubbles')   drawResponseBackdrop();
  if (currentView === 'quadrant')           drawQuadrantBackdrop();
  if (currentView === 'cons-breakdown')     drawHorizontalBarBaseline();
  if (currentView === 'resp-breakdown')     drawVerticalBarBaseline();

  drawDots(nodes, currentView, hints, { showLine, showFatal });

  if (currentView === 'split') {
    drawSplitLabels();
  } else if (currentView === 'timeline') {
    drawYearAxis();
    if (showLine)  drawAccountabilityLines({ cons: showConsLine, resp: showRespLine });
    if (showFatal) drawFatalCaption();
    if (hints.techFilter) drawTechHarmOverlay(nodes, hints.techFilter);
  // } else if (currentView === 'venn-consequence') {
  //   drawVennLabels();
  //   drawVennDisclaimer();
  // } else if (currentView === 'response-bubbles') {
  //   drawResponseLabels();
  //   drawResponseDisclaimer();
  } else if (currentView === 'quadrant') {
    drawQuadrantLabels();
    // if (hints.showQuadrantTech) drawQuadrantTechAnnotations();
  } else if (currentView === 'cons-breakdown') {
    drawQuadrantLabels();
    drawHorizontalBarLabels(CONS_BREAKDOWN_ORDER, CONS_BREAKDOWN_TARGETS,
                        'Consequence types', 'Incident with consequences reorganizes by its primary consequence category.');
  } else if (currentView === 'resp-breakdown') {
    drawQuadrantLabels();
    drawVerticalBarLabels(RESP_BREAKDOWN_ORDER, RESP_BREAKDOWN_TARGETS,
                        'Response types', 'Incident with consequences reorganizes by its primary response category.');
  }
}

function drawDots(nodes, currentView, hints, { showLine, showFatal }) {
  const dimmedAlpha    = 0.3;   // raised from 0.18 so the histogram silhouette stays visible
  const lineSceneAlpha = 0.3;
  const fatalGhost     = 0.10;

  nodes.forEach(function(d) {
    let alpha, colour;

    if (showFatal) {
      if (d.isFatal) {
        alpha  = 1;
        colour = fillFor(d);
      } else {
        alpha  = fatalGhost;
        colour = '#888';
      }
    } else if (showLine) {
      alpha  = lineSceneAlpha;
      colour = fillFor(d);
    } else if (hints.dimRule) {
      alpha  = shouldDim(d, hints.dimRule) ? dimmedAlpha : 1;
      colour = fillFor(d);
    } else if (currentView === 'timeline' && hints.techFilter) {
      const filter = TECH_FILTER_BY_ID[hints.techFilter];
      const match  = filter && d[filter.flag];
      alpha  = match ? 1 : dimmedAlpha;
      colour = fillFor(d);
    } else {
      const inEra = isInEra(d, currentView, hints.era);
      alpha  = inEra ? 1 : dimmedAlpha;
      colour = fillFor(d);
    }

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, 2 * Math.PI);
    ctx.fillStyle = colour;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Headline annotation above the 2025 column.
  function drawFatalCaption() {                                                                                  
    ctx.textAlign = 'left';      // was 'center'                                                                 
    ctx.textBaseline = 'top';    // was 'bottom'
                                                                                                                 
    ctx.font = 'bold 13px sans-serif';                      
    ctx.fillStyle = '#a01818';                                                                                   
    ctx.fillText('25 fatalities in 2025', 28, 34);     // matches harm overlay's title position
                                                                                                                 
    ctx.font = '11px sans-serif';                           
    ctx.fillStyle = '#777';                                                                                      
    ctx.fillText('highest on record', 28, 50);         // 16 px below, matches harm subline
  }
  
// function drawFatalCaption() {
//   const axis = getYearAxis();
//   if (!axis) return;
//   const { columnLabels, colCenters, chartTop } = axis;

//   const idx = columnLabels.findIndex(l => l === '2025');
//   if (idx < 0) return;
//   const x = colCenters[idx];

//   ctx.textAlign = 'center';
//   ctx.textBaseline = 'bottom';

//   ctx.font = 'bold 13px sans-serif';
//   ctx.fillStyle = '#a01818';
//   ctx.fillText('25 fatalities in 2025', x, chartTop - 20);

//   ctx.font = '11px sans-serif';
//   ctx.fillStyle = '#777';
//   ctx.fillText('highest on record', x, chartTop - 6);
// }

// Dim dots outside the active era's year range. Undated rows have d.year=null
// and never match an era, so they dim along with the rest of off-era columns.
function isInEra(d, currentView, currentEra) {
  if (currentView !== 'timeline' || !currentEra) return true;
  if (d.year == null) return false;
  const [start, end] = currentEra.yearRange;
  return d.year >= start && d.year <= end;
}

// Quadrant-Act dim rules. Each rule names which dots are "dim" (true = dim).
function shouldDim(d, rule) {
  switch (rule) {
    case 'no-cons':     return !d.hasConsequence;
    case 'no-resp':     return !d.hasResponse;
    case 'not-neither': return d.quadrant !== 'neither';
    default:            return false;
  }
}

export function getHoveredNode(mouseX, mouseY, nodes) {
  return nodes.find(function(d) {
    const dx = mouseX - d.x;
    const dy = mouseY - d.y;
    return Math.sqrt(dx * dx + dy * dy) < Math.max(d.radius, 4); // floor for tiny dots
  }) || null;
}

export function toCanvasCoords(event) {
  // Bridge CSS size → internal coordinate space. The canvas's drawing
  // coordinates run 0..width, 0..height regardless of how the browser
  // sizes the element via CSS — divide out the difference so hover lands
  // on the visually-correct dot even when the canvas is scaled.
  const rect = canvas.getBoundingClientRect();
  const scaleX = width  / rect.width;
  const scaleY = height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top)  * scaleY
  };
}


// helpers

function drawSplitLabels() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#555';
  ctx.fillText('No response', splitLabels.no_response.x, 40);
  ctx.fillText('Response documented', splitLabels.responded.x, 40);
}

// Overlay one or both rate lines (consequence / response) over the year
// histogram. 0% at chartBottom, 100% at chartTop. Reporting-lag years get
// hollow markers + a dashed segment. Notebook colors:
//   cons = #c0392b (red), resp = #3a80b8 (blue).
function drawAccountabilityLines({ cons = false, resp = false } = {}) {
  const axis = getYearAxis();
  if (!axis) return;

  drawRateAxisFrame(axis);

  if (cons && axis.accountabilityRate) {
    drawRateLine(axis, axis.accountabilityRate, '#c0392b', cons && !resp);
  }
  if (resp && axis.responseRate) {
    // When both lines are shown, suppress endpoint labels on the second one
    // so they don't overlap the first. Legend disambiguates the colors.
    drawRateLine(axis, axis.responseRate, '#3a80b8', resp && !cons);
  }
  if (cons || resp) drawRateLegend(axis, { cons, resp });
}

// Gridlines + right-side % labels, drawn once even if both lines are shown.
function drawRateAxisFrame(axis) {
  const { colCenters, chartBottom, chartTop } = axis;
  const chartH = chartBottom - chartTop;

  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach(frac => {
    const y = chartBottom - frac * chartH;
    ctx.beginPath();
    ctx.moveTo(colCenters[0] - 12, y);
    ctx.lineTo(colCenters[colCenters.length - 1] + 12, y);
    ctx.stroke();
  });

  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
    const y = chartBottom - frac * chartH;
    ctx.fillText(`${Math.round(frac * 100)}%`, colCenters[colCenters.length - 1] + 14, y);
  });
}

// Draw one rate series — solid line + dashed lag tail + markers.
// `withEndpointLabels` controls whether first/last % labels are written
// (only one line shows them when both are visible).
function drawRateLine(axis, rates, stroke, withEndpointLabels) {
  const { colCenters, chartBottom, chartTop, columnLabels, lagFlags } = axis;
  const chartH = chartBottom - chartTop;

  const points = [];
  for (let i = 0; i < colCenters.length; i++) {
    const rate = rates[i];
    if (rate == null) continue;
    if (columnLabels[i] === 'Undated') continue;
    points.push({ x: colCenters[i], y: chartBottom - rate * chartH, rate, lag: lagFlags[i] });
  }
  if (points.length === 0) return;

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';

  // solid segments through non-lag points
  ctx.setLineDash([]);
  ctx.beginPath();
  let inPath = false;
  for (const p of points) {
    if (p.lag) { inPath = false; continue; }
    if (!inPath) { ctx.moveTo(p.x, p.y); inPath = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // dashed tail through lag years
  const lastSolidIdx = points.findIndex(p => p.lag) - 1;
  if (lastSolidIdx >= 0) {
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(points[lastSolidIdx].x, points[lastSolidIdx].y);
    for (let i = lastSolidIdx + 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // markers
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
    if (p.lag) {
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = stroke;
      ctx.fill();
    }
  }

  if (withEndpointLabels) {
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = stroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const firstSolid = points.find(p => !p.lag);
    const lastSolid  = [...points].reverse().find(p => !p.lag);
    if (firstSolid) ctx.fillText(`${Math.round(firstSolid.rate * 100)}%`, firstSolid.x, firstSolid.y - 6);
    if (lastSolid && lastSolid !== firstSolid)
      ctx.fillText(`${Math.round(lastSolid.rate * 100)}%`, lastSolid.x, lastSolid.y - 6);

    const last = points[points.length - 1];
    if (last && last.lag) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('reporting lag', last.x + 6, last.y + 6);
    }
  }
}

// Legend pinned to the top-right of the chart area when one or both lines
// are shown. Keeps both series labeled when their endpoint markers don't.
function drawRateLegend(axis, { cons, resp }) {
  const { colCenters, chartTop } = axis;
  const items = [];
  if (cons) items.push({ label: '% with consequence', color: '#c0392b' });
  if (resp) items.push({ label: '% with response',    color: '#3a80b8' });
  if (items.length === 0) return;

  const lineLen = 18;
  const gap     = 8;
  const x       = colCenters[colCenters.length - 1] - 10;
  let y = chartTop + 4;

  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const it of items) {
    ctx.fillStyle = it.color;
    ctx.fillText(it.label, x - lineLen - 4, y);
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - lineLen, y);
    ctx.lineTo(x,           y);
    ctx.stroke();
    y += 16;
  }
}


// --- Consequence Venn (State 2) -------------------------------------------

// function drawVennBackdrop() {
//   const v = VENN_LAYOUT;

//   // No-consequence cluster — faint circle marking the boundary
//   outlineCircle(v.noConsequence, '#dddddd', 1);

//   // Has-consequence container — big oval encompassing all sub-clusters
//   outlineEllipse(v.hasConsequence, '#bbbbbb', 1.5);

//   // Three Venn circles (top categories) — solid colored outlines
//   outlineCircle(v.venn.lit,  '#3a80b8', 2);
//   outlineCircle(v.venn.reg,  '#16a085', 2);
//   outlineCircle(v.venn.fine, '#e6a23c', 2);

//   // Bridge (Lit + Police), dashed to read as "cross-category combo"
//   ctx.save();
//   ctx.setLineDash([4, 3]);
//   outlineCircle(v.bridge, '#888', 1.5);
//   ctx.restore();

//   // Side clusters and Other: NO background outlines. The dot clusters
//   // themselves form the visual shape; only labels mark them.
// }

// function outlineCircle(c, stroke, lineWidth) {
//   ctx.strokeStyle = stroke;
//   ctx.lineWidth = lineWidth;
//   ctx.beginPath();
//   ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
//   ctx.stroke();
// }

// function outlineEllipse(c, stroke, lineWidth) {
//   ctx.strokeStyle = stroke;
//   ctx.lineWidth = lineWidth;
//   ctx.beginPath();
//   ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, 2 * Math.PI);
//   ctx.stroke();
// }

// function drawVennLabels() {
//   const v = VENN_LAYOUT;

//   ctx.textBaseline = 'middle';

//   // No-consequence header above its cluster
//   labelHeader(v.noConsequence.x, v.noConsequence.y - v.noConsequence.r - 18,
//               v.noConsequence.label, `${v.noConsequence.count} incidents`, '#555');

//   // Has-consequence header above the oval
//   labelHeader(v.hasConsequence.x, v.hasConsequence.y - v.hasConsequence.ry - 18,
//               v.hasConsequence.label, `${v.hasConsequence.count} incidents`, '#444');

//   // Venn category labels — outside each circle, away from neighbors
//   labelOffset(v.venn.lit,  -1, -1, 'Litigation',               `${v.venn.lit.count}`,  '#3a80b8');
//   labelOffset(v.venn.reg,   1, -1, 'Regulatory investigation', `${v.venn.reg.count}`, '#16a085');
//   labelOffset(v.venn.fine,  0,  1, 'Fine / settlement',        `${v.venn.fine.count}`, '#e6a23c');

//   // Bridge label above
//   labelOffset(v.bridge, 0, -1, 'Lit + Police', `${v.bridge.count}`, '#666');

//   // Side clusters — labels to the right of each
//   v.sides.forEach(s => {
//     const labelX = s.target.x + s.r + 8;
//     const labelY = s.target.y;
//     ctx.textAlign = 'left';
//     ctx.font = '11px sans-serif';
//     ctx.fillStyle = '#444';
//     ctx.fillText(s.label, labelX, labelY - 4);
//     ctx.font = '10px sans-serif';
//     ctx.fillStyle = '#888';
//     ctx.fillText(`${s.count}`, labelX, labelY + 8);
//   });

//   // Other — small label below cluster
//   ctx.textAlign = 'center';
//   ctx.font = '11px sans-serif';
//   ctx.fillStyle = '#666';
//   ctx.fillText(v.other.label, v.other.x, v.other.y + v.other.r + 12);
//   ctx.font = '10px sans-serif';
//   ctx.fillStyle = '#888';
//   ctx.fillText(`~${v.other.count}`, v.other.x, v.other.y + v.other.r + 25);
// }

// function labelHeader(x, y, title, sub, colour) {
//   ctx.textAlign = 'center';
//   ctx.fillStyle = colour;
//   ctx.font = 'bold 14px sans-serif';
//   ctx.fillText(title, x, y);
//   ctx.font = '11px sans-serif';
//   ctx.fillStyle = '#888';
//   ctx.fillText(sub, x, y + 14);
// }

// // Label placed offset from a circle in direction (dx, dy) where each is -1/0/1
// function labelOffset(c, dx, dy, title, sub, colour) {
//   const offsetMag = c.r + 16;
//   const x = c.x + dx * offsetMag;
//   const y = c.y + dy * offsetMag;
//   ctx.textAlign = dx > 0 ? 'left' : dx < 0 ? 'right' : 'center';
//   ctx.fillStyle = colour;
//   ctx.font = 'bold 12px sans-serif';
//   ctx.fillText(title, x, y);
//   ctx.fillStyle = '#888';
//   ctx.font = '10px sans-serif';
//   ctx.fillText(sub, x, y + 12);
// }

// function drawVennDisclaimer() {
//   ctx.textAlign = 'left';
//   ctx.textBaseline = 'top';
//   ctx.font = '10px sans-serif';
//   ctx.fillStyle = '#888';
//   const lines = [
//     'Note: 36 incidents in the Venn also carry a less-common consequence (e.g. Incarceration, Legal warning)',
//     'not shown — they\'re placed by their highest-frequency partner. The same applies to the long-tail "Other" cluster.',
//   ];
//   lines.forEach((line, i) => ctx.fillText(line, 20, height - 30 + i * 12));
// }


// --- Response bubbles (State 3) -------------------------------------------

// function drawResponseBackdrop() {
//   const r = RESPONSE_LAYOUT;

//   // Two no-response clusters (faint)
//   outlineCircle(r.noRespNoCons,  '#dddddd', 1);
//   outlineCircle(r.noRespHasCons, '#dddddd', 1);

//   // Has-response container oval
//   outlineEllipse(r.hasResponse, '#bbbbbb', 1.5);
// }

// function drawResponseLabels() {
//   const r = RESPONSE_LAYOUT;

//   ctx.textBaseline = 'middle';

//   // Each of the three top-level groups gets a header above its outline.
//   noRespHeader(r.noRespNoCons);
//   noRespHeader(r.noRespHasCons);

//   labelHeader(r.hasResponse.x, r.hasResponse.y - r.hasResponse.ry - 18,
//               r.hasResponse.label, `${r.hasResponse.count} incidents`, '#444');

//   // Each response bucket — label to the right of the cluster.
//   r.buckets.forEach(b => {
//     const labelX = b.target.x + b.r + 8;
//     const labelY = b.target.y;
//     ctx.textAlign = 'left';
//     ctx.font = '11px sans-serif';
//     ctx.fillStyle = '#444';
//     ctx.fillText(b.label, labelX, labelY - 4);
//     ctx.font = '10px sans-serif';
//     ctx.fillStyle = '#888';
//     ctx.fillText(`${b.count}`, labelX, labelY + 8);
//   });
// }

// function noRespHeader(c) {
//   ctx.textAlign = 'center';
//   ctx.fillStyle = '#555';
//   ctx.font = 'bold 13px sans-serif';
//   ctx.fillText(c.label, c.x, c.y - c.r - 24);
//   ctx.font = '11px sans-serif';
//   ctx.fillStyle = '#888';
//   ctx.fillText(c.sublabel, c.x, c.y - c.r - 10);
//   ctx.font = '10px sans-serif';
//   ctx.fillText(`${c.count} incidents`, c.x, c.y - c.r + 2);
// }

// function drawResponseDisclaimer() {
//   ctx.textAlign = 'left';
//   ctx.textBaseline = 'top';
//   ctx.font = '10px sans-serif';
//   ctx.fillStyle = '#888';
//   const lines = [
//     'Note: 22 incidents have multiple response types coded. They\'re placed by their highest-frequency response;',
//     'the secondary tag isn\'t shown. The "Policy / apology" bucket merges Policy review/update, Policy update, and Public apology.',
//   ];
//   lines.forEach((line, i) => ctx.fillText(line, 20, height - 30 + i * 12));
// }


function drawYearAxis() {
  const axis = getYearAxis();
  if (!axis) return;

  const { columnLabels, colCenters, chartBottom } = axis;
  const labelY = chartBottom + 18;

  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#555';

  // baseline tick line
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(timelineMargin.left, chartBottom + 2);
  ctx.lineTo(width - timelineMargin.right, chartBottom + 2);
  ctx.stroke();

  // labels, skipping every other year if crowded — but always show the
  // first column, the last column, and the 'Undated' column.
  const labelEvery = columnLabels.length > 14 ? 2 : 1;
  columnLabels.forEach((label, i) => {
    const isFirst = i === 0;
    const isLast  = i === columnLabels.length - 1;
    const isUndated = label === 'Undated';
    if (!isFirst && !isLast && !isUndated && i % labelEvery !== 0) return;
    ctx.fillText(label, colCenters[i], labelY);
  });
}


// --- Quadrant Act (Scenes Q1–Q5) ------------------------------------------



// Dividers + axis edge labels. faded=true draws the same grid at low alpha
// for Q3/Q4 breakdowns, where the grid is just a reminder of the source.
function drawQuadrantBackdrop({ faded = false } = {}) {
  const { x: dx, y: dy } = QUADRANT_DIVIDERS;

  ctx.save();
  ctx.strokeStyle = faded ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(dx, 30);
  ctx.lineTo(dx, height - 30);
  ctx.moveTo(40, dy);
  ctx.lineTo(width - 40, dy);
  ctx.stroke();
  ctx.restore();

}

function drawQuadrantLabels() {
  const stats = getQuadrantStats();
  if (!stats) return;

  // Corner positions for each quadrant's title + % label. Pushed to the
  // outer corners so they don't fight with the dot clusters.
  const corners = {
    'resp-only':  { x: 30,         y: 30,           align: 'left'  },
    'both':       { x: width - 30, y: 30,           align: 'right' },
    'neither':    { x: 30,         y: height - 70,  align: 'left'  },
    'cons-only':  { x: width - 30, y: height - 70,  align: 'right' },
  };

  ctx.textBaseline = 'top';
  for (const q in corners) {
    const c = corners[q];
    const { n, pct } = stats.percentages[q];
    const label = QUADRANT_LAYOUT[q].label;
    ctx.textAlign = c.align;
    ctx.fillStyle = '#444';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(label, c.x, c.y);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#222';
    ctx.fillText(`${pct.toFixed(1)}%`, c.x, c.y + 18);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`n=${n}`, c.x, c.y + 42);
  }
}

// Scene Q2: subtle ring around each quadrant's cluster + a side label
// calling out which tech bucket dominates that quadrant.
function drawQuadrantTechAnnotations() {
  const stats = getQuadrantStats();
  if (!stats) return;

  // Approximate cluster radius from dot count — sqrt(n) * dot radius / packing.
  // The constant is tuned visually; the rings are decorative, not precise.
  const clusterRadius = (n) => Math.min(120, Math.max(20, Math.sqrt(n) * 3.0));

  for (const q in QUADRANT_LAYOUT) {
    const center = QUADRANT_LAYOUT[q];
    const stat = stats.dominantTech[q];
    if (!stat) continue;
    const [topBucket, topCount] = stat.top;
    const r = clusterRadius(stat.total);

    // Soft ring around the cluster, coloured by the dominant bucket
    ctx.save();
    ctx.strokeStyle = TECH_BUCKET_COLORS[topBucket] || '#888';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r + 8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Annotation line + label outside the ring. Direction depends on
    // which corner the quadrant sits in.
    const isLeft = center.x < width / 2;
    const isTop  = center.y < height / 2;
    const labelX = isLeft ? center.x - (r + 60) : center.x + (r + 60);
    const labelY = isTop  ? center.y - (r + 30) : center.y + (r + 30);

    ctx.strokeStyle = TECH_BUCKET_COLORS[topBucket] || '#888';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(center.x + (isLeft ? -1 : 1) * (r + 8),
               center.y + (isTop  ? -1 : 1) * (r + 8) * 0.3);
    ctx.lineTo(labelX, labelY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.textAlign = isLeft ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TECH_BUCKET_COLORS[topBucket] || '#666';
    ctx.font = 'bold 12px sans-serif';
    const techLabel = TECH_BUCKET_LABELS[topBucket] || topBucket;
    const pct = (topCount / stat.total * 100).toFixed(0);
    ctx.fillText(`${techLabel}`, labelX, labelY);
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${pct}% of this quadrant (${topCount})`, labelX, labelY + 12);
  }
}

// --- Tech-filter harm overlay (top-left of timeline view) -----------------
// Cached: topHarmTagsForTech and the matching/total counts walk every node,
// so we compute once per tech filter and reuse on subsequent ticks.
const harmTagCache = new Map();
function harmStatsCached(nodes, flag) {
  if (!harmTagCache.has(flag)) {
    const matching = nodes.reduce((n, d) => n + (d[flag] ? 1 : 0), 0);
    harmTagCache.set(flag, {
      bars:     topHarmTagsForTech(nodes, flag, 8),
      matching,
      total:    nodes.length,
    });
  }
  return harmTagCache.get(flag);
}

function drawTechHarmOverlay(nodes, techFilterId) {
  const filter = TECH_FILTER_BY_ID[techFilterId];
  if (!filter) return;
  const stats = harmStatsCached(nodes, filter.flag);
  const bars = stats.bars;
  if (bars.length === 0) return;

  // Overlay rect in top-left corner of canvas.
  const PAD     = 12;
  const ORIGIN  = { x: 16, y: 26 };
  const BAR_H   = 14;
  const BAR_GAP = 5;
  const LABEL_W = 150;          // label column on the left of each bar
  const BAR_MAX = 110;          // max bar width in px
  const COUNT_W = 30;           // count number on the right

  const titleH  = 32;   // title + matching/total count subline
  const rowH    = BAR_H + BAR_GAP;
  const boxW    = LABEL_W + BAR_MAX + COUNT_W + PAD * 2;
  const boxH    = titleH + bars.length * rowH + PAD;

  // Semi-transparent backdrop so dimmed dots show through faintly.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.fillRect(ORIGIN.x, ORIGIN.y, boxW, boxH);
  ctx.strokeRect(ORIGIN.x, ORIGIN.y, boxW, boxH);

  // Title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = filter.color;
  ctx.fillText(`Top harms — ${filter.label}`, ORIGIN.x + PAD, ORIGIN.y + PAD - 4);

  // Matching / total count — makes it explicit that the full corpus is on canvas
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#666';
  const pct = (stats.matching / stats.total * 100).toFixed(0);
  ctx.fillText(`${stats.matching} matching · ${stats.total} total (${pct}%)`,
               ORIGIN.x + PAD, ORIGIN.y + PAD + 10);

  // Bars: largest at top (descending), notebook draws ascending bottom-up,
  // here we put largest at top since the eye lands there first in an overlay.
  const maxCount = bars[0].count;
  const barsX0   = ORIGIN.x + PAD + LABEL_W;

  bars.forEach((b, i) => {
    const y = ORIGIN.y + PAD + titleH + i * rowH;

    // Label (right-aligned against the bar start)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText(truncate(b.tag, 26), barsX0 - 6, y + BAR_H / 2);

    // Bar
    const w = (b.count / maxCount) * BAR_MAX;
    ctx.fillStyle = filter.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(barsX0, y, w, BAR_H);
    ctx.globalAlpha = 1;

    // Count
    ctx.textAlign = 'left';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(String(b.count), barsX0 + w + 4, y + BAR_H / 2);
  });

  ctx.restore();
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}


// Horizontal axis line under the bars, mirroring the timeline's year axis.
function drawVerticalBarBaseline() {
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, VERTICAL_BAR_BASELINE_Y + 2);
  ctx.lineTo(width - 30, VERTICAL_BAR_BASELINE_Y + 2);
  ctx.stroke();
}

// Scene Q4: category labels under each bar, like the timeline year axis.
function drawVerticalBarLabels(order, targets, sectionTitle, sectionSub) {
  // Section header (top-left)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#444';
  ctx.font = 'bold 13px sans-serif';
  // ctx.fillText(sectionTitle, 20, 20);
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  // ctx.fillText(sectionSub, 20, 38);

  // Per-bar labels below the baseline. Stagger every other one ~12px lower
  // to avoid horizontal collisions on the longer labels.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  order.forEach((id, i) => {
    const t = targets[id];
    if (!t) return;
    const labelY = VERTICAL_BAR_BASELINE_Y + 10 + (i % 2) * 14;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText(t.label, t.x, labelY);
  });

  // Disclaimer
  ctx.textAlign = 'left';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('Dots placed by primary (highest-priority) tag, then sorted by tech bucket so colors band horizontally — matching the timeline view.',
               20, height - 14);
}



// Vertical axis line at x = HORIZONTAL_BAR_LEFT_X — bars extend to its right,
// category labels sit on its left.
function drawHorizontalBarBaseline() {
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(HORIZONTAL_BAR_LEFT_X, 40);
  ctx.lineTo(HORIZONTAL_BAR_LEFT_X, height - 40);
  ctx.stroke();
}

// Scene Q3: category labels beside each bar
function drawHorizontalBarLabels(order, targets, sectionTitle, sectionSub) {
  // Section header (top-left)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#444';
  ctx.font = 'bold 13px sans-serif';
  // ctx.fillText(sectionTitle, 20, 20);
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  // ctx.fillText(sectionSub, 20, 38);

  // Per-bar labels below the baseline. Stagger every other one ~12px lower
  // to avoid horizontal collisions on the longer labels.
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  // order.forEach((id, i) => {
  //   const t = targets[id];
  //   if (!t) return;
  //   const labelY = BREAKDOWN_BASELINE_Y + 10 + (i % 2) * 14;
  //   ctx.font = '11px sans-serif';
  //   ctx.fillStyle = '#444';
  order.forEach((id) => {
      const t = targets[id];                                                    
      if (!t) return;                                       
      ctx.fillText(t.label, HORIZONTAL_BAR_LEFT_X - 8, t.y);                    
    })
    // ctx.fillText(t.label, t.x, labelY);


  // Disclaimer
  // ctx.textAlign = 'left';
  // ctx.font = '10px sans-serif';
  // ctx.fillStyle = '#888';
  // ctx.fillText('Dots placed by primary (highest-priority) tag, then sorted by tech bucket so colors band horizontally — matching the timeline view.',
  //              20, height - 14);
}
