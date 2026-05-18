/* MAIN LOGIC
 * 1. main.js loads data
 * 2. main.js creates myNodes
 * 3. main.js calls setupSimulation(myNodes, drawFrame)
 *         → simulation stores drawFrame as its tick handler
 *         → simulation knows nothing about canvas or rendering
 * 4. main.js calls groupBubbles()
 *         → simulation starts running
 * 5. Every tick:
 *         → simulation updates d.x, d.y on each node
 *         → simulation calls drawFrame(myNodes, currentView)
 *         → renderer reads d.x, d.y and paints
 *         → renderer knows nothing about forces or physics
 * 6. User clicks a button
 *         → main.js updates currentView
 *         → main.js calls splitBubbles()
 *         → simulation restarts with new force targets
 *         → drawFrame starts painting dots in new positions
 */

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { loadData, createNodes } from './data.js';
import { setupSimulation, groupBubbles, splitBubbles } from './simulation.js';
import { initCanvas, drawFrame, getHoveredNode, toCanvasCoords } from './renderer.js';


// module-level state
let currentView = 'all';

/*
 * Sets up canva
 */
function init() {
  initCanvas('#vis');
  loadData(function(rawData) {
    const myNodes = createNodes(rawData);
    setupSimulation(myNodes, function() { drawFrame(myNodes, currentView); });
    groupBubbles();
    setupTooltip(myNodes);
  });
  setupButtons();
}


/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.selectAll('.button').on('click', function() {
    d3.selectAll('.button').classed('active', false);
    const button = d3.select(this);
    button.classed('active', true);
    const buttonId = button.attr('id');
    currentView = buttonId;
    if (buttonId === 'year') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  });
}

function setupTooltip(myNodes) {
  const canvasEl = document.querySelector('#vis');
  const tooltip  = document.querySelector('#tooltip');

  console.log('canvas element found:', canvasEl);
  console.log('tooltip element found:', tooltip);
  console.log('number of nodes:', myNodes.length);

  canvasEl.addEventListener('mousemove', function(event) {
    const { x, y } = toCanvasCoords(event);
    const node = getHoveredNode(x, y, myNodes);

    console.log('mouse at:', x, y, '| node found:', node ? node.name : 'none');

    if (node) {
      tooltip.style.display = 'block';
      tooltip.style.left = (event.pageX + 12) + 'px';
      tooltip.style.top  = (event.pageY - 28) + 'px';
      tooltip.innerHTML  =
        '<strong>' + node.name + '</strong><br/>' +
        'Org: ' + node.org + '<br/>' +
        'Amount: $' + addCommas(node.value) + '<br/>' +
        'Year: ' + node.year;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvasEl.addEventListener('mouseleave', function() {
    tooltip.style.display = 'none';
  });
}

function addCommas(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

init();


