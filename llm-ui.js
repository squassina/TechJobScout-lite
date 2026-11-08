/* Model selection is populated only after the user supplies their own key.
 * TechJobScout does not provide or pay for LLM usage; advanced endpoints include LiteLLM Proxy.
 */
const $ = id => document.getElementById(id);
const defaults = {
 openai:{base:'https://api.openai.com',models:['gpt-4o-mini','gpt-4.1-mini','gpt-4.1','gpt-4o']},
 gemini:{base:'https://generativelanguage.googleapis.com',models:['gemini-2.5-flash','gemini-2.5-pro','gemini-2.0-flash']},
 anthropic:{base:'https://api.anthropic.com',models:['claude-sonnet-4-5','claude-haiku-4-5','claude-opus-4-1']},
 deepseek:{base:'https://api.deepseek.com',models:['deepseek-chat','deepseek-reasoner']},
 kimi:{base:'https://api.moonshot.cn',models:['kimi-k2.5','kimi-k2-turbo-preview']},
 ollama:{base:'http://localhost:11434',models:[]},
 'openai-compatible':{base:'http://localhost:4000',models:[]}
};
const provider=()=>$('provider').value;
const isLocal=()=>provider()==='ollama';
const isCustom=()=>provider()==='openai-compatible';
const usesAdvancedUrl=()=>isLocal()||isCustom();
let debounce;
let requestVersion=0;
function baseUrl(){return usesAdvancedUrl()?($('baseUrl').value.trim()||defaults[provider()].base):defaults[provider()].base;}
function status(message){$('settingsStatus').textContent=message;}
function lockModel(message){const select=$('model');select.replaceChildren();const o=document.createElement('option');o.value='';o.textContent='Enter API key to load available models';select.append(o);select.disabled=true;$('modelHelp').textContent=message;}
function showSuggested(message){
 const list=defaults[provider()].models,select=$('model');select.replaceChildren();
 select.disabled=!list.length;
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=list.length?'Choose a suggested model (live discovery unavailable)':'No models found — check your local endpoint';select.append(placeholder);
 list.forEach(id=>{const o=document.createElement('option');o.value=id;o.textContent=id;select.append(o);});
 $('modelHelp').textContent=message;
}
function populateModels(models){
 const select=$('model'),current=select.value,ids=[...new Set(models.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].sort();
 select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select an available model';select.append(placeholder);
 ids.forEach(id=>{const o=document.createElement('option');o.value=id;o.textContent=id;select.append(o);});
 select.disabled=!ids.length;if(current&&ids.includes(current))select.value=current;
 $('modelHelp').textContent=ids.length+' models available for this connection.';
}
async function loadModels(){
 const p=provider(),key=$('apiKey').value.trim(),base=baseUrl().replace(/\/$/,'');
 const version=++requestVersion,button=$('loadModels');
 if(!key&&!isLocal()&&!isCustom()){lockModel('Enter your API key to discover models available to your account.');status('Enter your API key to discover available models.');return;}
 button.disabled=true;button.textContent='Loading…';$('model').disabled=true;
 try{
  let url,headers={Accept:'application/json'};
  if(isLocal())url=base+'/api/tags';
  else if(p==='gemini')url=base+'/v1beta/models?key='+encodeURIComponent(key);
  else if(p==='anthropic'){url=base+'/v1/models';headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';}
  else{url=base+'/v1/models';if(key)headers.Authorization='Bearer '+key;}
  const response=await fetch(url,{headers});if(!response.ok)throw new Error('HTTP '+response.status+' — verify the key, provider and browser CORS access.');
  const data=await response.json();let names;
  if(isLocal())names=(data.models||[]).map(x=>x.name);
  else if(p==='gemini')names=(data.models||[]).filter(x=>(x.supportedGenerationMethods||[]).includes('generateContent')).map(x=>String(x.name||'').replace(/^models\//,''));
  else names=(data.data||data.models||[]).map(x=>x.id||x.name).filter(Boolean);
  if(version!==requestVersion)return;if(!names.length)throw new Error('The provider returned no available models.');
  populateModels(names);status(names.length+' models loaded. Select the model you want to use.');
 }catch(error){if(version!==requestVersion)return;showSuggested('Could not retrieve the live model list. Suggested models are shown; verify provider CORS and credentials.');status('Model discovery failed: '+error.message);}
 finally{if(version===requestVersion){button.disabled=false;button.textContent='Refresh models';}}
}
function updateProviderUi(){
 const p=provider(),details=document.querySelector('.advanced-connection');details.open=usesAdvancedUrl();$('baseUrl').value=defaults[p].base;
 showSuggested(usesAdvancedUrl()?'Configure the local endpoint, then load its models.':'Enter your API key; available models will load automatically.');
 if($('apiKey').value.trim()||isLocal()||isCustom())loadModels();
}
function initModelUi(){
 $('provider').addEventListener('change',()=>{updateProviderUi();});
 $('apiKey').addEventListener('input',()=>{
  clearTimeout(debounce);const key=$('apiKey').value.trim();$('loadModels').disabled=!key&&!usesAdvancedUrl();
  if(!key&&!usesAdvancedUrl()){lockModel('Enter your API key to load available models.');return;}
  $('model').disabled=true;$('modelHelp').textContent='Waiting for API key entry to finish…';debounce=setTimeout(loadModels,700);
 });
 $('loadModels').addEventListener('click',loadModels);
 $('baseUrl').addEventListener('change',()=>{if(usesAdvancedUrl())loadModels();});
 const key=$('apiKey').value.trim();if(key||isLocal()||isCustom())loadModels();else lockModel('Enter your API key to load available models.');
 $('loadModels').disabled=!key&&!usesAdvancedUrl();
}
initModelUi();
