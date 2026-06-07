// narrative.js
// All annotation copy for the visualization. Edit the strings freely.
// Structure (keys) should remain stable; the renderer/main.js read these.
//
// Two exports:
//   TIMELINE_ERAS — the era definitions used inside the timeline scene
//   SCENES        — the full ◀ ▶ navigable story spine. Each scene says
//                   which view to render and (when in timeline) which era
//                   to highlight, plus the copy to display.
//
// Numbers and findings are drawn from analysis/AIAAIC/explore.ipynb
// (cells 8 and 11 — technology regime change, GenAI share). The
// notebook's framing for the timeline chart is the headline this
// narrative builds toward:
//   "Technology regime change — GenAI displaces prior risk landscape"


export const TIMELINE_ERAS = [
  {
    id: 'ml-era',
    label: 'ML era',
    yearRange: [2015, 2018],
    title: 'Machine learning controversies (2015–2018)',
    body: 'The corpus begins here. Recommendation systems, hiring algorithms, risk scoring — machine learning accounts for ~30% of incidents in 2017. Facial recognition starts to climb; generative AI is essentially absent.',
  },
  {
    id: 'fr-peak',
    label: 'Facial recognition peaks',
    yearRange: [2019, 2021],
    title: 'Facial recognition takes the lead (2019–2021)',
    body: 'Facial recognition becomes the single largest tech bucket: 33% of incidents in 2019. Wrongful arrests, surveillance contracts, and biased deployments drive the surge. Annual incident counts more than double from 122 to 248.',
  },
  {
    id: 'pre-genai',
    label: 'Before the wave',
    yearRange: [2022, 2022],
    title: 'The year before (2022)',
    body: 'Incidents dip to 156 — possibly a coding lag. Facial recognition and machine learning still split the field. Generative AI is 6%. ChatGPT launches in November; AIAAIC won\'t feel it until next year.',
  },
  {
    id: 'genai-explosion',
    label: 'GenAI explosion',
    yearRange: [2023, 2023],
    title: 'GenAI jumps from 6% to 40% (2023)',
    body: 'In one year, generative AI goes from a curiosity to nearly half the corpus. 150 of 373 incidents this year tag GenAI; facial recognition\'s share collapses to 4%.',
  },
  {
    id: 'genai-majority',
    label: 'GenAI majority',
    yearRange: [2024, 2025],
    title: 'A new regime (2024–2025)',
    body: 'GenAI holds at 43% in 2024, then jumps to 61% in 2025 — a majority. The prior risk landscape doesn\'t shrink so much as it gets displaced. Other tech categories continue producing incidents at similar absolute rates while GenAI grows alongside them.',
  },
  {
    id: 'partial',
    label: '2026 (partial)',
    yearRange: [2026, 2026],
    title: 'Reporting lag (2026)',
    body: 'Only 43 incidents logged so far. The year is incomplete and the corpus is still being entered. GenAI continues to dominate what has been reported.',
  },
];


// The story spine. ◀ ▶ walk this array.
//
// Each scene declares:
//   view    — 'all' | 'timeline' | 'split' (which layout to apply)
//   eraIdx  — optional. Only meaningful when view === 'timeline'.
//             -1 = no era highlighted (panoramic view of the histogram).
//             0..N-1 = highlight TIMELINE_ERAS[eraIdx], dim other years.
//   title   — heading shown in the scene panel
//   body    — short paragraph; keep it tight
//
// The timeline eras are merged in from TIMELINE_ERAS so era copy lives in
// one place. To reorder or remove story beats, edit this array directly.
export const SCENES = [
  {
    id: 'cluster',
    view: 'all',
    title: 'Over 2,200 documented AI incidents',
    body: 'Every dot is one incident in the AIAAIC database from 2015 onward, coloured by its primary technology. The mix you see in this cluster is the cumulative landscape across the past decade.',
  },
  {
    id: 'tl-overview',
    view: 'timeline',
    eraIdx: -1,
    title: 'Technology regime change',
    body: 'The same incidents organized by year, 2015 through 2026. The shape tells the headline: a slow climb dominated by machine learning and facial recognition, then a sharp regime change as generative AI displaces the prior landscape after 2022.',
  },
  ...TIMELINE_ERAS.map((era, idx) => ({
    id: `tl-${era.id}`,
    view: 'timeline',
    eraIdx: idx,
    title: era.title,
    body: era.body,
  })),
  {
    id: 'tl-fatal',
    view: 'timeline',
    eraIdx: -1,
    showFatalSpotlight: true,
    title: 'Fatal AI incidents',
    body: '127 incidents in the corpus involve loss of life — about 5.7% of the total. The count climbed to 25 in 2025, the highest on record, and was already 17 the year before. The harm field is only ~40% complete in recent years, so the real count is almost certainly higher.',
  },
  {
    id: 'tl-accountability-line',
    view: 'timeline',
    eraIdx: -1,
    showAccountabilityLine: true,
    title: 'Governance hasn\'t scaled with the problem',
    body: 'Layered over the volume curve: the share of incidents each year with any documented consequence. The line drops from 55% in 2015 to 15% in 2024, even as annual totals grow 20×. The partial recovery in 2025–26 is almost certainly reporting lag — consequences take time to be recorded — but the long-run direction is clear: enforcement isn\'t keeping pace.',
  },
  {
    id: 'consequence-split',
    view: 'venn-consequence',
    title: 'Which incidents had consequences?',
    body: 'Only 25% of the corpus has a documented consequence at all. Those that do split heavily into three categories: Litigation, Regulatory investigation, and Fine/settlement — a 3-circle Venn captures their overlap. Police investigation pairs with Litigation often enough (6 incidents) to deserve its own bridge cluster. Five more named categories trail behind, and the remaining ~95 incidents fall into a long-tail "Other" bucket.',
  },
  {
    id: 'response-split',
    view: 'response-bubbles',
    title: 'Which incidents had a response?',
    body: 'Watch where the dots come from: the 464 incidents with any documented response migrate to the "Has response" oval on the right — pulled from both the consequence and no-consequence groups. The 1,739 remaining dots settle into two clusters by their consequence status. The dominant response category, by a wide margin, is "System review / update" — meaning the most common organizational response to an AI harm is "we\'ll look into it."',
  },
];
