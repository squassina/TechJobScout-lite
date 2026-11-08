import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { words, hasTerm, safeHref } from '../src/core/text.js';
import { locationAllowed, isLikelyRelevant, scoreJob } from '../src/jobs/matching.js';
import { normalizeJobs, stripHtml } from '../src/ats/normalizers.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('native ES module entrypoint',()=>{assert.match(html,/<script type="module" src="app.js"><\/script>/);assert.ok(readFileSync(new URL('../styles.css',import.meta.url),'utf8').length>1000);});
test('text helpers normalize accents and reject unsafe URLs',()=>{assert.equal(words('Tecnologia Ágil'),'tecnologia agil');assert.equal(hasTerm('data science','Senior Data Science Lead'),true);assert.equal(safeHref('javascript:alert(1)'),'#');});
test('empty location preferences mean unrestricted and exclusions win',()=>{assert.equal(locationAllowed('New York, US',{allowed_locations:[],excluded_locations:[]}),true);assert.equal(locationAllowed('New York, US',{allowed_locations:[],excluded_locations:['New York']}),false);assert.equal(locationAllowed('New York, US',{allowed_locations:['US'],excluded_locations:['New York']}),false);});
test('target roles and skills contribute to relevance and score',()=>{const p={target_roles:'Product Manager | CTO',skills:['cloud']},c={keywords:['technology'],excluded_keywords:[],allowed_locations:[],excluded_locations:[]},j={title:'Senior Product Manager',description:'Cloud platform strategy',location:'Remote'};assert.equal(isLikelyRelevant(j,c,p),true);assert.ok(scoreJob(j,c,p).components.some(x=>x.factor==='Target role alignment'));});
test('job description analysis requires explicit consent',()=>{assert.match(app,/async function analyzeJd/);assert.match(app,/Privacy consent: send your CV text/);assert.match(html,/id="analyzeJd"/);});
test('credentials are opt-in and ephemeral keys clear with session',()=>{assert.match(html,/<input type="checkbox" id="rememberKey">/);assert.doesNotMatch(html,/id="rememberKey" checked/);assert.match(app,/state\.sessionKeys=\{\}/);});
test('Lite link and broad seniority defaults',()=>{assert.match(html,/github\.com\/squassina\/TechJobScout-lite/);assert.doesNotMatch(html,/value="[^"]*junior[^"]*"/);assert.doesNotMatch(app,/excludedKeywords'\)\.value='[^']*junior/);});
test('all literal DOM references resolve',()=>{const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));const refs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);assert.deepEqual([...new Set(refs.filter(x=>!ids.has(x)&&x!=='jobToStar'))],[]);});

test('ATS normalizers preserve published/updated dates and strip markup',()=>{const jobs=normalizeJobs('greenhouse',{jobs:[{id:1,title:'Engineer',absolute_url:'https://example.com/job',content:'<p>Build &amp; ship</p>',updated_at:'2026-01-02'}]},{company:'Acme',board:'acme'});assert.equal(jobs[0].createdAt,'2026-01-02');assert.equal(jobs[0].description,'Build & ship');assert.equal(stripHtml('<b>Role</b>'),'Role');});
test('SmartRecruiters and Gupy pagination are not capped at the former 2,000 offset',()=>{assert.match(app,/offset<10000/);assert.match(app,/totalFound/);});
test('agent package uses the selected language for exported instructions and prompts',()=>{assert.match(app,/localizedReadme/);assert.match(app,/language==='pt-BR'/);assert.match(app,/prompts\['01-job-search\.md'\]/);});
test('ATS network requests have an abort timeout and bounded detail concurrency',()=>{assert.match(app,/new AbortController\(\)/);assert.match(app,/Math\.min\(5,selected\.length\)/);});

test('AI setup is workflow step zero and CV uploads refresh profile plus search criteria',()=>{assert.match(html,/data-tab="setup"/);assert.match(html,/id="panel-setup"/);assert.match(app,/refreshProfileFromCv/);assert.match(app,/search_preferences/);});
test('job cards offer quick view and descriptions are normalized before scoring',()=>{assert.match(app,/data-quick-view/);assert.match(app,/quickViewJob/);assert.match(app,/description:stripHtml/);});
test('individual export requires selecting specific files',()=>{assert.match(html,/id="individualFileList"/);assert.match(app,/downloadSelectedFiles/);assert.match(app,/data-export-file/);});
test('HTML descriptions preserve paragraph boundaries and decode non-breaking spaces',()=>{const result=stripHtml('<p>P-351</p> <p>This role&nbsp;requires <strong>experience</strong>.</p>');assert.equal(result,'P-351\nThis role requires experience.');});

test('LLM configuration is BYO-key with direct model discovery and optional advanced endpoints',()=>{const ui=readFileSync(new URL('../llm-ui.js',import.meta.url),'utf8');assert.match(html,/src="llm-ui.js"/);assert.match(ui,/\/v1\/models/);assert.match(ui,/v1beta\/models/);assert.match(ui,/TechJobScout does not provide or pay for LLM usage/);assert.match(ui,/ollama/);assert.match(ui,/LiteLLM Proxy/);assert.doesNotMatch(ui,/shared gateway|master key/i);});
