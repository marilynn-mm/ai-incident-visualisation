// constants.js
export const width = 940;
export const height = 600;
export const forceStrength = 0.03;

export const center = { x: width / 2, y: height / 2 };

// Default dot radius for 'all' / 'split' views.
// Set to 5 (Option B from website/mockup.html) so the radius animation
// to timelineRadius (2.5) is a 2× shrink rather than 3.2×.
export const defaultRadius = 5;

// two clusters for aiaaic accountability split
export const splitCenters = {
  responded:    { x: width * 0.75, y: height / 2 },
  no_response:  { x: width * 0.25, y: height / 2 }
};

export const splitLabels = {
  responded:    { x: width * 0.75, label: 'Response documented' },
  no_response:  { x: width * 0.25, label: 'No response' }
};


// Timeline layout: stacked histogram by year, sub-columned to fit a busy year
// like 2024 (~404 incidents) inside the canvas. dotPitch is centre-to-centre
// spacing; timelineRadius is the visible dot. Pitch slightly > 2*radius leaves
// a thin gap so adjacent dots read as distinct.
// At pitch=6 across 19 year columns with the margins below, per-year capacity
// is ~486, which fits the busiest year (404 in 2024) with headroom.
export const timelineMargin = { top: 60, right: 40, bottom: 45, left: 60 };
export const timelineRadius = 2.5;
export const timelineDotPitch = 6;


// //  examplar data splits 
// export const yearCenters = {
//   2008: { x: width / 3,     y: height / 2 },
//   2009: { x: width / 2,     y: height / 2 },
//   2010: { x: 2 * width / 3, y: height / 2 }
// };

// export const yearsTitleX = {
//   2008: 160,
//   2009: width / 2,
//   2010: width - 160
// };