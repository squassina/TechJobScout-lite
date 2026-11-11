import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { words, hasTerm, safeHref } from '../src/core/text.js';
import { locationAllowed, isLikelyRelevant, scoreJob } from '../src/jobs/matching.js';
import { normalizeJobs, stripHtml } from '../src/ats/normalizers.js';
import { clusterFor, extractDemands, jobKey } from '../src/jobs/analysis.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('native ES module entrypoint',()=>{assert.match(html,/<script type="module" src="app.js"><\/script>/);assert.ok(readFileSync(new URL('../styles.css',import.meta.url),'utf8').length>1000);});
test('text helpers normalize accents and reject unsafe URLs',()=>{assert.equal(words('Tecnologia Ágil'),'tecnologia agil');assert.equal(hasTerm('data science','Senior Data Science Lead'),true);assert.equal(safeHref('javascript:alert(1)'),'#');});
test('empty location preferences mean unrestricted and exclusions win',()=>{assert.equal(locationAllowed('New York, US',{allowed_locations:[],excluded_locations:[]}),true);assert.equal(locationAllowed('New York, US',{allowed_locations:[],excluded_locations:['New York']}),false);assert.equal(locationAllowed('New York, US',{allowed_locations:['US'],excluded_locations:['New York']}),false);});
test('target roles and skills contribute to relevance and score',()=>{const p={target_roles:'Product Manager | CTO',skills:['cloud']},c={keywords:['technology'],excluded_keywords:[],allowed_locations:[],excluded_locations:[]},j={title:'Senior Product Manager',description:'Cloud platform strategy',location:'Remote'};assert.equal(isLikelyRelevant(j,c,p),true);assert.ok(scoreJob(j,c,p).components.some(x=>x.factor==='Target role alignment'));});
test('job description analysis requires explicit consent',()=>{assert.match(app,/async function analyzeJd/);assert.match(app,/Privacy consent: send your CV text/);assert.match(html,/id="analyzeJd"/);});
test('credentials are opt-in and ephemeral keys clear with session',()=>{assert.match(html,/<input type="checkbox" id="rememberKey">/);assert.doesNotMatch(html,/id="rememberKey" checked/);assert.match(app,/state\.sessionKeys=\{\}/);});
test('Lite link and broad seniority defaults',()=>{assert.match(html,/github\.com\/squassina\/TechJobScout-lite/);assert.doesNotMatch(html,/value="[^"]*junior[^"]*"/);assert.doesNotMatch(app,/excludedKeywords'\)\.value='[^']*junior/);});
test('all literal DOM references resolve',()=>{const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));const refs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);assert.deepEqual([...new Set(refs.filter(x=>!ids.has(x)&&x!=='jobToStar'&&x!=='jobBackToQuickView'))],[]);});

test('ATS normalizers preserve published/updated dates and strip markup',()=>{const jobs=normalizeJobs('greenhouse',{jobs:[{id:1,title:'Engineer',absolute_url:'https://example.com/job',content:'<p>Build &amp; ship</p>',updated_at:'2026-01-02'}]},{company:'Acme',board:'acme'});assert.equal(jobs[0].createdAt,'2026-01-02');assert.equal(jobs[0].description,'Build & ship');assert.equal(stripHtml('<b>Role</b>'),'Role');});
test('SmartRecruiters and Gupy pagination are not capped at the former 2,000 offset',()=>{assert.match(app,/offset<10000/);assert.match(app,/totalFound/);});
test('agent package uses the selected language for exported instructions and prompts',()=>{assert.match(app,/localizedReadme/);assert.match(app,/language==='pt-BR'/);assert.match(app,/prompts\['01-job-search\.md'\]/);});
test('ATS network requests have an abort timeout and bounded detail concurrency',()=>{assert.match(app,/new AbortController\(\)/);assert.match(app,/Math\.min\(5,selected\.length\)/);});

test('AI setup is workflow step zero and CV uploads refresh profile plus search criteria',()=>{assert.match(html,/data-tab="setup"/);assert.match(html,/id="panel-setup"/);assert.match(app,/refreshProfileFromCv/);assert.match(app,/search_preferences/);});
test('job cards offer quick view and descriptions are normalized before scoring',()=>{assert.match(app,/data-quick-view/);assert.match(app,/quickViewJob/);assert.match(app,/description:stripHtml/);});
test('individual export requires selecting specific files',()=>{assert.match(html,/id="individualFileList"/);assert.match(app,/downloadSelectedFiles/);assert.match(app,/data-export-file/);});
test('HTML descriptions preserve paragraph boundaries and decode non-breaking spaces',()=>{const result=stripHtml('<p>P-351</p> <p>This role&nbsp;requires <strong>experience</strong>.</p>');assert.equal(result,'P-351\nThis role requires experience.');});

test('LLM configuration is BYO-key with direct model discovery and optional advanced endpoints',()=>{const ui=readFileSync(new URL('../llm-ui.js',import.meta.url),'utf8');assert.match(html,/src="llm-ui.js"/);assert.match(ui,/\/v1\/models/);assert.match(ui,/v1beta\/models/);assert.match(ui,/TechJobScout does not provide or pay for LLM usage/);assert.match(ui,/ollama/);assert.match(ui,/LiteLLM Proxy/);assert.doesNotMatch(ui,/master key/i);});

test('model selection is a disabled dropdown until API key is entered and base URL is advanced-only',()=>{const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const ui=readFileSync(new URL('../llm-ui.js',import.meta.url),'utf8');assert.match(html,/<select id="model" disabled>/);assert.match(html,/<details class="advanced-connection">/);assert.match(ui,/addEventListener\('input'/);assert.match(ui,/setTimeout\(loadModels,700\)/);assert.match(ui,/populateModels\(names\)/);});

test('Gemini defaults use rolling aliases and filter restricted legacy 2.5/2.0 models',()=>{const ui=readFileSync(new URL('../llm-ui.js',import.meta.url),'utf8');assert.match(app,/gemini:\{model:'gemini-flash-latest'/);assert.match(ui,/gemini-flash-latest/);assert.match(ui,/gemini-flash-lite-latest/);assert.ok(ui.includes("filter(id=>!/^gemini-(?:2\\.0|2\\.5)-/"));});

test('provider defaults prefer rolling latest aliases where officially supported',()=>{assert.match(app,/openai:\{model:'chat-latest'/);assert.match(app,/gemini:\{model:'gemini-flash-latest'/);assert.match(app,/deepseek:\{model:'deepseek-flash'/);});


test('GitHub Pages artifact includes every browser entry module',()=>{const workflow=readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');assert.match(workflow,/cp index\.html styles\.css app\.js llm-ui\.js site\//);});

test('design system defines one dark surface palette for all primary UI surfaces',()=>{const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');for(const token of ['--page:','--surface:','--surface-inset:','--accent:','--text:','--border:'])assert.match(css,new RegExp(token));assert.match(css,/\.card, \.job-card, \.story-card\s*\{/);assert.doesNotMatch(css,/\.card\s*\{\s*background:\s*white/);});

test('LLM setup has a single explicit test-and-save action; setup is not duplicated',()=>{assert.match(html,/id="testProvider">Test &amp; save connection/);assert.doesNotMatch(html,/id="saveSettings"|Save LLM setup/);});

test('header does not duplicate the AI setup navigation action',()=>{assert.doesNotMatch(html,/id="settingsOpen"|LLM setup/);});

test('provider setup keyboard order follows provider, API key, save-key consent, model and advanced settings',()=>{const section=html.slice(html.indexOf('id="panel-setup"'),html.indexOf('id="panel-profile"'));const order=['id="provider"','id="apiKey"','id="rememberKey"','id="model"','class="advanced-connection"','id="baseUrl"','id="deleteKeys"','id="testProvider"'];let last=-1;for(const token of order){const index=section.indexOf(token);assert.ok(index>last,'Expected '+token+' after previous keyboard control');last=index;}assert.match(css,/\.setup-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);});

test('AI setup tab order and checkbox layout follow the visible form sequence',()=>{const setup=html.slice(html.indexOf('id="panel-setup"'),html.indexOf('id="panel-profile"'));const provider=setup.indexOf('id="provider"'),api=setup.indexOf('id="apiKey"'),remember=setup.indexOf('id="rememberKey"'),model=setup.indexOf('id="model"'),advanced=setup.indexOf('class="advanced-connection"');assert.ok(provider>=0&&provider<api&&api<remember&&remember<model&&model<advanced);assert.match(setup,/class="inline-check remember-key"/);assert.match(css,/#panel-setup \.setup-card > \.inline-check\.remember-key\s*\{[^}]*display:\s*flex/s);assert.match(css,/#panel-setup \.setup-card > \.inline-check\.remember-key input\[type="checkbox"\]\s*\{[^}]*width:\s*16px/s);});

test('job results render ten per page, sorted by descending Fit Score with pagination and filter reset',()=>{assert.match(html,/id="jobPagination"/);assert.doesNotMatch(html,/id="sortJobs"/);assert.match(app,/const JOBS_PER_PAGE=10/);assert.match(app,/jobs\.sort\(\(a,b\)=>Number\(b\.score\|\|0\)-Number\(a\.score\|\|0\)/);assert.match(app,/jobs\.slice\(startIndex,startIndex\+JOBS_PER_PAGE\)/);assert.match(app,/Page \$\{currentJobsPage\} of \$\{totalPages\}/);assert.match(app,/currentJobsPage=1;renderJobs\(\)/);assert.match(css,/\.job-pagination/);});

test('job review screens link to each other and Prepare STAR copies the selected job description into JD analysis',()=>{assert.match(app,/function prepareJobAnalysis\(key\)/);assert.match(app,/\$\('jdText'\)\.value=description/);assert.match(app,/id="quickPrepareStar"/);assert.match(app,/id="jobBackToQuickView"/);assert.match(app,/id="jobToStar"/);assert.match(html,/id="backToOpportunity"/);assert.match(app,/backToOpportunity/);});

test('STAR stories render as four clearly labeled S-T-A-R columns with responsive layout',()=>{assert.match(app,/const fields=\[\['situation','S','Situation'/);assert.match(app,/\['task','T','Task'/);assert.match(app,/\['action','A','Action'/);assert.match(app,/\['result','R','Result'/);assert.match(app,/story-fields star-columns/);assert.match(app,/data-story-field="\$\{key\}"/);assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/\.story-card \.story-fields\.star-columns \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);assert.match(css,/\.story-card \.story-fields\.star-columns \{ grid-template-columns:1fr; \}/);});

test('local agent package files can be previewed in-page without downloading',()=>{assert.match(html,/id="agentFileExplorer"/);assert.match(html,/data-preview-file="candidate-profile\.json"/);assert.match(html,/id="agentFilePreview"[^>]*readonly/);assert.match(html,/id="copyAgentPreview"/);assert.match(app,/function showAgentFile\(name\)/);assert.match(app,/files\[name\]/);assert.match(app,/function copyAgentPreview\(\)/);assert.match(app,/data-preview-file/);assert.match(css,/\.agent-preview textarea/);});

test('local agent file preview opens in a dedicated modal matching job details',()=>{assert.match(html,/<dialog id="agentFileDialog" class="agent-file-dialog">/);assert.match(html,/id="agentPreviewName"/);assert.match(html,/id="agentFilePreview"[^>]*readonly/);assert.match(app,/\$\('agentFileDialog'\)\.showModal\(\)/);assert.doesNotMatch(html,/class="agent-preview"/);assert.match(css,/\.agent-file-dialog/);});

test('local agent prompt files are grouped under one prompts folder with file-level preview links',()=>{const start=html.indexOf('<div class="agent-explorer" id="agentFileExplorer"'),end=html.indexOf('<div class="card agent-export-card">',start),explorer=html.slice(start,end);assert.ok(start>=0&&end>start);assert.equal((explorer.match(/<strong>prompts<\/strong>/g)||[]).length,1);for(const name of ['01-job-search.md','02-role-analysis.md','03-interview-star.md','04-application-plan.md'])assert.ok(explorer.includes('data-preview-file="prompts/'+name+'"'),'missing prompt '+name);assert.match(explorer,/class="agent-folder-files"/);assert.ok(css.includes(".agent-folder-files"));assert.ok(css.includes(".agent-file.agent-file-link"));});
test('prompt folder does not inherit generic file-list nesting arrows or indentation',()=>{assert.doesNotMatch(css,/\.file-list div\s*\{/);assert.doesNotMatch(css,/\.file-list div::before/);assert.match(css,/\.file-list > \.agent-file b/);assert.match(css,/\.agent-folder-files/);assert.match(html,/class="agent-folder"/);});

test('local agent package uses a compact developer workspace tree with typed file icons',()=>{const start=html.indexOf('<div class="agent-explorer" id="agentFileExplorer"'),end=html.indexOf('<div class="agent-explorer-status"',start),explorer=html.slice(start,end);assert.ok(start>=0&&end>start);assert.match(explorer,/EXPLORER/);assert.match(explorer,/TECHJOBSCOUT-LITE/);assert.match(explorer,/agent-file-icon markdown/);assert.match(explorer,/agent-file-icon json/);assert.match(explorer,/agent-folder-files/);assert.equal((explorer.match(/data-preview-file=/g)||[]).length,10);assert.match(html,/Workspace generated locally/);assert.match(css,/\.agent-explorer-toolbar/);assert.match(css,/\.agent-explorer \.agent-file\.active/);});

test('agent explorer maintains accessible selected tree items when opening a file',()=>{assert.match(html,/class="agent-tree-root" role="treeitem" aria-expanded="true"/);assert.match(html,/class="agent-folder-name" role="treeitem" aria-expanded="true"/);assert.match(app,/button\.setAttribute\('aria-selected',String\(active\)\)/);assert.doesNotMatch(app,/setAttribute\('aria-pressed'/);});

test('agent file previews wrap long lines instead of requiring horizontal scrolling',()=>{assert.match(css,/\.agent-file-dialog-body textarea\s*\{[^}]*white-space:\s*pre-wrap/s);assert.match(css,/\.agent-file-dialog-body textarea\s*\{[^}]*overflow-wrap:\s*anywhere/s);assert.match(css,/\.agent-file-dialog-body textarea\s*\{[^}]*overflow-x:\s*hidden/s);assert.doesNotMatch(css,/\.agent-file-dialog-body textarea\s*\{[^}]*white-space:\s*pre\s*;/s);});
test('all in-page dialogs close only when the backdrop is clicked',()=>{for(const id of ['boardDialog','jobDialog','agentFileDialog'])assert.match(html,new RegExp('<dialog id="'+id+'"'));assert.match(app,/document\.querySelectorAll\('dialog'\)\.forEach\(dialog=>dialog\.addEventListener\('click'/);assert.match(app,/if\(outside\)dialog\.close\(\)/);assert.match(app,/if\(event\.target!==dialog\)return/);});

test('session operations use generation guards and cancellation; search discards stale results',()=>{assert.match(app,/let sessionGeneration=0/);assert.match(app,/function beginSessionOperation\(\)/);assert.match(app,/function cancelSessionOperations\(\)/);assert.match(app,/function isSessionOperationCurrent\(operation\)/);assert.match(app,/async function fetchBoard\(b,signal\)/);assert.match(app,/fetchBoard\(b,signal\)/);assert.match(app,/if\(!isSessionOperationCurrent\(operation\)\)return/);assert.match(app,/externalSignal\?\.addEventListener\('abort'/);});

test('clearing the candidate profile also clears all profile-derived jobs and analyses',()=>{const clear=app.slice(app.indexOf('function clearProfile()'),app.indexOf('function setCv('));assert.match(clear,/cancelSessionOperations\(\)/);assert.match(clear,/state\.jobs=\[\]/);assert.match(clear,/state\.searchErrors=\[\]/);assert.match(clear,/state\.searched=false/);assert.match(clear,/\$\('exportJobs'\)\.disabled=true/);assert.match(clear,/\$\('jdAnalysis'\)\.innerHTML=''/);assert.match(clear,/renderJobs\(\)/);});

test('Gemini API keys are sent in x-goog-api-key headers, never query strings',()=>{const ui=readFileSync(new URL('../llm-ui.js',import.meta.url),'utf8');assert.match(ui,/url=base\+'\/v1beta\/models';headers\['x-goog-api-key'\]=key/);assert.match(app,/generateContent\x60,\{method:'POST',headers:\{'content-type':'application\/json','x-goog-api-key':key\}/);assert.doesNotMatch(ui,/v1beta\/models\?key=/);assert.doesNotMatch(app,/generateContent\?key=/);});

test('AI requests have a bounded timeout and support cancellation from session operations',()=>{assert.match(app,/const AI_REQUEST_TIMEOUT_MS=45000/);assert.match(app,/async function aiRequest\(system,user,\{signal\}=\{\}\)/);assert.match(app,/timedOut=true;controller\.abort\(\)/);assert.match(app,/signal\?\.addEventListener\('abort',abortFromCaller/);assert.match(app,/AI request timed out after/);assert.match(app,/signal:controller\.signal/);});
test('CV extraction, STAR preparation and JD analysis discard cancelled AI responses',()=>{for(const action of ['refreshProfileFromCv','prepareStars','analyzeJd']){const start=app.indexOf('async function '+action+'(');assert.ok(start>=0);const end=app.indexOf('\nasync function ',start+1);const body=app.slice(start,end<0?app.length:end);assert.match(body,/beginSessionOperation\(\)/);assert.match(body,/signal:operation.controller.signal/);assert.match(body,/isSessionOperationCurrent\(operation\)/);assert.match(body,/finishSessionOperation\(operation\)/);}});


test('SmartRecruiters detail enrichment evaluates descriptions independently of title and reports bounded analysis counts',()=>{const start=app.indexOf("if(b.ats==='smartrecruiters'&&$('includeDescriptions').checked");const end=app.indexOf('return raw;',start);const block=app.slice(start,end);assert.ok(block.includes('raw.filter(j=>!j.description).slice(0,200)'));assert.doesNotMatch(block,/isLikelyRelevant/);assert.ok(block.includes('Math.min(5,selected.length)'));assert.ok(block.includes('raw.detailStats={requested:selected.length,analyzed,failed,skipped:'));assert.match(app,/SmartRecruiters descriptions analyzed/);});


test('Fit Score breakdown sums exactly to the capped score, including high-overlap profiles',()=>{const c={keywords:['AI','cloud','data','strategy','architecture','leadership','transformation'],excluded_keywords:[],allowed_locations:[],excluded_locations:[]},p={target_roles:'Director | CTO | Architect',skills:['AI','cloud','data','strategy','architecture','leadership','transformation']},j={title:'Director of AI Cloud Data Strategy Architecture',description:'AI cloud data strategy architecture leadership transformation',location:'Remote',remote:true};const result=scoreJob(j,c,p);assert.ok(result.score>0&&result.score<=100);assert.ok(Math.abs(result.components.reduce((sum,item)=>sum+(item.points||0),0)-result.score*result.coverage/100)<0.11);assert.ok(result.components.every(item=>item.points===null||Number.isFinite(item.points)&&item.points>=0));});
test('Fit Score breakdown preserves its total when the score is below the cap',()=>{const result=scoreJob({title:'Engineer',description:'technology',location:'On-site'}, {keywords:['technology'],excluded_keywords:[],allowed_locations:[],excluded_locations:[]},{target_roles:'',skills:[]});assert.equal(result.components.reduce((sum,item)=>sum+item.points,0),result.score);});


test('ATS failures are shown per company with platform and escaped diagnostic message',()=>{assert.match(html,/id="boardErrors"[^>]*aria-live="polite"/);assert.match(app,/function renderBoardErrors\(\)/);assert.match(app,/Source diagnostics/);assert.match(app,/esc\(item\.company\)/);assert.match(app,/esc\(item\.ats\)/);assert.match(app,/esc\(item\.error\|\|'Unknown error'\)/);assert.match(app,/renderBoardErrors\(\)/);});
test('partial ATS failures remain visible while successful boards can still return jobs',()=>{assert.match(app,/state\.searchErrors\.push\(\{company:b\.company,ats:b\.ats,error:message\}\)/);assert.match(app,/const settled=await Promise\.all\(targets\.map/);assert.match(app,/renderBoardErrors\(\)/);});

test('evidence-based Fit Score has no base points and normalizes only evaluable criteria',()=>{
 const p={target_roles:'Solutions Architect',skills:['cloud','azure'],resume_text:'Senior Solutions Architect. Led cloud architecture, Azure migrations and enterprise transformation for financial services clients. MBA.'};
 const c={keywords:['cloud'],excluded_keywords:[],allowed_locations:[],excluded_locations:[]};
 const j={title:'Senior Solutions Architect',description:'Requirements: cloud architecture, Azure, leadership, financial services. MBA preferred.',location:'Remote',remote:true};
 const result=scoreJob(j,c,p);
 assert.ok(result.score>80&&result.score<=100);
 assert.equal(result.coverage,100);
 assert.equal(result.components.some(x=>x.factor==='Base'),false);
 assert.ok(Math.abs(result.components.reduce((sum,x)=>sum+(x.points||0),0)-result.score*result.coverage/100)<0.11);
});
test('unknown criteria are excluded from score denominator and reduce Assessment Coverage',()=>{
 const p={target_roles:'Data Engineer',skills:['python'],resume_text:'Data Engineer with Python and SQL experience.'};
 const c={keywords:[],excluded_keywords:[],allowed_locations:[],excluded_locations:[]};
 const result=scoreJob({title:'Data Engineer',description:'Python and SQL required.',location:''},c,p);
 assert.ok(result.coverage<100);
 assert.ok(result.components.some(x=>x.status==='unknown'));
 assert.equal(result.score,100);
});
test('missing candidate profile produces zero coverage and no assumed points',()=>{
 const c={keywords:[],excluded_keywords:[],allowed_locations:[],excluded_locations:[]};
 const result=scoreJob({title:'Senior Engineer',description:'Python, cloud and leadership required.'},c,{skills:[]});
 assert.equal(result.coverage,0);
 assert.equal(result.score,0);
 assert.ok(result.components.every(x=>x.status==='unknown'));
});
test('seniority compares documented candidate level with the role level',()=>{
 const c={keywords:[],excluded_keywords:[],allowed_locations:[],excluded_locations:[]};
 const senior=scoreJob({title:'Director of Engineering',description:'Leadership required.'},c,{resume_text:'Senior Software Engineer. Individual contributor.'});
 const aligned=scoreJob({title:'Senior Engineer',description:'Senior technical leadership.'},c,{resume_text:'Senior Software Engineer leading engineering teams.'});
 assert.equal(senior.components.find(x=>x.id==='seniority').status,'evaluated');
 assert.ok(senior.components.find(x=>x.id==='seniority').adherence<100);
 assert.ok(aligned.components.find(x=>x.id==='seniority').adherence>senior.components.find(x=>x.id==='seniority').adherence);
});
test('eligibility is independent from Fit Score and reports incompatible or unknown conditions',()=>{
 const c={keywords:[],excluded_keywords:[],allowed_locations:['Brazil'],excluded_locations:[]};
 const result=scoreJob({title:'Cloud Architect',description:'English required; work authorization required.',location:'New York, US'},c,{resume_text:'Cloud Architect in Brazil.'});
 assert.equal(result.eligibility.location.status,'not_met');
 assert.equal(result.eligibility.language.status,'unknown');
 assert.equal(result.eligibility.workAuthorization.status,'unknown');
 assert.equal(result.eligibility.modality.status,'unknown');
});
test('Fit Score components expose job and candidate evidence for traceability',()=>{
 const c={keywords:[],excluded_keywords:[],allowed_locations:[],excluded_locations:[]};
 const result=scoreJob({title:'Cloud Architect',description:'Cloud architecture and Azure required.'},c,{resume_text:'Cloud architect with Azure architecture experience.'});
 const skills=result.components.find(x=>x.id==='skills');
 assert.ok(skills.jobEvidence.includes('cloud'));
 assert.ok(skills.candidateEvidence.includes('cloud'));
});

test('location is reported as Eligibility instead of silently filtering out the job',()=>{
 assert.doesNotMatch(app,/if\(!locationAllowed\(j\.location,currentCriteria\(\)\)\)continue/);

});
test('remote modality is unknown unless candidate work-mode preferences are explicit',()=>{
 const c={keywords:[],excluded_keywords:[],allowed_locations:[],excluded_locations:[]};
 const job={title:'Cloud Architect',description:'Cloud architecture required.',location:'Remote',remote:true};
 const unknown=scoreJob(job,c,{resume_text:'Cloud Architect with cloud experience.'});
 const matched=scoreJob(job,c,{resume_text:'Cloud Architect with cloud experience.',work_preferences:['remote']});
 assert.equal(unknown.eligibility.modality.status,'unknown');
 assert.equal(matched.eligibility.modality.status,'met');
});


test('P2 README documents the evidence-based Fit Score, coverage and separate eligibility',()=>{const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');assert.match(readme,/evidence-based assessment/);assert.match(readme,/Assessment Coverage/);assert.match(readme,/Eligibility is reported separately from Fit Score/);assert.doesNotMatch(readme,/initial client-side score.*base points/i);});

test('P2 Local agent screen focuses on workspace review and export without global session controls',()=>{const panel=html.slice(html.indexOf('id="panel-agent"'),html.indexOf('<footer'));assert.match(panel,/Build your agent workspace/);assert.match(panel,/Workspace files/);assert.match(panel,/Export workspace/);assert.match(panel,/agent-export-summary/);assert.match(panel,/agent-privacy-note/);assert.doesNotMatch(panel,/id="clearSession"/);assert.doesNotMatch(panel,/agent-session-details/);for(const file of ['AGENTS.md','CLAUDE.md','candidate-profile.json','jobs.json','star-stories.json','README.md','prompts/01-job-search.md','prompts/02-role-analysis.md','prompts/03-interview-star.md','prompts/04-application-plan.md'])assert.ok(panel.includes('data-preview-file="'+file+'"'),'missing '+file);});

test('P2 Setup tab owns session and privacy controls while retaining the workflow navigation',()=>{assert.match(html,/<button class="tab active" data-tab="setup"><b>00<\/b> Setup<\/button>/);const setup=html.slice(html.indexOf('id="panel-setup"'),html.indexOf('id="panel-profile"'));assert.match(setup,/Configure your workspace/);assert.match(setup,/Session &amp; privacy/);assert.match(setup,/id="clearSession"/);assert.match(setup,/does not delete saved API keys/);assert.match(setup,/id="deleteKeys"/);assert.equal((html.match(/id="clearSession"/g)||[]).length,1);});

test('P2 Setup layout keeps the top bar in document flow and aligns privacy cards',()=>{assert.match(css,/\.topbar\s*\{\s*position:\s*relative;/);assert.ok(css.includes('.setup-card { width: 100%; max-width: none; margin-inline: 0; }'));assert.match(css,/\.setup-privacy-section\s*\{\s*width:\s*100%;/);});


test('P2 Local agent workspace files and export cards are sibling columns on desktop',()=>{const panel=html.slice(html.indexOf('id="panel-agent"'),html.indexOf('<footer'));const grid=panel.slice(panel.indexOf('<div class="agent-grid">'),panel.indexOf('</section>'));const explorer=grid.indexOf('<div class="agent-explorer"'),status=grid.indexOf('<div class="agent-explorer-status"'),exportCard=grid.indexOf('<div class="card agent-export-card">');assert.ok(explorer>=0&&status>explorer&&exportCard>status);assert.equal(grid.slice(status,exportCard).split('</div>').length-1,3,'close status, explorer and workspace card before export card');assert.ok(css.includes(".agent-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 17px; }"));assert.ok(css.includes(".profile-grid, .search-layout, .agent-grid { grid-template-columns: 1fr; }"));});


test('P2 all workflow forms share the same full-width control geometry and card identity',()=>{for(const token of ['--field-height: 42px;','--field-radius: var(--radius-sm);','--form-gap: 14px;','--form-card-padding: 22px;'])assert.ok(css.includes(token),'missing design token '+token);assert.ok(css.includes('.panel input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),'));assert.ok(css.includes('.panel select,'));assert.ok(css.includes('width: 100%;'));assert.ok(css.includes('min-height: var(--field-height);'));assert.ok(css.includes('border-radius: var(--field-radius);'));assert.ok(css.includes('.panel .card {'));assert.ok(css.includes('padding: var(--form-card-padding);'));});

test('P2 workflow grids use equal desktop columns and collapse consistently on mobile',()=>{assert.ok(css.includes('.profile-grid,\n.search-layout,\n.agent-grid {\n  grid-template-columns: repeat(2, minmax(0, 1fr));'));assert.ok(css.includes('@media (max-width: 760px) {\n  .profile-grid,\n  .search-layout,\n  .agent-grid {\n    grid-template-columns: minmax(0, 1fr);'));});


test('CV upload dropzone centers icon and all prompt lines horizontally and vertically',()=>{assert.ok(css.includes('.panel .dropzone {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;'));assert.ok(css.includes('.panel .dropzone > span,\n.panel .dropzone > strong {'));assert.ok(css.includes('text-align: center;'));});


test('job analysis module preserves career cluster classification',()=>{assert.equal(clusterFor('VP AI Transformation').name,'AI & GenAI Transformation');assert.equal(clusterFor('Cloud Platform Engineer').name,'Cloud, Data & Architecture');assert.equal(clusterFor('Product Engineering Manager').name,'Product & Engineering Leadership');assert.equal(clusterFor('Unclassified role').name,'General Technology');});

test('job demand extraction keeps unique meaningful bullets and caps output at five',()=>{const description='- Build cloud platforms for enterprise customers\n- Lead architecture and delivery across teams\n- Build cloud platforms for enterprise customers\n- Own product strategy and roadmap\n- Manage stakeholder relationships\n- Drive security and governance programs\n- Short\nThis is a paragraph, not a bullet.';const demands=extractDemands(description);assert.equal(demands.length,5);assert.equal(new Set(demands).size,5);assert.ok(demands.every(item=>item.length>12));});

test('job identity key uses ATS, company and stable posting identifier with URL fallback',()=>{assert.equal(jobKey({ats:'greenhouse',company:'Acme',id:'123',url:'https://example.com/123'}),'greenhouse:Acme:123');assert.equal(jobKey({ats:'lever',company:'Acme',url:'https://example.com/role'}),'lever:Acme:https://example.com/role');});


test('hero focuses on career value instead of repeated privacy disclaimers',()=>{assert.match(html,/YOUR CAREER, YOUR NEXT MOVE/);assert.match(html,/Explore technology opportunities, assess your fit and prepare for interviews/);assert.match(html,/From search to interview/);assert.doesNotMatch(html,/Private by design|Nothing is saved as a work session|Session-only workspace/);assert.doesNotMatch(html,/id="privacyNotice"|id="noticeDismiss"/);assert.match(html,/Session & privacy|Session data/);assert.match(html,/API keys are managed separately/);});


test('default ATS boards use verified public board slugs and avoid guessed Snowflake endpoint',()=>{const defaults=app.slice(app.indexOf('const DEFAULT_BOARDS'),app.indexOf('const PROVIDERS'));assert.match(defaults,/\['Confluent','ashby','confluent'\]/);assert.match(defaults,/\['Nubank','ashby','nubank'\]/);assert.match(defaults,/\['CI&T','lever','ciandt'\]/);assert.match(defaults,/\['GitLab','greenhouse','gitlab'\]/);assert.match(defaults,/\['Datadog','greenhouse','datadog'\]/);assert.match(defaults,/\['Snowflake','manual','https:\/\/careers\.snowflake\.com\/us\/en'\]/);assert.doesNotMatch(defaults,/\['Snowflake','greenhouse'/);assert.doesNotMatch(defaults,/\['Confluent','greenhouse'/);assert.doesNotMatch(defaults,/\['CI&T','greenhouse'/);assert.doesNotMatch(defaults,/\['GitLab','ashby'/);assert.doesNotMatch(defaults,/\['Datadog','lever'/);});

test('ATS search diagnostics distinguish invalid board slugs from general network and CORS failures',()=>{assert.match(app,/HTTP 404 — board not found\. Verify the ATS and public board slug\./);assert.match(app,/HTTP 403 — access denied by the source\./);assert.match(app,/invalid board slug, access restriction or network\/CORS issue/);});


test('job board rows expose a compact actions menu with edit and confirmed remove actions',()=>{assert.match(app,/class="board-actions"/);assert.match(app,/data-board-edit=/);assert.match(app,/Edit job board/);assert.match(app,/data-board-remove=/);assert.match(app,/confirm\('Remove '\+board\.company\+' from configured job boards\?'\)/);assert.match(css,/\.board-action-menu/);assert.match(css,/\.board-actions > summary/);});

test('job board editor dialog edits company, ATS and slug without changing enabled/default state',()=>{assert.match(html,/<dialog id="editBoardDialog"/);for(const id of ['editCompany','editAts','editBoardId','saveEditedBoard','cancelEditBoard'])assert.match(html,new RegExp('id="'+id+'"'));assert.match(app,/function editBoardDialog\(index\)/);assert.match(app,/function saveEditedBoard\(\)/);assert.match(app,/state\.boards\[index\]=\{\.\.\.state\.boards\[index\],company,ats,board,careersUrl:careersUrl\|\|undefined\}/);assert.match(app,/This board is already configured/);assert.match(app,/Gupy requires a numeric company ID/);assert.match(app,/full HTTPS careers or search URL/);});


test('each workflow step has consistent previous/next footer navigation',()=>{const expected=[['setup',null,'profile'],['profile','setup','search'],['search','profile','star'],['star','search','agent'],['agent','star',null]];for(const [step,previous,next] of expected){const start=html.indexOf('id="panel-'+step+'"'),end=html.indexOf('</section>',start),section=html.slice(start,end);assert.match(section,/class="step-navigation"/);if(previous)assert.match(section,new RegExp('data-step-goto="'+previous+'"'));else assert.match(section,/class="step-navigation-end"|<span><\/span>/);if(next)assert.match(section,new RegExp('data-step-goto="'+next+'"'));else assert.match(section,/Final step/);}assert.match(app,/data-step-goto/);assert.match(css,/\.step-navigation/);});


test('every configured board renders a careers link using custom URL or ATS public board URL',()=>{assert.match(app,/function boardCareersUrl\(board\)/);for(const host of ['job-boards.greenhouse.io','jobs.ashbyhq.com','jobs.lever.co','apply.workable.com','careers.smartrecruiters.com'])assert.ok(app.includes(host));assert.match(app,/class="board-careers-link"/);assert.match(app,/boardCareersUrl\(b\)/);assert.match(app,/rel="noopener noreferrer"/);});

test('users can add and edit optional HTTPS careers URLs for custom boards',()=>{for(const id of ['newCareersUrl','editCareersUrl'])assert.match(html,new RegExp('id="'+id+'"'));assert.match(app,/careersUrl:careersUrl\|\|undefined/);assert.match(app,/Careers page must be a full HTTPS URL/);});
