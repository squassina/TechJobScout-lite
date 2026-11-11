import { words, hasTerm } from '../core/text.js';

const textOf = value => String(value ?? '').trim();
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const includesAny = (text, patterns) => patterns.some(pattern => pattern.test(text));

export function deriveJobAttributes(job = {}) {
 const description = textOf(job.description);
 const lower = words(description);
 const rawMode = words(first(job.workplace_type, job.workplaceType, job.work_mode, job.workMode, ''));
 let workMode = '';
 if (job.remote === true || job.telecommuting === true || /remote|work from home/.test(rawMode) || includesAny(lower, [/\bfully remote\b/, /\bremote position\b/, /\bwork from anywhere\b/, /\bremote work\b/])) workMode = 'remote';
 else if (/hybrid/.test(rawMode) || /\bhybrid\b/.test(lower)) workMode = 'hybrid';
 else if (/on.?site|office/.test(rawMode) || /\bon.?site\b|\bin office\b|\boffice based\b/.test(lower)) workMode = 'onsite';
 return {workMode,location:textOf(job.location)};
}
const terms = value => String(value || '').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
const matchesTerms = (source, query) => terms(query).every(term => hasTerm(term, source));
export function filterJobsForDisplay(jobs, filters = {}) {
 const locations = (filters.locations || (filters.location ? [filters.location] : [])).map(x=>String(x).toLocaleLowerCase());
 const workModes = filters.workModes || (filters.workMode && filters.workMode !== 'all' ? [filters.workMode] : []);
 return (jobs || []).filter(job => {
  const a = job.displayAttributes || deriveJobAttributes(job);
  if (locations.length && a.location && !locations.some(location => a.location.toLocaleLowerCase() === location)) return false;
  if (workModes.length && a.workMode && !workModes.includes(a.workMode)) return false;
  if (filters.skills && !matchesTerms(job.description || '', filters.skills)) return false;
  return true;
 });
}
