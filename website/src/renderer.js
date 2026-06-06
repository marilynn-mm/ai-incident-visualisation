/*
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { width, height, splitLabels, timelineMargin } from './constants.js';
import { TECH_BUCKET_COLORS } from './tech_buckets.js';
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

export function drawFrame(nodes, currentView, currentEra) {
  ctx.clearRect(0, 0, width, height);

  const dimmedAlpha = 0.18;

  nodes.forEach(function(d) {
    const colour = fillFor(d);
    const inEra = isInEra(d, currentView, currentEra);
    ctx.globalAlpha = inEra ? 1 : dimmedAlpha;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, 2 * Math.PI);
    ctx.fillStyle = colour;
    ctx.fill();
    // skip stroke in timeline view — at radius 2.5 the darker outline
    // visually dominates the fill and the bucket colour stops reading.
    if (currentView !== 'timeline') {
      ctx.strokeStyle = d3.color(colour).darker().toString();
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;

  if (currentView === 'split') {
    drawSplitLabels();
  } else if (currentView === 'timeline') {
    drawYearAxis();
  }
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
