// Which provenance paths are shown as chips. The backend records every leaf of the draft; the
// form only renders chips on the fields a candidate actually reads, so only those are "reviewable".
const REVIEWABLE: RegExp[] = [
  /^(name|email|phone)$/,
  /^education_details\.\d+\.(degree|institution|year|score)$/,
  /^internships\.\d+\.(title|org|start|end)$/,
  /^projects\.\d+\.(name|description)$/,
  /^hackathons\.\d+\.(name|result|year)$/,
  /^certifications\.\d+\.(name|issuer|year)$/,
  /^skills\.\d+\.skill_name$/,
  /^preferred_roles\.\d+$/,
];

export const isReviewable = (path: string): boolean => REVIEWABLE.some((r) => r.test(path));
