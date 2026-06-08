/* MAIN LOGIC
 * 1. main.js loads data and creates node objects
 * 2. main.js initializes the simulation, passing a tick handler that calls
 *    drawFrame on every tick
 * 3. main.js wires the ◀ ▶ scene stepper that walks the SCENES array
 *    defined in narrative.js
 * 4. On scene change:
 *      - if the view (all / timeline / split) changed, the matching layout
 *        function is invoked (groupBubbles / timelineLayout / splitByResponse)
 *      - the scene panel updates with the new title / body
 *      - the canvas is repainted via redraw() so dim state reflects the
 *        active era even when the simulation has settled
 * 5. The renderer knows nothing about scenes — it only sees (view, era).
 */

import { loadData, createNodes } from './data.js';
import { setupSimulation, groupBubbles, splitByResponse, timelineLayout, fatalSpotlightLayout, consequenceVennLayout, responseBubblesLayout, quadrantLayout, consequenceBreakdownLayout, responseBreakdownLayout } from './simulation.js';
import { initCanvas, drawFrame, getHoveredNode, toCanvasCoords } from './renderer.js';
import { TECH_BUCKET_ORDER, TECH_BUCKET_LABELS, TECH_BUCKET_COLORS } from './tech_buckets.js';
import { TIMELINE_ERAS, SCENES } from './narrative.js';


// module-level state
let currentSceneIdx = 0;
let redraw = () => {};        // populated once nodes are loaded; lets the
                              // stepper repaint the canvas without waiting
                              // for the simulation to tick


function init() {
  initCanvas('#vis');
  buildLegend();
  loadData(function(rawData) {
    const myNodes = createNodes(rawData);
    redraw = () => {
      const scene = SCENES[currentSceneIdx];
      drawFrame(myNodes, scene.view, {
        era: currentEra(scene),
        showAccountabilityLine: scene.showAccountabilityLine === true,
        showFatalSpotlight: scene.showFatalSpotlight === true,
        showQuadrantTech: scene.showQuadrantTech === true,
        dimRule: scene.dimRule || null,
      });
    };
    setupSimulation(myNodes, redraw);
    applySceneLayout(SCENES[0]);
    setupTooltip(myNodes);
  });
  setupStepper();
  renderScene();
}

// Resolve the era object the renderer should highlight, or null if none.
function currentEra(scene) {
  if (scene.view !== 'timeline') return null;
  if (scene.eraIdx == null || scene.eraIdx < 0) return null;
  return TIMELINE_ERAS[scene.eraIdx] || null;
}

function buildLegend() {
  const el = document.querySelector('#legend');
  if (!el) return;
  el.innerHTML = TECH_BUCKET_ORDER.map(b => {
    const color = TECH_BUCKET_COLORS[b];
    const label = TECH_BUCKET_LABELS[b];
    return `<span class="swatch" style="--swatch-color:${color}">${label}</span>`;
  }).join('');
  // legend stays visible in every view now that colour means the same
  // thing (tech bucket) regardless of layout
  el.hidden = false;
}

/*
 * Scene stepper. ◀ ▶ walk the SCENES array. Going to a new scene:
 *   - applies the scene's layout iff the view changed from the previous
 *     scene (so era-only changes within timeline don't re-trigger the fall)
 *   - re-renders the panel and the canvas
 */
function setupStepper() {
  const prevBtn = document.querySelector('#scene-prev');
  const nextBtn = document.querySelector('#scene-next');
  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener('click', () => goToScene(currentSceneIdx - 1));
  nextBtn.addEventListener('click', () => goToScene(currentSceneIdx + 1));
}

// A scene's "layout id" is what we compare to decide whether to re-fire a
// layout function. Most scenes use their view, but timeline sub-scenes
// that re-sort the histogram (fatal spotlight) get their own id so the
// dispatcher sees the change.
function layoutIdFor(scene) {
  if (scene.showFatalSpotlight) return 'tl-fatal';
  return scene.view;   // 'all' | 'timeline' | 'split' | 'venn-consequence'
}

function goToScene(idx) {
  if (idx < 0 || idx >= SCENES.length) return;
  const prev = SCENES[currentSceneIdx];
  const next = SCENES[idx];
  currentSceneIdx = idx;

  if (layoutIdFor(prev) !== layoutIdFor(next)) {
    applySceneLayout(next);
  }
  renderScene();
}

function applySceneLayout(scene) {
  const id = layoutIdFor(scene);
  if (id === 'all')                    groupBubbles();
  else if (id === 'split')             splitByResponse();
  else if (id === 'tl-fatal')          fatalSpotlightLayout();
  else if (id === 'timeline')          timelineLayout();
  else if (id === 'venn-consequence')  consequenceVennLayout();
  else if (id === 'response-bubbles')  responseBubblesLayout();
  else if (id === 'quadrant')          quadrantLayout();
  else if (id === 'cons-breakdown')    consequenceBreakdownLayout();
  else if (id === 'resp-breakdown')    responseBreakdownLayout();
}

function renderScene() {
  const scene = SCENES[currentSceneIdx];

  const indicator = document.querySelector('#scene-indicator');
  const title = document.querySelector('#scene-title');
  const body  = document.querySelector('#scene-body');
  const prev  = document.querySelector('#scene-prev');
  const next  = document.querySelector('#scene-next');
  const legend = document.querySelector('#legend');

  if (indicator) indicator.textContent =
    `Scene ${currentSceneIdx + 1} of ${SCENES.length}`;
  if (title) title.textContent = scene.title;
  if (body)  body.textContent  = scene.body;
  if (prev)  prev.disabled = currentSceneIdx === 0;
  if (next)  next.disabled = currentSceneIdx === SCENES.length - 1;
  // legend stays visible throughout — colour now means tech bucket in every view
  if (legend) legend.hidden = false;

  redraw();
}

/*
 * Sets up the hover control
 */
function setupTooltip(myNodes) {
  const canvasEl = document.querySelector('#vis');
  const tooltip  = document.querySelector('#tooltip');

  canvasEl.addEventListener('mousemove', function(event) {
    const { x, y } = toCanvasCoords(event);
    const node = getHoveredNode(x, y, myNodes);

    if (node) {
      tooltip.style.display = 'block';
      tooltip.style.left = (event.pageX + 12) + 'px';
      tooltip.style.top  = (event.pageY - 28) + 'px';
      tooltip.innerHTML  =
        '<strong>' + node.name + '</strong><br/>' +
        'Org: ' + (node.org || '—') + '<br/>' +
        'Tech: ' + TECH_BUCKET_LABELS[node.bucket] + '<br/>' +
        'Year: ' + (node.year == null ? 'Undated' : node.year);
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvasEl.addEventListener('mouseleave', function() {
    tooltip.style.display = 'none';
  });
}


// Calls initialization
init();
