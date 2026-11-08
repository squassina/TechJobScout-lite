import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('static application entrypoints are present', () => {
  assert.match(html, /styles\.css/);
  assert.match(html, /app\.js/);
  assert.ok(css.length > 1000);
  assert.ok(js.length > 10000);
});

test('all directly referenced element IDs exist in the HTML', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const referenced = [...js.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]);
  const dynamicIds = new Set(['jobToStar']);
  const missing = [...new Set(referenced.filter(id => !ids.has(id) && !dynamicIds.has(id)))];
  assert.deepEqual(missing, []);
});

test('session persistence is limited to the explicit API-key namespace', () => {
  assert.match(js, /tjs_lite_api_keys/);
  assert.doesNotMatch(js, /indexedDB|document\.cookie|techjobscout_config|jobs_data\.js|\/api\/config|\/api\/scout/);
  assert.equal((js.match(/localStorage\./g) || []).length, 4);
});

test('seven ATS connectors and manual board support are present', () => {
  for (const ats of ['greenhouse','ashby','lever','workable','smartrecruiters','recruitee','gupy','manual']) {
    assert.ok(js.includes(`'${ats}'`) || html.includes(`value="${ats}"`), `missing ${ats}`);
  }
});

test('AI transfer is guarded by an explicit consent prompt', () => {
  assert.match(js, /Privacy consent: send your CV text/);
});
