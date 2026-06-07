/*
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { width, height, splitLabels, timelineMargin } from './constants.js';
import { TECH_BUCKET_COLORS } from './tech_buckets.js';
import { VENN_LAYOUT } from './consequence_buckets.js';
import { RESPONSE_LAYOUT } from './response_buckets.js';
import { getYearAxis } from './simulation.js';


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

  const showLine  = currentView === 'timeline' && hints.showAccountabilityLine === true;
  const showFatal = currentView === 'timeline' && hints.showFatalSpotlight    === true;

  // Background outlines need to be drawn BEFORE the dots so dots sit on top.
  if (currentView === 'venn-consequence')   drawVennBackdrop();
  if (currentView === 'response-bubbles')   drawResponseBackdrop();

  drawDots(nodes, currentView, hints, { showLine, showFatal });

  if (currentView === 'split') {
    drawSplitLabels();
  } else if (currentView === 'timeline') {
    drawYearAxis();
    if (showLine)  drawAccountabilityLine();
    if (showFatal) drawFatalCaption();
  } else if (currentView === 'venn-consequence') {
    drawVennLabels();
    drawVennDisclaimer();
  } else if (currentView === 'response-bubbles') {
    drawResponseLabels();
    drawResponseDisclaimer();
  }
}

function drawDots(nodes, currentView, hints, { showLine, showFatal }) {
  const dimmedAlpha    = 0.18;
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
    if (currentView !== 'timeline') {
      ctx.strokeStyle = d3.color(colour).darker().toString();
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}

// Headline annotation above the 2025 column.
function drawFatalCaption() {
  const axis = getYearAxis();
  if (!axis) return;
  const { columnLabels, colCenters, chartTop } = axis;

  const idx = columnLabels.findIndex(l => l === '2025');
  if (idx < 0) return;
  const x = colCenters[idx];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#a01818';
  ctx.fillText('25 fatalities in 2025', x, chartTop - 20);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#777';
  ctx.fillText('highest on record', x, chartTop - 6);
}

// Dim dots outside the active era's year range. Undated rows have d.year=null
// and never match an era, so they dim along with the rest of off-era columns.
function isInEra(d, currentView, currentEra) {
  if (currentView !== 'timeline' || !currentEra) return true;
  if (d.year == null) return false;
  const [start, end] = currentEra.yearRange;
  return d.year >= start && d.year <= end;
}

export function getHoveredNode(mouseX, mouseY, nodes) {
  return nodes.find(function(d) {
    const dx = mouseX - d.x;
    const dy = mouseY - d.y;
    return Math.sqrt(dx * dx + dy * dy) < Math.max(d.radius, 4); // floor for tiny dots
  }) || null;
}

export function toCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
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

// Overlay the per-year consequence rate as a line chart over the histogram.
// 0% at chartBottom, 100% at chartTop. Columns flagged as reporting-lag
// affected get hollow markers + a dashed line segment so the viewer sees
// why the line bounces back at the right edge.
function drawAccountabilityLine() {
  const axis = getYearAxis();
  if (!axis || !axis.accountabilityRate) return;

  const { colCenters, chartBottom, chartTop, accountabilityRate, lagFlags } = axis;
  const chartH = chartBottom - chartTop;

  // Build a list of points where rate is non-null and the column has a real
  // year label (skip the Undated column — accountability rate there isn't
  // a meaningful "this year" data point).
  const points = [];
  for (let i = 0; i < colCenters.length; i++) {
    const rate = accountabilityRate[i];
    if (rate == null) continue;
    if (axis.columnLabels[i] === 'Undated') continue;
    points.push({
      x: colCenters[i],
      y: chartBottom - rate * chartH,
      rate,
      lag: lagFlags[i],
    });
  }
  if (points.length === 0) return;

  // 25% / 50% / 75% reference gridlines, faint
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach(frac => {
    const y = chartBottom - frac * chartH;
    ctx.beginPath();
    ctx.moveTo(colCenters[0] - 12, y);
    ctx.lineTo(colCenters[colCenters.length - 1] + 12, y);
    ctx.stroke();
  });

  // axis labels on the right (% with consequence)
  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
    const y = chartBottom - frac * chartH;
    ctx.fillText(`${Math.round(frac * 100)}%`, colCenters[colCenters.length - 1] + 14, y);
  });

  // line — solid through non-lag points, dashed across the lag tail
  const stroke = '#c0392b';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';

  // solid segments
  ctx.setLineDash([]);
  ctx.beginPath();
  let inPath = false;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.lag) { inPath = false; continue; }
    if (!inPath) { ctx.moveTo(p.x, p.y); inPath = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // dashed connector through the lag tail (joining last solid point to lag points)
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

  // markers — solid filled circle for confirmed years, hollow for lag-affected
  points.forEach(p => {
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
  });

  // endpoint labels: first solid + last solid, plus any lag-tail values
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = stroke;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const firstSolid = points.find(p => !p.lag);
  const lastSolid  = [...points].reverse().find(p => !p.lag);
  if (firstSolid) ctx.fillText(`${Math.round(firstSolid.rate * 100)}%`, firstSolid.x, firstSolid.y - 6);
  if (lastSolid && lastSolid !== firstSolid)
    ctx.fillText(`${Math.round(lastSolid.rate * 100)}%`, lastSolid.x, lastSolid.y - 6);

  // small caption next to the rightmost data point
  const last = points[points.length - 1];
  if (last && last.lag) {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('reporting lag', last.x + 6, last.y + 6);
  }
}


// --- Consequence Venn (State 2) -------------------------------------------

function drawVennBackdrop() {
  const v = VENN_LAYOUT;

  // No-consequence cluster — faint circle marking the boundary
  outlineCircle(v.noConsequence, '#dddddd', 1);

  // Has-consequence container — big oval encompassing all sub-clusters
  outlineEllipse(v.hasConsequence, '#bbbbbb', 1.5);

  // Three Venn circles (top categories) — solid colored outlines
  outlineCircle(v.venn.lit,  '#3a80b8', 2);
  outlineCircle(v.venn.reg,  '#16a085', 2);
  outlineCircle(v.venn.fine, '#e6a23c', 2);

  // Bridge (Lit + Police), dashed to read as "cross-category combo"
  ctx.save();
  ctx.setLineDash([4, 3]);
  outlineCircle(v.bridge, '#888', 1.5);
  ctx.restore();

  // Side clusters and Other: NO background outlines. The dot clusters
  // themselves form the visual shape; only labels mark them.
}

function outlineCircle(c, stroke, lineWidth) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
  ctx.stroke();
}

function outlineEllipse(c, stroke, lineWidth) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, 2 * Math.PI);
  ctx.stroke();
}

function drawVennLabels() {
  const v = VENN_LAYOUT;

  ctx.textBaseline = 'middle';

  // No-consequence header above its cluster
  labelHeader(v.noConsequence.x, v.noConsequence.y - v.noConsequence.r - 18,
              v.noConsequence.label, `${v.noConsequence.count} incidents`, '#555');

  // Has-consequence header above the oval
  labelHeader(v.hasConsequence.x, v.hasConsequence.y - v.hasConsequence.ry - 18,
              v.hasConsequence.label, `${v.hasConsequence.count} incidents`, '#444');

  // Venn category labels — outside each circle, away from neighbors
  labelOffset(v.venn.lit,  -1, -1, 'Litigation',               `${v.venn.lit.count}`,  '#3a80b8');
  labelOffset(v.venn.reg,   1, -1, 'Regulatory investigation', `${v.venn.reg.count}`, '#16a085');
  labelOffset(v.venn.fine,  0,  1, 'Fine / settlement',        `${v.venn.fine.count}`, '#e6a23c');

  // Bridge label above
  labelOffset(v.bridge, 0, -1, 'Lit + Police', `${v.bridge.count}`, '#666');

  // Side clusters — labels to the right of each
  v.sides.forEach(s => {
    const labelX = s.target.x + s.r + 8;
    const labelY = s.target.y;
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText(s.label, labelX, labelY - 4);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`${s.count}`, labelX, labelY + 8);
  });

  // Other — small label below cluster
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(v.other.label, v.other.x, v.other.y + v.other.r + 12);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(`~${v.other.count}`, v.other.x, v.other.y + v.other.r + 25);
}

function labelHeader(x, y, title, sub, colour) {
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(title, x, y);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(sub, x, y + 14);
}

// Label placed offset from a circle in direction (dx, dy) where each is -1/0/1
function labelOffset(c, dx, dy, title, sub, colour) {
  const offsetMag = c.r + 16;
  const x = c.x + dx * offsetMag;
  const y = c.y + dy * offsetMag;
  ctx.textAlign = dx > 0 ? 'left' : dx < 0 ? 'right' : 'center';
  ctx.fillStyle = colour;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(title, x, y);
  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  ctx.fillText(sub, x, y + 12);
}

function drawVennDisclaimer() {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#888';
  const lines = [
    'Note: 36 incidents in the Venn also carry a less-common consequence (e.g. Incarceration, Legal warning)',
    'not shown — they\'re placed by their highest-frequency partner. The same applies to the long-tail "Other" cluster.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 20, height - 30 + i * 12));
}


// --- Response bubbles (State 3) -------------------------------------------

function drawResponseBackdrop() {
  const r = RESPONSE_LAYOUT;

  // Two no-response clusters (faint)
  outlineCircle(r.noRespNoCons,  '#dddddd', 1);
  outlineCircle(r.noRespHasCons, '#dddddd', 1);

  // Has-response container oval
  outlineEllipse(r.hasResponse, '#bbbbbb', 1.5);
}

function drawResponseLabels() {
  const r = RESPONSE_LAYOUT;

  ctx.textBaseline = 'middle';

  // Each of the three top-level groups gets a header above its outline.
  noRespHeader(r.noRespNoCons);
  noRespHeader(r.noRespHasCons);

  labelHeader(r.hasResponse.x, r.hasResponse.y - r.hasResponse.ry - 18,
              r.hasResponse.label, `${r.hasResponse.count} incidents`, '#444');

  // Each response bucket — label to the right of the cluster.
  r.buckets.forEach(b => {
    const labelX = b.target.x + b.r + 8;
    const labelY = b.target.y;
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText(b.label, labelX, labelY - 4);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`${b.count}`, labelX, labelY + 8);
  });
}

function noRespHeader(c) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#555';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(c.label, c.x, c.y - c.r - 24);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(c.sublabel, c.x, c.y - c.r - 10);
  ctx.font = '10px sans-serif';
  ctx.fillText(`${c.count} incidents`, c.x, c.y - c.r + 2);
}

function drawResponseDisclaimer() {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#888';
  const lines = [
    'Note: 22 incidents have multiple response types coded. They\'re placed by their highest-frequency response;',
    'the secondary tag isn\'t shown. The "Policy / apology" bucket merges Policy review/update, Policy update, and Public apology.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 20, height - 30 + i * 12));
}


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
