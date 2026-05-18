/* 
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 */ 

// simulation.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { width, height, center, yearCenters, forceStrength } from './constants.js';


let simulation = null;

// charge function
function charge(d) {
  return -Math.pow(d.radius, 2.0) * forceStrength;
}

// node year position (used by splitBubbles)
function nodeYearPos(d) {
  return yearCenters[d.year].x;
}

// exported functions


/*
* setupSimulation replaces two separate things in Jim's version
* It combines creation at definition time and nodes attached inside chart()
* Pass nodes directly into d3.forceSimulation(nodes) rather than calling .nodes()
* main.js control sequence
*/ 

export function setupSimulation(nodes, onTick) {
  simulation = d3.forceSimulation(nodes)
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', onTick);

  simulation.stop();
}

export function groupBubbles() {
  simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));
  simulation.alpha(1).restart();
}

export function splitBubbles() {
  simulation.force('x', d3.forceX().strength(forceStrength).x(nodeYearPos));
  simulation.alpha(1).restart();
}



