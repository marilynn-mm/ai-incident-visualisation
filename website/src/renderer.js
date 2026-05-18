/* 
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */ 

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { width, height, yearsTitleX } from './constants.js';

// color scale 
var fillColor = d3.scaleOrdinal()
.domain(['low', 'medium', 'high'])
.range(['#d84b2a', '#beccae', '#7aa25c']);

// internal state 
let canvas = null;
let ctx    = null;

// exported functions

export function initCanvas(selector) {
  canvas = document.querySelector(selector);
  canvas.width  = width;
  canvas.height = height;
  ctx = canvas.getContext('2d');
}

export function drawFrame(nodes, currentView) {
  ctx.clearRect(0, 0, width, height);

  nodes.forEach(function(d) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor(d.group);
    ctx.fill();
    ctx.strokeStyle = d3.color(fillColor(d.group)).darker().toString();
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  if (currentView === 'year') {
    drawYearLabels();
  }
}

// learn which node is being hovered over
export function getHoveredNode(mouseX, mouseY, nodes) {
  return nodes.find(function(d) {
    const dx = mouseX - d.x;
    const dy = mouseY - d.y;
    return Math.sqrt(dx * dx + dy * dy) < d.radius;
  }) || null;
}

// canva 2d does not support mouse detection so we write our own
export function toCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

// helpers

function drawYearLabels() {
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#aaa';

  Object.keys(yearsTitleX).forEach(function(year) {
    ctx.fillText(year, yearsTitleX[year], 40);
  });
}


// function ticked() {
//   drawFrame(); // drawFrame passed as the tick callback
// }

// function drawFrame() {
//   ctx.clearRect(0, 0, width, height);

//   // draw all nodes
//   nodes.forEach(function(d) {
//     ctx.beginPath();
//     ctx.arc(d.x, d.y, d.radius, 0, 2 * Math.PI);
//     ctx.fillStyle = fillColor(d.group);
//     ctx.fill();
//     ctx.strokeStyle = d3.rgb(fillColor(d.group)).darker().toString();
//     ctx.lineWidth = 1;
//     ctx.stroke();
//   });

//   // draw year labels if split
//   if (currentView === 'year') {
//     drawYearLabels();
//   }
// }


