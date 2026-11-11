import { words, hasTerm } from '../core/text.js';

/**
 * Classify a job title into a broad technology career cluster.
 * This helper is intentionally pure so it can be tested without a browser.
 */
export function clusterFor(title) {
  const normalizedTitle = words(title || '');
  const clusters = [
    ['AI & GenAI Transformation', ['ai', 'artificial intelligence', 'genai', 'machine learning', 'copilot', 'llm'], 'AI Strategy | Applied AI & Enterprise Transformation'],
    ['Technology Strategy & Advisory', ['field cto', 'strategist', 'advisory', 'technology strategy', 'solutions architect'], 'Technology Strategist | Enterprise Advisory & Architecture'],
    ['Cloud, Data & Architecture', ['cloud', 'data', 'architect', 'platform', 'infrastructure'], 'Enterprise Technology Architect | Cloud, Data & Platforms'],
    ['Product & Engineering Leadership', ['product', 'engineering', 'software', 'developer', 'technical lead'], 'Technology Leader | Product, Engineering & Delivery']
  ];

  for (const [name, terms, headline] of clusters) {
    if (terms.some(term => hasTerm(term, normalizedTitle))) {
      return { name, sub_headline: headline };
    }
  }

  return {
    name: 'General Technology',
    sub_headline: 'Technology Professional | Strategy, Delivery & Innovation'
  };
}

/**
 * Extract up to five meaningful bullet requirements from a job description.
 */
export function extractDemands(description) {
  const lines = (description || '').split(/\n|\r/).map(line => line.trim()).filter(Boolean);
  const bullets = lines
    .filter(line => /^[-•*]/.test(line))
    .map(line => line.replace(/^[-•*]\s*/, ''))
    .filter(line => line.length > 12);

  return [...new Set(bullets)].slice(0, 5);
}

/** Stable identity key for a normalized job posting. */
export function jobKey(job) {
  return `${job.ats}:${job.company}:${job.id || job.url}`;
}
