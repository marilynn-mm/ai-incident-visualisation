// narrative.js
// All annotation copy for the visualization. Edit the strings freely.
// Structure should remain stable; the renderer/main.js read these.

//
// Each scene declares:
//   view    — 'all' | 'timeline' | 'split' (which layout to apply)
//   eraIdx  — optional. Only meaningful when view === 'timeline'.
//             -1 = no era highlighted (panoramic view of the histogram).
//             0..N-1 = highlight TIMELINE_ERAS[eraIdx], dim other years.
//   title   — heading shown in the scene panel
//   body    — short paragraph; keep it tight


export const SCENES = [
  {
    id: 'cluster',
    view: 'all',
    title: 'Over 2,200 documented AI incidents',
    body: 'Every dot is one incident in the AIAAIC database from 2015 onward, coloured by its primary technology. The mix you see in this cluster is the cumulative landscape across the past decade.',
  },
  {
    id: 'tl-overview-start',
    view: 'timeline',
    eraIdx: -1,
    title: 'Plotted by year',
    body: 'The same incidents, now arranged into year columns from 2015 through 2026 (plus an Undated column on the right for incidents missing a year). The shape tells the story: a slow climb dominated by machine learning and facial recognition, then a sharp surge from 2023 as generative AI takes over.',
  },

  // --- Tech-filter cycle  -----------------------------
  // Same year-histogram layout; each scene highlights one technology and
  // overlays a top-8 horizontal harm bar chart in the top-left corner.
  // Filters match raw boolean flags so multi-tech incidents (e.g. a GenAI
  // deepfake) light up in both the GenAI and Deepfake scenes.

  {
    id: 'tl-tech-genai',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'genai',
    title: 'Generative AI',
    body: 'Each highlighted dot is an incident tagged generative AI. The harm profile is unique: privacy / dignity tags dominate (likeness theft, defamation, identity), with intellectual-property loss close behind. Physical-safety harms are nearly absent.',
  },
  {
    id: 'tl-tech-ml',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'ml',
    title: 'Machine learning',
    body: 'The dominant tech of the pre-GenAI era. Harms skew towards discrimination, financial loss, and benefit denial — the classic risk surface of automated decision systems in hiring, credit, and welfare.',
  },
  {
    id: 'tl-tech-facial',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'facial',
    title: 'Facial recognition',
    body: 'Peaks around 2019–2021. Privacy loss and surveillance lead the harm tags by a wide margin, with civil rights and wrongful-arrest harms forming the second cluster.',
  },
  {
    id: 'tl-tech-deepfake',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'deepfake',
    title: 'Deepfake',
    body: 'A 2023+ phenomenon riding the GenAI wave. Deception/manipulation, reputational damage, and sexualisation dominate — harms that target individuals rather than systems. Many deepfake incidents are also tagged generative AI; they light up in both scenes.',
  },
  {
    id: 'tl-tech-cv',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'cv',
    title: 'Computer vision',
    body: 'A smaller but persistent bucket. Surveillance, misidentification, and stereotyping harms — the symptoms of vision systems deployed without ground truth.',
  },
  {
    id: 'tl-tech-av',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'av',
    title: 'Self-driving',
    body: 'The smallest tech bucket but the only one with loss of life as the top harm. Almost every incident here is a fatality investigation or property damage from a Tesla / Waymo / Cruise event.',
  },

  {
    id: 'tl-fatal',
    view: 'timeline',
    eraIdx: -1,
    showFatalSpotlight: true,
    title: 'Fatal AI incidents',
    body: '127 incidents in the corpus involve loss of life — about 5.7% of the total. The count climbed to 25 in 2025, the highest on record, and was already 17 the year before. The harm field is only ~40% complete in recent years, so the real count is almost certainly higher.',
  },
  {
    id: 'tl-overview-end',
    view: 'timeline',
    eraIdx: -1,
    title: 'All incidents on the timeline',
    body: 'Back to the full corpus, no filter. Same 2,203 dots, same year columns. From here we layer accountability data on top of the volume curve.',
  },
  {
    id: 'tl-accountability-line',
    view: 'timeline',
    eraIdx: -1,
    showAccountabilityLine: true,
    showResponseLine:       true,
    title: 'Governance hasn\'t scaled with the problem',
    body: 'Two rate lines overlay the histogram: % with a documented consequence (red) and % with a documented response (blue). Both drop from ~50% in 2015 to single digits by 2024, while annual incident volume grows 20× over the same window. The partial recovery at the right edge is reporting lag — consequences and responses take time to be recorded — but the long-run direction is clear: enforcement and response aren\'t keeping pace.',
  },

  // --- Quadrant Act (Q1–Q5) ----------------------------------------------
  // The 2×2 of consequence × response, then a tech overlay, then breakdown
  // by consequence type, by response type, and finally a focus on the
  // "neither" cluster (60% of incidents). Axes: x = consequence, y = response.
  {
    id: 'q1-quadrant',
    view: 'quadrant',
    title: 'Two questions, four outcomes',
    body: 'Two yes/no questions about each incident — did anything formal happen (consequence) and did the organization say anything (response)? Crossing them produces a 2×2. The sizes are blunt: the "neither" quadrant is six in ten incidents.',
  },

  // {
  //   id: 'q2-quadrant-tech',
  //   view: 'quadrant',
  //   // showQuadrantTech: true,
  //   title: 'Different tech, different fates',
  //   body: 'Each quadrant has a dominant technology. The mix isn\'t even — the kind of AI involved is part of what determines which quadrant an incident lands in.',
  // },
  
  {
    id: 'q3-cons-breakdown',
    view: 'cons-breakdown',
    dimRule: 'no-cons',
    title: 'When there is a consequence, what kind?',
    body: 'Incident with consequences reorganizes by its primary consequence category. TThe right column (incidents with a documented consequence) splits along the x-axis by the type of consequence. Litigation is by far the dominant category — most "consequence" in this database is a lawsuit, not a fine or a regulatory action.',
  },
  {
    id: 'q1-quadrant',
    view: 'quadrant',
    title: '',
    body: '',
  },
  {
    id: 'q4-resp-breakdown',
    view: 'resp-breakdown',
    dimRule: 'no-resp',
    title: 'When there is a response, what kind?',
    body: 'Incident with response reorganizes by its primary response category. The top row (incidents with a documented response) splits along the x-axis by response type. "System review / update" dominates — the modal organizational response to an AI harm is "we\'ll look into it," not termination or apology.',
  },
  {
    id: 'q1-quadrant',
    view: 'quadrant',
    title: '',
    body: '',
  },
  {
    id: 'q5-neither',
    view: 'quadrant',
    dimRule: 'not-neither',
    title: 'The black hole',
    body: '1,322 incidents — 60% of the corpus — have no documented consequence and no documented response. They were reported, catalogued, and then nothing more happened that the database could record.',
  },

  // {
  //   id: 'consequence-split',
  //   view: 'venn-consequence',
  //   title: 'Which incidents had consequences?',
  //   body: 'Only 25% of the corpus has a documented consequence at all. Those that do split heavily into three categories: Litigation, Regulatory investigation, and Fine/settlement — a 3-circle Venn captures their overlap. Police investigation pairs with Litigation often enough (6 incidents) to deserve its own bridge cluster. Five more named categories trail behind, and the remaining ~95 incidents fall into a long-tail "Other" bucket.',
  // },
  // {
  //   id: 'response-split',
  //   view: 'response-bubbles',
  //   title: 'Which incidents had a response?',
  //   body: 'Watch where the dots come from: the 464 incidents with any documented response migrate to the "Has response" oval on the right — pulled from both the consequence and no-consequence groups. The 1,739 remaining dots settle into two clusters by their consequence status. The dominant response category, by a wide margin, is "System review / update" — meaning the most common organizational response to an AI harm is "we\'ll look into it."',
  // },
  
];
