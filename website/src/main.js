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
import { initCanvas, drawFrame } from './renderer.js';


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


init();

