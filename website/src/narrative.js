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
    id: 'particles',
    view: 'particles',
    title: 'A visual journey through trends around AI incidents and its aftermath',
    body: 'Its 2026. AI is everywhere, and so is the fear around it. Job losses, surveillance, autonomous weapons. We all hear about isolated incidents, like a chatbot linked to a mental health spiral, a facial recognition system misidentifying the wrong person, a biased algorithm systematically discriminating against a particular racial group… But these stories reach us one at a time, stripped of context. What does the larger picture look like? How often do AI systems actually fail? Who gets hurt? Who is responsible? And is it getting worse?',
  },
  {
    id: 'cluster',
    view: 'all',
    title: 'AIAAIC Database',
    body: 'With over 2,200 documented incidents, AI Algorithmic and Automation Incidents (AIAAIC) repository an independent, non-partisan, public interest initiative that tracks and documents the risks, harms, and ethical issues of AI. Every dot is one incident in the AIAAIC database, coloured by its primary technology type.',
  },
  {
    id: 'tl-overview-start',
    view: 'timeline',
    eraIdx: -1,
    title: 'Growth over years',
    body: 'Incidents are arranged by year from 2015 through 2026. Volume grew over 20 times from 2015 to 2024. Note the deline in 2025/2026 is most likely due to reporting lag as a result of AIAAIC. Lets break this down further by technology time.',
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
    body: 'Each highlighted dot is an incident tagged generative AI (ChatGPT, Midjourney, Suno, etc..) that synthesize text, images, audio, or video from prompts. The category essentially didn\'t exist before late 2022; after ChatGPT\'s launch it surges to ~43% of 2024 incidents and ~61% of 2025. Privacy and dignity related tags tags dominate harm profile. Read more about harm categories in the AIAAIC website.',
  },
  {
    id: 'tl-tech-ml',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'ml',
    title: 'Machine learning',
    body: 'Machine learning is the broad family of algorithms that learn from data. The engine behind automated decision systems in hiring, credit scoring, welfare eligibility, and content moderation. Because nearly every modern AI system is machine learning, many incidents carry the ML tag alongside a more specific technology; this visualization colors a dot by its most specific label, so what you\'re seeing are incidents where ML is the most specific tag that fits. Harms skew toward discrimination, financial loss, and benefit denial',
  },
  {
    id: 'tl-tech-facial',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'facial',
    title: 'Facial recognition',
    body: 'Facial recognition is AI that identifies or verifies people from their facial features, often deployed in law enforcement, building access, airport screening, large public surveillance. Incidents peak in 2019–2021, the era of high-profile wrongful-arrest cases and contested police contracts. Privacy and surveillance harms lead the tags by a wide margin, with civil-rights and wrongful-arrest harms forming a second cluster. Compared with other tech, tarm tends to be systemic.',
  },
  {
    id: 'tl-tech-deepfake',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'deepfake',
    title: 'Deepfake',
    body: 'Deepfakes are AI-generated audio, video, or images that synthesize a real person, leading to political misinformation, non-consensual sexual imagery, impersonation scams. The category is a 2023-onward phenomenon riding the GenAI wave. Many incidents are tagged both and light up in both scenes. Most common harms target individuals rather than systems. Many deepfake incidents are also tagged generative AI; they light up in both scenes.',
  },
  {
    id: 'tl-tech-cv',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'cv',
    title: 'Computer vision',
    body: 'Computer vision is the umbrella for AI that interprets images and video. Facial recognition and self-driving systems are technically computer vision applications but coded separately in this visualisation. This category examines cases outside of the two visible applications, in cases such as smart retail cameras, image-content, moderation, social-media auto-tagging, body-pose tracking. The bucket is small but appears in every year of the dataset.',
  },
  {
    id: 'tl-tech-av',
    view: 'timeline',
    eraIdx: -1,
    techFilter: 'av',
    title: 'Self-driving',
    body: 'Self-driving is AI that operates a vehicle without continuous human control, such as Tesla Autopilot, Waymo, Cruise, Mercedes Drive Pilot. The smallest tech bucket but the only one with loss of life as the top harm. Almost every incident here is a fatality investigation or property damage from a vehicle in autonomous mode.',
  },

  {
    id: 'tl-fatal',
    view: 'timeline',
    eraIdx: -1,
    showFatalSpotlight: true,
    title: 'Fatal AI incidents',
    body: '5.7%, 127 incidents in AIAAIC database involve loss of life, 5.7% of the total. The count climbed to 25 in 2025, the highest on record, and was already 17 the year before.',
  },
  {
    id: 'tl-overview-end',
    view: 'timeline',
    eraIdx: -1,
    title: 'Were these incidents held accountable?',
    body: ' Next section explore accoutability, which comes in two forms. Consequence describes accountability imposed by public reaction, existing regulation, and governance infrastructure external to the developer and deployer. Response describes the responsibility taken by those parties voluntarily in reaction to the incident.',
  },
  {
    id: 'tl-accountability-line',
    view: 'timeline',
    eraIdx: -1,
    showAccountabilityLine: true,
    showResponseLine:       true,
    title: 'Governance hasn\'t scaled with the problem',
    body: 'Two rate lines capturing % of incidents with documented consequence and % with a documented response. Both drop from ~50% in 2015 to single digits by 2024, this indicate that enforcement and response aren\'t keeping pace with the technology usage. Note that the rise in 2025/2026 might be caused by reporting lag, where high profile incident with accountability gets documented first while the more invisible cases goes unreported until later. The the trend is clear: enforcement and response aren\'t keeping pace.',
  },

  // --- Quadrant Act ----------------------------------------------
  // The 2×2 of consequence × response, then a tech overlay, then breakdown
  // by consequence type, by response type, and finally a focus on the
  // "neither" cluster (60% of incidents). Axes: x = consequence, y = response.
  {
    id: 'q1-quadrant',
    view: 'quadrant',
    title: 'Consequences and Responses',
    body: 'Incidents are seperated into four categories: those with both consequence and response, only consequences, only responses, and neither. Majority of the incidents faced no accountability.',
  },
  {
    id: 'q3-cons-breakdown',
    view: 'cons-breakdown',
    dimRule: 'no-cons',
    title: 'When there is a consequence, what kind?',
    body: 'Incident with consequences reorganizes by the type of consequences. Most common is litigation, refering to when impacted individuals have taken dispute to court, though does not account for results of the cases or dispute settled out of court. Note that some incidents have multiple types of consequences.'
  },
  {
    id: 'q1-quadrant',
    view: 'quadrant',
    title: 'Consequences and Responses',
    body: 'Incidents are seperated into four categories: those with both consequence and response, only consequences, only responses, and neither. Majority cases faced no accountability.',
  },
  {
    id: 'q4-resp-breakdown',
    view: 'resp-breakdown',
    dimRule: 'no-resp',
    title: 'When there is a response, what kind?',
    body: 'Incidents are seperated into four categories: those with both consequence and response, only consequences, only responses, and neither. Majority of the incidents faced no accountability.',
  },
  {
    id: 'q5-neither',
    view: 'quadrant',
    dimRule: 'not-neither',
    title: 'Conclusion',
    body: '1,322 out of the 2,203 incidents have no documented consequence or response. They were reported, catalogued, and then nothing more happened that the database could record. The accountability gap doesn\'t close on its own. As consumers, we have a responsibility to challenge those that develop and  deployed the systems. This visualisation is built on the work of Charlie Pownall and a network of contributors maining AIAAIC database so AI harms are not forgotten. If you know of an incident that isn\'t documented or want to learn more, visit AIAAIC https://www.aiaaic.org/',
  },
  
];
