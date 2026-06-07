/*
 * Based on https://github.com/vlandham/bubble_chart_v4 & claude
 * 
 * This data manipulation function takes the raw data from
 * the CSV file and converts it into an array of node objects.
 * Each node will store data and visualization values to visualize
 * a bubble.
 * This function returns the new node array, with a node in that
 * array for each element in the rawData input.
 */


// data.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { primaryTech } from './tech_buckets.js';
import { consequenceRegion } from './consequence_buckets.js';
import { responseRegion } from './response_buckets.js';
import { defaultRadius } from './constants.js';

export function loadData(callback) {
  d3.csv('data/aiaaic_cleaned.csv', function(d) {
    return d;
  }).then(callback);
}

export function createNodes(rawData) {
  // Drop years before 2015 to align with the notebook's analytical frame
  // (analysis/AIAAIC/explore.ipynb uses year_range=range(2015, 2027) for
  // tech regime and accountability charts). Undated rows are kept — they
  // aren't pre-2015, they're uncoded.
  const filtered = rawData.filter(d => {
    const y = parseYear(d.year);
    return y === null || y >= 2015;
  });

  const myNodes = filtered.map(d => ({
    id:          d.aiaaic_id,
    radius:      defaultRadius,            // starting radius; tween adjusts per view
    value:       1,
    name:        d.headline,
    org:         d.deployer,
    bucket:      primaryTech(d),           // tech bucket — drives colour in every view
    rawTech:     d.technology,             // raw string, useful for the tooltip
    year:           parseYear(d.year),        // number or null (undated)
    hasResponse:    d.has_response === 'True',
    hasConsequence: d.has_consequence === 'True',
    isFatal:        isFatal(d),
    consequenceRegion: consequenceRegion(d),
    responseRegion:    responseRegion(d),
    x:           Math.random() * 900,
    y:           Math.random() * 800
  }));

  return myNodes;
}

// "Loss of life" can be coded in either harm_individual or harm_societal
// (often both). Match the notebook's has_loss_of_life rule, cell 45.
function isFatal(d) {
  const combined = String(d.harm_individual || '') + ';' + String(d.harm_societal || '');
  return combined.includes('Loss of life');
}

function parseYear(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}



