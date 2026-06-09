// constants.js
export const width = 940;
export const height = 600;
export const forceStrength = 0.03;

export const center = { x: width / 2, y: height / 2 };

// Single dot radius — used by every view. Was previously split across
// defaultRadius / timelineRadius / vennRadius; collapsed after the timeline
// layout became the only one and no view needed a different size.
export const dotRadius = 3;

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
// spacing. Pitch slightly > 2*dotRadius leaves a thin gap so adjacent dots
// read as distinct.
export const timelineMargin = { top: 60, right: 40, bottom: 45, left: 60 };
export const timelineDotPitch = 7;

