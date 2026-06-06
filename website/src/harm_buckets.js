// harm_buckets.js
// Tag → bucket mapping for color encoding.
// Justification and counting conventions: analysis/AIAAIC/HARM_TAXONOMY.md

// Stacking order (bottom → top in the timeline histogram).
export const BUCKET_ORDER = [
  'physical',
  'civil_rights',
  'psychological',
  'financial',
  'privacy',
  'societal',
  'environmental',
  'uncoded',
];

export const BUCKET_LABELS = {
  physical:      'Physical / safety',
  civil_rights:  'Civil rights / fairness',
  psychological: 'Psychological',
  financial:     'Financial / economic',
  privacy:       'Privacy / dignity',
  societal:      'Societal / institutional',
  environmental: 'Environmental',
  uncoded:       'No harm coded',
};

export const BUCKET_COLORS = {
  physical:      '#d8483e',
  civil_rights:  '#8e44ad',
  psychological: '#16a085',
  financial:     '#e6a23c',
  privacy:       '#3a80b8',
  societal:      '#7f4a2e',
  environmental: '#27ae60',
  uncoded:       '#cccccc',
};

// Reverse map: harm tag → bucket key.
// Built from BUCKETS below for ergonomic editing.
const BUCKETS = {
  physical: [
    'Loss of life', 'Bodily injury', 'Property damage', 'Health deterioration',
    'Trauma', 'Operational disruption', 'Critical infrastructure damage', 'Safety',
    'Damage to public safety', 'Damage to public health',
  ],
  financial: [
    'Financial loss', 'Job loss/losses', 'Opportunity loss', 'IP/copyright loss',
    'Fraud', 'Bankruptcy', 'Loss of livelihood', 'Market value loss',
    'IP loss', 'Copyright loss', 'Copyright abuse', 'Service quality erosion',
    'House foreclosure', 'Increased cost of living', 'Benefits loss',
    'Benefits/entitlements loss', 'Loss of benefits/entitlements',
    'Employment loss', 'Employee loss', 'Productivity loss', 'Loss of productivity',
    'Job elegibility', 'Care cuts',
  ],
  civil_rights: [
    'Discrimination', 'Loss of rights/freedoms', 'Autonomy/agency loss',
    'Stereotyping', 'Marginalisation', 'Societal inequality',
    'Limitation of rights/freedoms', 'Loss of liberty',
    'Loss of right to information', 'Loss of right to liberty and security',
    'Loss of social rights and access to public services',
    'Loss of freedom of expression/right of assembly', 'Loss of care',
    'Financial exclusion', 'Benefits denial', 'Unconstitutional',
  ],
  privacy: [
    'Privacy loss', 'Confidentiality loss', 'Reputational damage', 'Dignity loss',
    'Defamation', 'Personality rights loss', 'Identity theft', 'Identity loss',
    'Misrepresentation', 'Dehumanisation/objectification', 'Sexualisation',
    'Public humiliation', 'Privacy', 'Surveillance', 'Privacy/surveillance loss',
    'Sexual exploitation', 'Appropriation', 'IP/Appropriation loss',
    'Authenticity/integrity', 'Loss of integrity',
  ],
  psychological: [
    'Anxiety/distress', 'Harassment', 'Deception/manipulation', 'Intimidation',
    'Stigmatisation', 'Addiction', 'Psychosis', 'Emotional dependency',
    'Isolation', 'Chilling effect', 'Manipulation', 'Radicalisation',
    'Victimisation', 'Desensitisation', 'Over-reliance', 'Experience degradation',
  ],
  societal: [
    'Institutional trust loss', 'Erosion of democratic integrity',
    'Societal destabilisation', 'Information ecosystem degradation',
    'Political polarisation/instability', 'Erosion of community wellbeing/cohesion',
    'Damage to national security', 'Historical revisionism',
    'Damage to economic, social, political systems/stability',
    'Resource diversion', 'Competitive loss', 'Market distortion/monopolisation',
    'Voter manipulation', 'Cultural identity erosion', 'Cultural damage',
    'Linguistic damage', 'Community backlash', 'Public service delivery deterioration',
    'Trust loss', 'Loss of trust', 'Loss of security, safety',
    'Creativity loss', 'Increased workload', 'Bias', 'Disruption',
    'Traffic confusion', 'Obstruction of firefighters', 'Violence increase',
    'Employment/labour', 'Hazardous materials management', 'Virus spread',
    'Denial of service', 'Candidate resignation', 'Virus contraction',
  ],
};

const TAG_TO_BUCKET = {};
for (const [bucket, tags] of Object.entries(BUCKETS)) {
  for (const tag of tags) TAG_TO_BUCKET[tag] = bucket;
}

// Primary bucket = bucket of the first listed tag in the first non-empty
// harm column, in the order individual → societal → environmental.
// Returns 'uncoded' if no harm is coded at all.
export function primaryBucket(row) {
  // Environmental column has its own bucket.
  const envFirst = firstTag(row.harm_environmental);
  const indFirst = firstTag(row.harm_individual);
  const socFirst = firstTag(row.harm_societal);

  const firstNonEmpty = indFirst || socFirst || envFirst;
  if (!firstNonEmpty) return 'uncoded';

  // If the first non-empty was individual or societal, look it up.
  // The environmental column always maps to 'environmental' regardless of tag.
  if (indFirst) return TAG_TO_BUCKET[indFirst] || 'societal';
  if (socFirst) return TAG_TO_BUCKET[socFirst] || 'societal';
  return 'environmental';
}

function firstTag(cell) {
  if (!cell) return null;
  const s = String(cell).trim();
  if (!s) return null;
  return s.split(';')[0].trim() || null;
}
