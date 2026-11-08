/* User-managed LLM setup: no shared gateway, no application-funded inference. */
const $ = id => document.getElementById(id);
const defaults = {
  openai: { base: 'https://api.openai.com', models: ['gpt-4o-mini','gpt-4.1-mini','gpt-4.1','gpt-4o'] },
  gemini: { base: 'https://generativelanguage.googleapis.com', models: ['gemini-2.5-flash','gemini-2.5-pro','gemini-2.0-flash'] },
  anthropic: { base: 'https://api.anthropic.com', models: ['claude-sonnet-4-5','claude-haiku-4-5','claude-opus-4-1'] },
  deepseek: { base: 'https://api.deepseek.com', models: ['deepseek-chat','deepseek-reasoner'] },
  kimi: { base: 'https://api.moonshot.cn', models: ['kimi-k2.5','kimi-k2-turbo-preview'] },
  ollama: { base: 'http://localhost:11434', models: [] },
  'openai-compatible': { base: 'http://localhost:4000', models: [] }
};
const provider = () => $('provider')?.value || 'openai';
const advanced = () => ['ollama','openai-compatible'].includes(provider());
function setStatus(message) { const el=$('settingsStatus'); if(el) el.textContent=message; }
function selectedBase() { return advanced() ? ($('baseUrl').value.trim() || defaults[provider()].base) : defaults[provider()].base; }
function modelSelect() {
  const old=$('model'); if(!old || old.tagName==='SELECT') return old;
  const select=document.createElement('select'); select.id='model'; select.setAttribute('aria-label','Model');
  const option=document.createElement('option'); option.value=old.value || defaults[provider()].models[0]; option.textContent=option.value; select.append(option);
  old.replaceWith(select); return select;
}
function buildControls() {
  const old=$('model'); if(!old) return;
  const select=modelSelect();
  const label=select.closest('label'); if(label) label.append(Object.assign(document.createElement('small'),{className:'muted tiny',textContent:'Load the models available to your API key.'}));
  const load=document.createElement('button'); load.type='button'; load.id='loadModels'; load.className='btn btn-secondary'; load.textContent='Load available models';
  if(label) label.append(load);
  const baseLabel=$('baseUrl')?.closest('label');
  if(baseLabel) {
    const details=document.createElement('details'); details.className='advanced-connection';
    const summary=document.createElement('summary'); summary.textContent='Advanced connection settings';
    details.append(summary,baseLabel); label?.parentElement?.append(details);
    details.open=advanced();
  }
  const keyLabel=$('apiKey')?.closest('label');
  if(keyLabel) keyLabel.insertAdjacentHTML('afterend','<p class="muted tiny" id="keyOwnership">Use your own provider key. TechJobScout does not provide or pay for LLM usage.</p>');
  const note=document.createElement('p'); note.className='callout'; note.id='llmCostNote';
  note.textContent='Bring your own API key: provider usage is billed directly to your account. Without a key, local CV extraction, job search, matching and exports remain available; generative AI features require your own provider or local model.';
  $('rememberKey')?.closest('.inline-check')?.insertAdjacentElement('beforebegin',note);
  load.addEventListener('click',loadModels);
  $('provider')?.addEventListener('change',()=>{ const d=defaults[provider()]; if(advanced()) $('baseUrl').value=d.base; if(!advanced()) $('baseUrl').value=d.base; const det=document.querySelector('.advanced-connection'); if(det) det.open=advanced(); setStatus(advanced()?'Advanced provider selected. Configure its local or LiteLLM Proxy URL below.':'Enter your own API key, then load models available to that key.'); });
}
function putModels(models, preferred) {
  const select=$('model'); if(!select) return;
  const unique=[...new Set(models.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].sort();
  const keep=preferred || select.value || defaults[provider()].models[0] || '';
  select.replaceChildren();
  if(keep && !unique.includes(keep)){const opt=document.createElement('option');opt.value=keep;opt.textContent=keep+' (configured)';select.append(opt);}
  unique.forEach(name=>{const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt);});
  if(keep) select.value=keep;
}
async function loadModels() {
  const p=provider(), key=$('apiKey').value.trim(), base=selectedBase().replace(/\/$/,'');
  const button=$('loadModels'); button.disabled=true; button.textContent='Loading…';
  try {
    let url, headers={Accept:'application/json'}, names=[];
    if(p==='ollama') { url=base+'/api/tags'; }
    else if(p==='gemini') { url=base+'/v1beta/models'+(key?'?key='+encodeURIComponent(key):''); }
    else if(p==='anthropic') { url=base+'/v1/models'; headers['x-api-key']=key; headers['anthropic-version']='2023-06-01'; headers['anthropic-dangerous-direct-browser-access']='true'; }
    else { url=base+'/v1/models'; if(key) headers.Authorization='Bearer '+key; }
    if(!key && !['ollama'].includes(p)) throw new Error('Enter your own API key first.');
    const response=await fetch(url,{headers});
    if(!response.ok) throw new Error('Model discovery failed (HTTP '+response.status+'). Check the key, endpoint and provider CORS settings.');
    const data=await response.json();
    if(p==='ollama') names=(data.models||[]).map(x=>x.name);
    else if(p==='gemini') names=(data.models||[]).filter(x=>(x.supportedGenerationMethods||[]).includes('generateContent')).map(x=>String(x.name||'').replace(/^models\//,''));
    else names=(data.data||data.models||[]).map(x=>x.id||x.name).filter(Boolean);
    if(!names.length) throw new Error('The provider returned no models available to this key.');
    putModels(names); setStatus(names.length+' available model(s) loaded from '+p+'.');
  } catch(error) {
    putModels(defaults[p].models,$('model').value);
    setStatus(error.message+' You can still select a suggested model manually. If this is a browser CORS restriction, check the provider documentation; no proxy is provided by TechJobScout.');
  } finally {button.disabled=false;button.textContent='Load available models';}
}
buildControls();
