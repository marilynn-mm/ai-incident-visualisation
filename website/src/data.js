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

// exported functions

export function loadData(callback) {
  d3.csv('data/gates_money.csv', function(d) {
    return {
      id:           d.id,
      total_amount: +d.total_amount,
      grant_title:  d.grant_title,
      organization: d.organization,
      group:        d.group,
      start_year:   d.start_year
    };
  }).then(callback);
}

export function createNodes(rawData) {
  const maxAmount = d3.max(rawData, d => +d.total_amount);

  const radiusScale = d3.scalePow()
    .exponent(0.5)
    .range([2, 85])
    .domain([0, maxAmount]);

  const myNodes = rawData.map(d => ({
    id:     d.id,
    radius: radiusScale(d.total_amount),
    value:  d.total_amount,
    name:   d.grant_title,
    org:    d.organization,
    group:  d.group,
    year:   d.start_year,
    x:      Math.random() * 900,
    y:      Math.random() * 800
  }));

  myNodes.sort((a, b) => b.value - a.value);

  return myNodes;
}


