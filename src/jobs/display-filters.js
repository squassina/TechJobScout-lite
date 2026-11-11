import { words, hasTerm } from '../core/text.js';

const textOf = value => String(value ?? '').trim();
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const includesAny = (text, patterns) => patterns.some(pattern => pattern.test(text));
const parseAmount = value => {
 const number = Number(String(value ?? '').replace(/[^0-9.,-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.'));
 return Number.isFinite(number) && number > 0 ? number : null;
};
const currencyOf = text => {
 const value = String(text || '');
 if (/\bBRL\b|R\$/i.test(value)) return 'BRL';
 if (/\bUSD\b|US\$|\$/i.test(value)) return 'USD';
 if (/\bEUR\b|€/i.test(value)) return 'EUR';
 if (/\bGBP\b|£/i.test(value)) return 'GBP';
 return '';
};
function sectionText(description, headings) {
 const lines = String(description || '').split(/\n+/);
 let active = false, found = [];
 for (const line of lines) {
  const heading = line.trim().replace(/[:：]$/, '');
  if (headings.start.test(heading)) { active = true; continue; }
  if (headings.stop.test(heading)) active = false;
  if (active) found.push(line);
 }
 return found.join(' ').trim();
}
export function deriveJobAttributes(job = {}) {
 const description = textOf(job.description);
 const lower = words(description);
 const rawMode = words(first(job.workplace_type, job.workplaceType, job.work_mode, job.workMode, ''));
 let workMode = '';
 if (job.remote === true || job.telecommuting === true || /remote|work from home/.test(rawMode) || includesAny(lower, [/\bfully remote\b/, /\bremote position\b/, /\bwork from anywhere\b/, /\bremote work\b/])) workMode = 'remote';
 else if (/hybrid/.test(rawMode) || /\bhybrid\b/.test(lower)) workMode = 'hybrid';
 else if (/on.?site|office/.test(rawMode) || /\bon.?site\b|\bin office\b|\boffice based\b/.test(lower)) workMode = 'onsite';

 const employment = words(first(job.employment_type, job.employmentType, job.commitment, job.contract_type, job.contractType, ''));
 let contract = '';
 if (/full.?time|permanent/.test(employment) || /\bfull.?time\b|\bpermanent position\b/.test(lower)) contract = 'full-time';
 else if (/part.?time/.test(employment) || /\bpart.?time\b/.test(lower)) contract = 'part-time';
 else if (/contract|freelance|temporary|fixed.?term/.test(employment) || /\bcontract( role| position)?\b|\bfreelance\b|\btemporary\b|\bfixed.?term\b/.test(lower)) contract = 'contract';
 else if (/intern/.test(employment) || /\binternship\b/.test(lower)) contract = 'internship';

 const salaryObject = job.salary || job.compensation || {};
 const salaryText = [job.salary, job.compensation, job.salaryRange, job.salary_range, description.match(/.{0,45}(?:salary|compensation|remuneration|\bR\$|\bUSD\b|\bEUR\b|\bGBP\b).{0,70}/i)?.[0]].filter(x => typeof x === 'string' || typeof x === 'number').join(' ');
 const salaryMin = parseAmount(first(job.salaryMin, job.salary_min, salaryObject.min, salaryObject.minimum, salaryObject.minValue, ''));
 const salaryMax = parseAmount(first(job.salaryMax, job.salary_max, salaryObject.max, salaryObject.maximum, salaryObject.maxValue, ''));
 const salaryCurrency = textOf(first(job.salaryCurrency, job.salary_currency, salaryObject.currency, currencyOf(salaryText))).toUpperCase();
 const salaryKnown = salaryMin !== null || salaryMax !== null;

 const requiredText = sectionText(description, {start:/^(?:requirements|what you(?:'|’)ll need|required qualifications|minimum qualifications|must have|what we(?:'|’)re looking for|skills required|requisitos|qualificações obrigatórias)$/i,stop:/^(?:nice to have|preferred qualifications|desirable|bonus points|benefits|about us|responsibilities|what you(?:'|’)ll do|differentials|desejável|qualificações desejáveis)$/i});
 const desiredText = sectionText(description, {start:/^(?:nice to have|preferred qualifications|desirable|bonus points|preferred skills|qualificações desejáveis|diferenciais)$/i,stop:/^(?:benefits|about us|responsibilities|what you(?:'|’)ll do|company|about the role|sobre a empresa)$/i});

 let travel = '';
 if (includesAny(lower, [/\bno travel required\b/, /\bno travel\b/, /\btravel is not required\b/, /\bsem necessidade de viagens\b/])) travel = 'none';
 else if (includesAny(lower, [/\bfrequent travel\b/, /\bextensive travel\b/, /\btravel up to (?:50|75|100)%\b/, /\bviagens frequentes\b/])) travel = 'frequent';
 else if (includesAny(lower, [/\boccasional travel\b/, /\btravel occasionally\b/, /\btravel up to (?:10|20|25)%\b/, /\bviagens ocasionais\b/])) travel = 'occasional';

 let geographicEligibility = '';
 if (includesAny(lower, [/\bvisa sponsorship\b/, /\bsponsorship available\b/, /\bwork visa support\b/, /\bpatroc[ií]nio de visto\b/])) geographicEligibility = 'sponsorship';
 else if (includesAny(lower, [/\brelocation (?:assistance|support|package)\b/, /\bwill relocate\b/, /\brelocation offered\b/, /\baux[ií]lio.?mudan[cç]a\b/])) geographicEligibility = 'relocation';
 else if (workMode === 'remote' && includesAny(lower, [/\bworldwide\b/, /\banywhere in the world\b/, /\bglobal remote\b/, /\bwork from anywhere\b/])) geographicEligibility = 'worldwide';
 const languageKnown = includesAny(lower, [/\\benglish (?:is )?(?:required|proficiency|fluent)\\b/, /\\bportuguese (?:is )?(?:required|proficiency|fluent)\\b/, /\\bspanish (?:is )?(?:required|proficiency|fluent)\\b/, /\\bfrench (?:is )?(?:required|proficiency|fluent)\\b/, /\\bgerman (?:is )?(?:required|proficiency|fluent)\\b/, /\\b(japanese|mandarin|chinese|italian|dutch|arabic) (?:is )?(?:required|proficiency|fluent)\\b/, /\\blanguage requirements?\\b/, /\\bidioma (?:obrigat[oó]rio|exigido)\\b/]);\n return {workMode,location:textOf(job.location),geographicEligibility,contract,salaryMin,salaryMax,salaryCurrency,salaryKnown,languageText:languageKnown?description:'',travel,requiredText,desiredText,postedAt:first(job.createdAt,job.created_at,job.publishedAt,job.published_at,job.published,job.updatedAt,job.updated_at,job.releasedAt,job.released_at,null)};
}
const terms = value => String(value || '').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
const matchesTerms = (source, query) => terms(query).every(term => hasTerm(term, source));
const isKnown = value => value !== null && value !== undefined && value !== '';
const keepUnknown = (value, includeUnknown) => isKnown(value) || includeUnknown;
export function filterJobsForDisplay(jobs, filters = {}) {
 const includeUnknown = filters.includeUnknown !== false;
 const now = Number(filters.now ?? Date.now());
 const maxAge = ({'24h':86400000,'7d':604800000,'15d':1296000000,'30d':2592000000})[filters.postedWithin] || null;
 return (jobs || []).filter(job => {
  const a = job.displayAttributes || deriveJobAttributes(job);
  if (filters.workMode && filters.workMode !== 'all' && (a.workMode ? a.workMode !== filters.workMode : !includeUnknown)) return false;
  if (filters.location && (!a.location ? !includeUnknown : !(a.location || '').toLowerCase().includes(filters.location.toLowerCase()) && !(a.geographicEligibility === 'worldwide' && /worldwide|global|anywhere/i.test(filters.location)))) return false;
  if (filters.geoEligibility && filters.geoEligibility !== 'all' && (a.geographicEligibility ? a.geographicEligibility !== filters.geoEligibility : !includeUnknown)) return false;
  if (filters.contract && filters.contract !== 'all' && (a.contract ? a.contract !== filters.contract : !includeUnknown)) return false;
  if (filters.currency && filters.currency !== 'all' && (a.salaryCurrency ? a.salaryCurrency !== filters.currency : !includeUnknown)) return false;
  const min = Number(filters.salaryMin), max = Number(filters.salaryMax);
  if (filters.salaryMin && (!a.salaryKnown ? !includeUnknown : (a.salaryMax ?? a.salaryMin) < min)) return false;
  if (filters.salaryMax && (!a.salaryKnown ? !includeUnknown : (a.salaryMin ?? a.salaryMax) > max)) return false;
  if (filters.language && (!a.languageText ? !includeUnknown : !matchesTerms(a.languageText, filters.language))) return false;
  if (filters.travel && filters.travel !== 'all' && (a.travel ? a.travel !== filters.travel : !includeUnknown)) return false;
  if (filters.requiredSkills && (!a.requiredText ? !includeUnknown : !matchesTerms(a.requiredText, filters.requiredSkills))) return false;
  if (filters.desiredSkills && (!a.desiredText ? !includeUnknown : !matchesTerms(a.desiredText, filters.desiredSkills))) return false;
  if (maxAge) {
   const posted = Date.parse(a.postedAt || '');
   if (!Number.isFinite(posted)) { if (!includeUnknown) return false; }
   else if (now - posted > maxAge || posted > now + 86400000) return false;
  }
  return true;
 });
}
