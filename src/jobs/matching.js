import { words, hasTerm } from '../core/text.js';
export function locationAllowed(location,c) {
 if(!location)return true;
 const s=words(location); if(c.excluded_locations.some(x=>hasTerm(x,s)))return false;
 if(!c.allowed_locations.length)return true;
 const allowed=c.allowed_locations.filter(x=>!['remote','anywhere','worldwide','global'].includes(words(x)));
 const remote=c.allowed_locations.some(x=>['remote','anywhere','worldwide','global'].includes(words(x)));
 return (remote&&['remote','worldwide','global'].some(x=>hasTerm(x,s)))||allowed.some(x=>hasTerm(x,s));
}
export function isLikelyRelevant(j,c,p) {
 const roles=String(p.target_roles||'').split(/[|,;\n]/).map(x=>x.trim()).filter(Boolean);
 return c.keywords.some(x=>hasTerm(x,j.title)||hasTerm(x,j.description))||(p.skills||[]).some(x=>hasTerm(x,j.title)||hasTerm(x,j.description))||roles.some(x=>hasTerm(x,j.title)||hasTerm(x,j.description));
}
export function scoreJob(j,c,p) {
 const title=words(j.title),desc=words(j.description),loc=words(j.location);
 if(c.excluded_keywords.some(x=>hasTerm(x,title)))return {score:0,components:[{factor:'Excluded title',points:0,detail:'Excluded keyword in title'}],matched:[]};
 let score=40;const components=[{factor:'Base',points:40,detail:'Starting score'}];
 const executive=['director','head','vp','vice president','chief','field cto','cto'],lead=['principal','lead','strategist','staff','manager','architect'];
 const ex=executive.find(x=>hasTerm(x,title)),sen=lead.find(x=>hasTerm(x,title));
 if(ex){score+=25;components.push({factor:'Seniority',points:25,detail:'Executive title ('+ex+')'});}else if(sen){score+=15;components.push({factor:'Seniority',points:15,detail:'Senior / lead title ('+sen+')'});}
 const roles=String(p.target_roles||'').split(/[|,;\n]/).map(x=>x.trim()).filter(Boolean),roleHits=roles.filter(x=>hasTerm(x,title));
 if(roleHits.length){score+=15;components.push({factor:'Target role alignment',points:15,detail:roleHits.join(', ')});}
 const titleHits=c.keywords.filter(x=>hasTerm(x,title)),descHits=c.keywords.filter(x=>!titleHits.includes(x)&&hasTerm(x,desc));
 if(titleHits.length){const points=Math.min(20,titleHits.length*10);score+=points;components.push({factor:'Title alignment',points,detail:titleHits.join(', ')});}
 if(descHits.length){const points=Math.min(15,descHits.length*3);score+=points;components.push({factor:'Description alignment',points,detail:descHits.slice(0,12).join(', ')});}
 const skills=(p.skills||[]).filter(x=>hasTerm(x,title+' '+desc));
 if(skills.length){const points=Math.min(10,skills.length*2);score+=points;components.push({factor:'Candidate skills',points,detail:skills.slice(0,10).join(', ')});}
 if(j.remote===true||['remote','brazil','brasil','latam','americas','global','worldwide'].some(x=>hasTerm(x,loc))){score+=15;components.push({factor:'Location',points:15,detail:'Remote or preferred region'});}else if(['united states','us'].some(x=>hasTerm(x,loc))){score+=10;components.push({factor:'Location',points:10,detail:'Potentially compatible region'});}
 return {score:Math.min(100,score),components,matched:[...titleHits,...descHits,...roleHits,...skills]};
}