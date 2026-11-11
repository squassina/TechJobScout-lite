// Public board identifiers used by the default company list.
// Keep this data and endpoint construction shared by the browser app and live validator.
export const DEFAULT_BOARDS = [
  ['Anthropic', 'greenhouse', 'anthropic'],
  ['Databricks', 'greenhouse', 'databricks'],
  ['MongoDB', 'greenhouse', 'mongodb'],
  ['Snowflake', 'manual', 'https://careers.snowflake.com/us/en'],
  ['Elastic', 'greenhouse', 'elastic'],
  ['Confluent', 'ashby', 'confluent'],
  ['Nubank', 'ashby', 'nubank'],
  ['CI&T', 'lever', 'ciandt'],
  ['GitLab', 'greenhouse', 'gitlab'],
  ['Datadog', 'greenhouse', 'datadog']
].map(([company, ats, board]) => ({
  company, ats, board, enabled: true, default: true
}));

export function boardUrl(board) {
  const id = encodeURIComponent(String(board.board || '').trim());
  switch (board.ats) {
    case 'greenhouse': return `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    case 'ashby': return `https://api.ashbyhq.com/posting-api/job-board/${id}`;
    case 'lever': return `https://api.lever.co/v0/postings/${id}?mode=json`;
    case 'workable': return `https://apply.workable.com/api/v1/widget/accounts/${id}?details=true`;
    case 'smartrecruiters': return `https://api.smartrecruiters.com/v1/companies/${id}/postings?limit=100&offset=0`;
    case 'recruitee': return `https://${id}.recruitee.com/api/offers/`;
    case 'gupy': return `https://portal.api.gupy.io/api/v1/jobs?companyId=${id}&limit=100&offset=0`;
    default: return '';
  }
}

export function inspectBoardPayload(ats, data) {
  const envelopes = {
    greenhouse: ['jobs'],
    ashby: ['jobs'],
    lever: [],
    workable: ['jobs'],
    smartrecruiters: ['content'],
    recruitee: ['offers'],
    gupy: ['data']
  };
  if (!Object.hasOwn(envelopes, ats)) return { valid: false, count: 0, reason: 'Unsupported ATS' };
  const path = envelopes[ats];
  const rows = path.length ? data?.[path[0]] : data;
  if (!Array.isArray(rows)) return { valid: false, count: 0, reason: path.length ? `Expected an array at $. ${path[0]}`.replace('$ .', '$.') : 'Expected a JSON array' };
  const usable = rows.filter(job => {
    const title = job?.title || job?.text || job?.name;
    const url = job?.absolute_url || job?.jobUrl || job?.hostedUrl || job?.url || job?.shortlink || job?.careers_url;
    return Boolean(title && url);
  });
  return { valid: true, count: rows.length, usable: usable.length, reason: rows.length && !usable.length ? 'Rows returned, but no recognizable title + job URL pairs' : null };
}
