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
import { defaultRadius } from './constants.js';

export function loadData(callback) {
  d3.csv('data/aiaaic_cleaned.csv', function(d) {
    return d;
  }).then(callback);
}

export function createNodes(rawData) {
  const myNodes = rawData.map(d => ({
    id:          d.aiaaic_id,
    radius:      defaultRadius,            // starting radius; tween adjusts per view
    value:       1,
    name:        d.headline,
    org:         d.deployer,
    bucket:      primaryTech(d),           // tech bucket — drives colour in every view
    rawTech:     d.technology,             // raw string, useful for the tooltip
    year:        parseYear(d.year),        // number or null (undated)
    hasResponse: d.has_response === 'True',
    x:           Math.random() * 900,
    y:           Math.random() * 800
  }));

  return myNodes;
}

function parseYear(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}



