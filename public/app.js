(()=>{'use strict';
const KEY='fitnessplus-v3';const OLD='fitnessplus-web-v2';const presets=[{id:'p0',name:'Ganzkörper Workout',type:'Kraft',min:30,kcal:230},{id:'p1',name:'Laufen',type:'Ausdauer',min:25,kcal:260},{id:'p2',name:'Yoga & Mobility',type:'Beweglichkeit',min:20,kcal:90},{id:'p3',name:'HIIT Power',type:'Intervall',min:15,kcal:180},{id:'p4',name:'Spaziergang',type:'Bewegung',min:30,kcal:110}];
const base={tab:'home',goalMinutes:45,goalCalories:400,goalSteps:8000,steps:{},history:[],workouts:[],plans:[],reminders:[],active:null,view:'',edit:null,calMonth:'',selectedDay:'',draftExercises:[],weekType:'minutes',weekOffset:0,theme:'light',water:{},waterGoal:2000,libraryFilter:'Alle',restUntil:0,trainingSets:{},librarySearch:'',profile:{nickname:'',focus:'allround',days:3},strengthExercise:'',strengthWeeks:8};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const $=x=>document.querySelector(x);const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;const dkey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');const day=()=>dkey();
let s={...base};try{let old=JSON.parse(localStorage.getItem(KEY)||'null');if(old){s={...s,...old,active:null,view:'',edit:null,draftExercises:[]}}else{old=JSON.parse(localStorage.getItem(OLD)||'null');if(old){s.goalMinutes=+old.goalMinutes||45;s.goalCalories=+old.goalCalories||400;s.workouts=(old.customWorkouts||[]).map((x,i)=>({id:String(x.id||uid()),name:x.name||'Eigenes Training',type:x.type||x.category||'Eigenes',min:Number(x.min)||30,kcal:Number(x.kcal)||180,exercises:[]}));s.history=(old.history||[]).map(x=>({id:uid(),workoutId:typeof x.id==='number'?`p${x.id}`:String(x.id||x.workoutId||''),name:typeof x.id==='number'?presets[x.id]?.name||'Workout':x.name||'Workout',day:x.day||day(),min:+x.min||0,kcal:+x.kcal||0,exercises:[]}));}}}catch(e){}
s.profile=s.profile&&typeof s.profile==='object'?{nickname:String(s.profile.nickname||''),focus:String(s.profile.focus||'allround'),days:Number(s.profile.days)||3}:{nickname:'',focus:'allround',days:3};s.history=Array.isArray(s.history)?s.history:[];s.workouts=Array.isArray(s.workouts)?s.workouts:[];s.plans=Array.isArray(s.plans)?s.plans:[];s.reminders=Array.isArray(s.reminders)?s.reminders:[];s.steps=s.steps&&typeof s.steps==='object'?s.steps:{};s.water=s.water&&typeof s.water==='object'?s.water:{};s.theme=s.theme==='dark'?'dark':'light';s.trainingSets=s.trainingSets&&typeof s.trainingSets==='object'?s.trainingSets:{};s.calMonth=new Date().toISOString().slice(0,7);s.selectedDay=day();
function save(){try{localStorage.setItem(KEY,JSON.stringify({...s,active:null,view:'',edit:null,draftExercises:[]}));window.FitnessPlusCloudSaved?.()}catch(e){toast('Speichern in diesem Browser nicht möglich.')}}function toast(v){let t=$('#toast');t.textContent=v;t.style.display='block';clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>t.style.display='none',2600)}function render(){document.documentElement.dataset.theme=s.theme;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===s.tab));$('#page').innerHTML=s.tab==='home'?home():s.tab==='train'?train():s.tab==='calendar'?calendar():s.tab==='progress'?progress():settings();timerTick()}
function hdr(sub,title){return `<div class="eyebrow">${sub}</div><h1 class="title">${title}</h1>`}function all(){return [...presets,...s.workouts]}function find(id){return all().find(x=>String(x.id)===String(id))}function totals(k=day()){return s.history.filter(x=>x.day===k).reduce((a,x)=>({min:a.min+(+x.min||0),kcal:a.kcal+(+x.kcal||0)}),{min:0,kcal:0})}function ring(value,max,r,color){let c=2*Math.PI*r;return `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#f0f0f4" stroke-width="15"/><circle cx="100" cy="100" r="${r}" fill="none" stroke="${color}" stroke-width="15" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-Math.min(value/Math.max(1,max),1))}"/>`}function workoutRow(x){let n=x.exercises?.length||0;return `<div class="item"><div class="symbol">${x.id.startsWith('p')?'✦':'▣'}</div><div class="grow"><div class="itemname">${safe(x.name)}</div><div class="sub">${safe(x.type||'Workout')} · ${x.min} Min ${n?'· '+n+' Übungen':''}</div></div><button class="btn" data-start="${safe(x.id)}">Start</button>${!x.id.startsWith('p')?`<button class="btn" data-edit="${safe(x.id)}">✎</button>`:''}</div>`}
function home(){let t=totals(),dt=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});return hdr(dt,'Dein Tag. Dein Tempo.')+`<div class="card"><div class="row"><b>Deine Aktivität</b><span class="sub">Heute</span></div><div class="rings"><svg viewBox="0 0 200 200">${ring(t.kcal,s.goalCalories,81,'#ff5673')}${ring(t.min,s.goalMinutes,60,'#8585fb')}</svg><div class="middle"><span class="huge">${t.min}</span><span class="sub">Trainingsminuten</span></div></div><div class="metrics"><div class="metric"><b style="color:#fa5975;font-size:12px">● Energie</b><div class="value">${t.kcal} <span class="sub">kcal</span></div><div class="sub">Ziel ${s.goalCalories}</div></div><div class="metric"><b style="color:#8585fb;font-size:12px">● Bewegung</b><div class="value">${t.min} <span class="sub">Min</span></div><div class="sub">Ziel ${s.goalMinutes}</div></div></div></div><div class="card"><div class="row"><div><b>Wasser heute</b><div class="sub">${Number(s.water[day()]||0)} / ${s.waterGoal} ml</div></div><button class="btn" data-action="waterAdd">+ 250 ml</button></div><div class="progressTrack"><div class="progressFill" style="width:${Math.min(100,100*Number(s.water[day()]||0)/s.waterGoal)}%;background:#55a9e8"></div></div><button class="btn" data-tab="settings" style="margin-top:10px">Trinkziel bearbeiten</button></div><div class="card"><div class="row"><div><b>Dein Trainingsplan</b><div class="sub">Erstelle deinen persönlichen Wochenplan</div></div><button class="btn" data-action="openPlanner">Plan erstellen</button></div></div><div class="row"><h2 class="section">Dein nächstes Training</h2><button class="btn" data-tab="train">Alle →</button></div><div class="card">${workoutRow(s.workouts[0]||presets[0])}</div><div class="card"><div class="row"><b>Geplante Trainings</b><button class="btn" data-tab="calendar">Kalender →</button></div><div class="sub" style="margin-top:8px">${s.plans.filter(p=>p.day>=day()).length} anstehende Termine</div></div>`}
function train(){if(s.active){let w=find(s.active.id)||s.active;return hdr('AKTIVES TRAINING',safe(w.name))+`<div class="card" style="text-align:center"><div class="sub">Deine Trainingszeit</div><div class="timer" id="timer">00:00</div><p class="sub">Der Timer stoppt automatisch, sobald deine Trainingszeit erreicht ist. Dann hörst du einen Signalton und deine Truhe erscheint direkt.</p></div>${(w.exercises||[]).length?`<div class="card"><b>Übungen & Sätze</b><p class="sub">Hake jeden Satz ab und passe deine Werte an.</p>${w.exercises.map((e,i)=>`<div class="exercise"><b class="small">${safe(e.name)}</b>${Array.from({length:Math.min(30,Math.max(1,Number(e.sets)||1))},(_,j)=>{let key=i+'-'+j;let entry=s.trainingSets[key]||{reps:e.reps,weight:e.weight,done:false};return `<div class="setrow"><button class="setcheck ${entry.done?'checked':''}" data-setdone="${key}">${entry.done?'✓':j+1}</button><label>Wdh.<input class="input slim" type="number" min="0" max="1000" data-setfield="${key}" data-field="reps" value="${entry.reps}"></label><label>kg<input class="input slim" type="number" min="0" max="1000" step="0.5" data-setfield="${key}" data-field="weight" value="${entry.weight}"></label></div>`}).join('')}</div>`).join('')}</div>`:''}<div class="card"><div class="row"><b>Pausentimer</b><b id="restClock">${s.restUntil>Date.now()?'läuft':'bereit'}</b></div><div class="chips"><button class="btn" data-rest="30">30 Sek.</button><button class="btn" data-rest="60">60 Sek.</button><button class="btn" data-rest="90">90 Sek.</button><button class="btn" data-rest="0">Stopp</button></div></div><div class="card" id="rewardTimeGate"><b>⏱ Truhen-Freigabe</b><p class="sub" id="rewardTimeText">${rewardTimeInfo().ready?'✓ Trainingszeit erreicht! Truhen sind jetzt freigeschaltet.':'Noch '+rewardTimeLabel(rewardTimeInfo().remaining)+' bis zu deinen Truhen. Du kannst vorher abschließen, bekommst dann aber keine Truhe.'}</p></div><button class="primary" data-action="finish">Training abschließen</button><button class="primary outline" data-action="cancel">Verwerfen</button>`}
if(s.view==='form')return form();if(s.view==='library')return libraryView();if(s.view==='planner')return plannerView();return hdr('DEINE WORKOUTS','Training gestalten.')+`<button class="primary" data-action="new">+ Eigenes Training erstellen</button><div class="row" style="margin-top:9px"><button class="btn" data-action="openLibrary">Übungsbibliothek</button><button class="btn" data-action="openPlanner">Wochenplan-Generator</button></div><h2 class="section">Meine Trainings</h2><div class="card">${s.workouts.length?s.workouts.map(workoutRow).join(''):'<div class="sub">Noch keine eigenen Trainings angelegt.</div>'}</div><h2 class="section">Vorgegebene Trainings</h2><div class="card">${presets.map(workoutRow).join('')}</div>`}
function form(){const x=s.edit?find(s.edit):null;let ex=s.draftExercises||[];return hdr('WORKOUT-EDITOR',x?'Training bearbeiten':'Eigenes Training erstellen')+`<form id="workoutForm" class="card"><label class="field">Name des Trainings</label><input required maxlength="70" class="input" name="name" placeholder="z. B. Oberkörper" value="${safe(x?.name||'')}"><label class="field">Trainingsart</label><select class="input" name="type">${['Kraft','Ausdauer','Beweglichkeit','Intervall','Sonstiges'].map(o=>`<option ${x?.type===o?'selected':''}>${o}</option>`).join('')}</select><div class="formgrid"><div><label class="field">Dauer (Min.)</label><input class="input" required name="min" type="number" min="1" max="600" value="${x?.min||30}"></div><div><label class="field">Kalorien-Schätzung</label><input class="input" required name="kcal" type="number" min="0" max="2500" value="${x?.kcal??200}"></div></div><h2 class="section">Übungen</h2><div id="exerciseList">${ex.map((e,i)=>`<div class="exercise"><div class="row"><b>${safe(e.name)}</b><button type="button" class="btn danger" data-exremove="${i}">Entfernen</button></div><div class="sub">${e.sets} Sätze × ${e.reps} Wdh. · ${e.weight} kg</div></div>`).join('')}</div><button class="btn" type="button" data-action="addExercise" style="width:100%;margin-top:12px">+ Übung hinzufügen</button><button type="submit" class="primary">Training speichern</button><button type="button" class="primary outline" data-action="formcancel">Abbrechen</button>${x?`<button type="button" class="primary outline danger" data-action="deleteWorkout">Training löschen</button>`:''}</form>`}
function calendar(){let [y,m]=s.calMonth.split('-').map(Number),first=new Date(y,m-1,1),offset=(first.getDay()+6)%7,days=new Date(y,m,0).getDate();let cells=Array.from({length:offset},()=>'<div></div>').concat(Array.from({length:days},(_,i)=>{let date=`${s.calMonth}-${String(i+1).padStart(2,'0')}`,done=s.history.some(h=>h.day===date),planned=s.plans.some(p=>p.day===date);return `<button class="day ${s.selectedDay===date?'selected':''} ${done?'done':''} ${planned?'planned':''}" data-date="${date}">${i+1}</button>`}));let picked=s.selectedDay;return hdr('TRAININGSPLANUNG','Dein Kalender.')+`<div class="card"><div class="row"><button class="btn" data-month="-1">‹</button><b>${first.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</b><button class="btn" data-month="1">›</button></div><div class="calendar" style="margin:18px 0 10px">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="sub" style="text-align:center">${x}</div>`).join('')}${cells.join('')}</div><div class="sub">Punkt = absolviertes Training · Rahmen = geplant</div></div><div class="card"><b>${new Date(picked+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</b><div style="margin-top:12px">${s.plans.filter(p=>p.day===picked).map(p=>`<div class="item"><div class="grow"><b class="small">${safe(find(p.workoutId)?.name||p.name||'Training')}</b><div class="sub">Geplant</div></div><button class="btn" data-removeplan="${safe(p.id)}">Löschen</button></div>`).join('')||'<div class="sub">Noch kein Training geplant.</div>'}</div><form id="planForm"><input type="hidden" name="day" value="${picked}"><label class="field">Training für diesen Tag einplanen</label><select class="input" name="workoutId">${all().map(w=>`<option value="${safe(w.id)}">${safe(w.name)}</option>`).join('')}</select><button type="submit" class="primary">+ Termin hinzufügen</button></form></div>`}
function weekDates(offset=0){let monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7+offset*7);return Array.from({length:7},(_,i)=>{let d=new Date(monday);d.setDate(monday.getDate()+i);return d})}
function weekStats(offset=0){let dates=weekDates(offset),from=dkey(dates[0]),to=dkey(dates[6]),items=s.history.filter(h=>h.day>=from&&h.day<=to).sort((a,b)=>String(b.day).localeCompare(String(a.day)));return {dates,from,to,items,min:items.reduce((a,h)=>a+(+h.min||0),0),kcal:items.reduce((a,h)=>a+(+h.kcal||0),0)}}
function progress(){if(s.view==='records')return bestleistungen();if(s.view==='strength')return strengthView();let off=Math.max(-104,Math.min(0,Number(s.weekOffset)||0));s.weekOffset=off;let w=weekStats(off),before=weekStats(off-1),past=w.dates.map(d=>({label:d.toLocaleDateString('de-DE',{weekday:'short'}).replace('.',''),...totals(dkey(d))}));let max=Math.max(30,...past.map(x=>s.weekType==='minutes'?x.min:x.kcal)),fmt=d=>d.toLocaleDateString('de-DE',{day:'numeric',month:'short'});let delta=w.min-before.min;return hdr('DEINE ENTWICKLUNG','Deine Trainingswochen.')+`<div class="card"><div class="row"><button class="btn" data-week="-1" aria-label="Vorherige Woche">‹ Vorherige</button><div style="text-align:center"><b>${off===0?'Diese Woche':off===-1?'Letzte Woche':'Trainingswoche'}</b><div class="sub">${fmt(w.dates[0])} – ${fmt(w.dates[6])}</div></div><button class="btn" data-week="1" ${off===0?'disabled':''} aria-label="Nächste Woche">Nächste ›</button></div><div class="chips"><button class="chip ${s.weekType==='minutes'?'active':''}" data-chart="minutes">Minuten</button><button class="chip ${s.weekType==='calories'?'active':''}" data-chart="calories">Kalorien</button></div><div class="barview">${past.map(x=>{let v=s.weekType==='minutes'?x.min:x.kcal;return `<div class="barcol"><div class="bartrack"><div class="bar" style="height:${v?Math.max(4,100*v/max):0}%"></div></div><div style="margin-top:7px">${x.label}</div><b>${v}</b></div>`}).join('')}</div></div><div class="card"><b>Wochenübersicht</b><div class="metrics" style="margin-top:12px"><div class="metric"><div class="sub">Workouts</div><div class="value">${w.items.length}</div></div><div class="metric"><div class="sub">Trainingsminuten</div><div class="value">${w.min}</div></div><div class="metric"><div class="sub">Kalorien (geschätzt)</div><div class="value">${w.kcal}</div></div><div class="metric"><div class="sub">Zur Vorwoche</div><div class="value" style="font-size:19px">${delta>0?'+':''}${delta} Min</div></div></div><p class="sub" style="margin-top:13px">Verglichen mit ${fmt(before.dates[0])} – ${fmt(before.dates[6])}.</p></div><button class="btn" data-action="showStrength">Kraftentwicklung →</button><button class="primary" data-action="showRecords">★ Meine Bestleistungen ansehen</button><div class="row"><h2 class="section">Trainings dieser Woche</h2>${off!==0?'<button class="btn" data-weekhome="1">Aktuelle Woche</button>':''}</div><div class="card">${w.items.length?w.items.map(h=>`<div class="item"><div class="symbol">✓</div><div class="grow"><b class="small">${safe(h.name||find(h.workoutId)?.name||'Training')}</b><div class="sub">${new Date(h.day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'long'})} · ${+h.kcal||0} kcal geschätzt</div>${(h.exercises||[]).map(e=>`<div class="sub">${safe(e.name)}: ${e.completedSets?.length??e.sets??0} Sätze${e.completedSets?.length?' · '+e.completedSets.map(t=>`${Number(t.reps)||0}×${Number(t.weight)||0} kg`).join(', '):' · '+(+e.reps||0)+' Wdh. · '+(+e.weight||0)+' kg'}</div>`).join('')}</div><b class="small">${+h.min||0} Min</b></div>`).join(''):'<div class="sub">Für diese Woche sind noch keine abgeschlossenen Trainings gespeichert. Mit „Vorherige“ kannst du frühere Wochen ansehen.</div>'}</div>`}
function records(){
 const map=new Map();
 for(const h of s.history){for(const e of (Array.isArray(h.exercises)?h.exercises:[])){
  const name=String(e.name||'').trim();if(!name)continue;
  const key=name.toLocaleLowerCase('de-DE');let item=map.get(key);
  if(!item){item={name,weight:-1,reps:-1,volume:-1,sets:0,last:'',sessions:0};map.set(key,item)}
  item.sessions++;
  if(h.day>item.last)item.last=h.day;
  const sets=Array.isArray(e.completedSets)?e.completedSets:[];
  for(const set of sets){
   if(!set||!set.done)continue;
   const weight=Number(set.weight),reps=Number(set.reps);
   if(!Number.isFinite(weight)||!Number.isFinite(reps)||weight<0||reps<0)continue;
   item.weight=Math.max(item.weight,weight);item.reps=Math.max(item.reps,reps);
   item.volume=Math.max(item.volume,weight*reps);item.sets++;
  }
 }}
 return [...map.values()].filter(x=>x.sets>0).sort((a,b)=>a.name.localeCompare(b.name,'de-DE'));
}
function bestleistungen(){const rs=records();return hdr('DEINE BESTLEISTUNGEN','Deine persönlichen Rekorde.')+`<button class="primary outline" data-action="showStrength">Kraftentwicklung über 8 Wochen →</button>`+
 `<div class="card"><b>Deine Stärke im Blick</b><p class="sub">Hier erscheinen die höchsten eingetragenen Gewichte und Wiederholungen deiner abgeschlossenen Trainings. Nur abgehakte Sätze zählen.</p></div>`+
 (rs.length?rs.map(x=>`<div class="card"><div class="row"><b>${safe(x.name)}</b><span class="sub">${x.sets} dokumentierte Sätze</span></div><div class="metrics" style="margin-top:12px"><div class="metric"><div class="sub">Höchstes Gewicht</div><div class="value">${x.weight.toLocaleString('de-DE')} <span class="sub">kg</span></div></div><div class="metric"><div class="sub">Meiste Wiederholungen</div><div class="value">${x.reps}</div></div></div><div class="sub" style="margin-top:12px">Zuletzt trainiert: ${safe(x.last)} · Höchstes Satzvolumen: ${x.volume.toLocaleString('de-DE')} kg</div></div>`).join(''):`<div class="card"><b>Noch keine Bestleistungen gespeichert</b><p class="sub">Starte ein Training mit Übungen, hake Sätze ab und schließe das Training ab. Deine Rekorde erscheinen dann hier.</p><button class="primary" data-tab="train">Workout starten</button></div>`)+
 `<button class="primary outline" data-action="backProgress">← Zur Wochenübersicht</button><p class="sub" style="margin-top:15px">Wiederholungsrekord und Gewichtsrekord können aus unterschiedlichen Sätzen stammen. Rekorde sind keine medizinische Bewertung.</p>`}
function strengthHistory(){
 const recordsByExercise=new Map();
 for(const h of s.history){const d=String(h.day||'');if(!/^\d{4}-\d\d-\d\d$/.test(d))continue;
  for(const e of (Array.isArray(h.exercises)?h.exercises:[])){
   const name=String(e.name||'').trim();if(!name)continue;
   const sets=Array.isArray(e.completedSets)?e.completedSets:[];
   for(const set of sets){if(!set.done)continue;
    const weight=Number(set.weight),reps=Number(set.reps);
    if(!Number.isFinite(weight)||!Number.isFinite(reps)||weight<0||reps<=0)continue;
    const key=name.toLocaleLowerCase('de-DE');
    if(!recordsByExercise.has(key))recordsByExercise.set(key,{name,entries:[]});
    recordsByExercise.get(key).entries.push({day:d,weight,reps,volume:weight*reps});
   }
  }
 }
 return [...recordsByExercise.values()].sort((a,b)=>a.name.localeCompare(b.name,'de-DE'));
}
function strengthView(){const exercises=strengthHistory();const chosen=exercises.find(e=>e.name.toLocaleLowerCase('de-DE')===s.strengthExercise)||exercises[0];
 let html=hdr('KRAFTENTWICKLUNG','Dein Fortschritt über Wochen.')+`<button class="btn" data-action="backProgress">← Zurück zum Verlauf</button><div class="card" style="margin-top:14px"><b>Persönliche Entwicklung</b><p class="sub">Höchstes erfolgreich abgeschlossenes Trainingsgewicht pro Woche. Nur dokumentierte, abgehakte Sätze werden berücksichtigt.</p></div>`;
 if(!chosen)return html+`<div class="card"><b>Noch keine Kraftdaten</b><p class="sub">Lege Übungen mit Gewichten an und hake beim Training deine Sätze ab. Danach siehst du hier deine Entwicklung.</p><button class="primary" data-tab="train">Training öffnen</button></div>`;
 const now=new Date();now.setHours(12,0,0,0);const monday=new Date(now);monday.setDate(now.getDate()-(now.getDay()+6)%7);
 const weeks=Array.from({length:8},(_,idx)=>{const start=new Date(monday);start.setDate(start.getDate()-(7-idx)*7);const end=new Date(start);end.setDate(end.getDate()+6);const startKey=dkey(start),endKey=dkey(end);const entries=chosen.entries.filter(x=>x.day>=startKey&&x.day<=endKey);return {label:start.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}),max:entries.length?Math.max(...entries.map(x=>x.weight)):null,sets:entries.length};});
 const values=weeks.filter(w=>w.max!==null);const maximum=Math.max(1,...values.map(w=>w.max));const first=values[0]?.max,last=values[values.length-1]?.max;const delta=first!==undefined&&last!==undefined?last-first:null;
 html+=`<div class="card"><label class="field">Übung auswählen</label><select class="input" id="strengthSelect">${exercises.map(x=>`<option value="${safe(x.name.toLocaleLowerCase('de-DE'))}" ${x===chosen?'selected':''}>${safe(x.name)}</option>`).join('')}</select><div class="metrics" style="margin-top:15px"><div class="metric"><div class="sub">Letzter Wochenrekord</div><div class="value">${last===undefined?'–':last.toLocaleString('de-DE')} <span class="sub">kg</span></div></div><div class="metric"><div class="sub">Veränderung*</div><div class="value">${delta===null?'–':(delta>0?'+':'')+delta.toLocaleString('de-DE')} <span class="sub">kg</span></div></div></div><div class="sub" style="margin-top:17px">Bestes Gewicht pro Woche · letzte 8 Wochen</div><div class="strength-chart" role="img" aria-label="Gewichtsrekorde über acht Wochen">${weeks.map(w=>`<div class="strength-col"><div class="strength-plot"><span class="strength-val">${w.max===null?'–':w.max+' kg'}</span><div class="strength-bar" style="height:${w.max===null?0:Math.max(7,w.max/maximum*100)}%"></div></div><span class="strength-label">${w.label}</span></div>`).join('')}</div><p class="sub">*Vergleich zwischen der frühesten und der jüngsten Woche mit aufgezeichneten Sätzen. Leere Wochen bleiben leer. Körpergewichtsübungen mit 0 kg werden separat als 0 kg dargestellt.</p></div>`;
 return html;
}
function profileView(){const p=s.profile;return hdr('DEIN PROFIL','FitnessPlus ist dein Begleiter.')+`<button class="btn" data-action="backSettings">← Zurück</button><form id="profileForm" class="card" style="margin-top:14px"><label class="field" for="nick">Dein Anzeigename (freiwillig)</label><input class="input" id="nick" name="nickname" maxlength="32" value="${safe(p.nickname)}" placeholder="z. B. Alex"><label class="field" for="focus">Dein Trainingsschwerpunkt</label><select class="input" id="focus" name="focus"><option value="allround" ${p.focus==='allround'?'selected':''}>Allgemeine Fitness</option><option value="strength" ${p.focus==='strength'?'selected':''}>Kraft aufbauen</option><option value="endurance" ${p.focus==='endurance'?'selected':''}>Ausdauer verbessern</option><option value="mobility" ${p.focus==='mobility'?'selected':''}>Beweglichkeit</option></select><label class="field" for="days">Gewünschte Trainingstage pro Woche</label><select class="input" id="days" name="days">${Array.from({length:7},(_,i)=>`<option value="${i+1}" ${p.days===i+1?'selected':''}>${i+1} ${i===0?'Tag':'Tage'}</option>`).join('')}</select><button class="primary" type="submit">Profil speichern</button></form><div class="card"><b>Deine Wochenziele</b><p class="sub">Diese Angaben bleiben nur auf deinem Gerät und helfen dir, deine Woche zu planen. Passe zusätzlich deine Tagesziele unter Einstellungen an.</p><div class="metrics"><div class="metric"><div class="sub">Trainingstage</div><div class="value">${p.days}</div></div><div class="metric"><div class="sub">Bewegungsziel / Tag</div><div class="value">${s.goalMinutes} <span class="sub">Min</span></div></div></div></div>`}
function settings(){if(s.view==='profile')return profileView();return hdr('DEINE APP','Ziele & Einstellungen.')+`<div class="card"><b>Dein persönliches Profil</b><p class="sub">${s.profile.nickname?'Hallo, '+safe(s.profile.nickname)+'!':'Lege deinen Trainingsfokus und deine Wochentage fest.'}</p><button class="btn" data-action="openProfile">Profil bearbeiten →</button></div>`+`<div class="card"><b>Tagesziele</b>${[['goalMinutes','Trainingsminuten',10,180,5],['goalCalories','Kalorien (geschätzt)',100,1200,50]].map(([key,label,min,max,step])=>`<label class="field" for="${key}">${label}: <span id="v-${key}">${s[key]}</span></label><input id="${key}" data-range="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}">`).join('')}</div><div class="card"><b>Darstellung</b><div class="chips"><button class="chip ${s.theme==='light'?'active':''}" data-theme="light">Hell</button><button class="chip ${s.theme==='dark'?'active':''}" data-theme="dark">Dunkel</button></div></div><div class="card"><b>Wasser-Tracker</b><p class="sub">Getrunken heute: ${Number(s.water[day()]||0)} ml</p><label class="field">Trinkziel: <span id="v-waterGoal">${s.waterGoal}</span> ml</label><input data-range="waterGoal" type="range" min="500" max="5000" step="250" value="${s.waterGoal}"><div class="chips"><button class="btn" data-action="waterAdd">+250 ml</button><button class="btn" data-action="waterMinus">−250 ml</button></div></div><div class="card"><b>Übungen & Planung</b><div class="chips"><button class="btn" data-action="openLibrary">Übungsbibliothek</button><button class="btn" data-action="openPlanner">Wochenplan erstellen</button></div></div><div class="card"><b>Datensicherung</b><p class="sub">Exportiere deine Übungen, Ziele, Termine und den Verlauf als JSON-Datei oder importiere eine frühere Sicherung.</p><button class="primary" data-action="export">Daten exportieren</button><button class="primary outline" data-action="import">Sicherung importieren</button></div><div class="note">Apple Watch / Apple Health: Eine direkte Kopplung ist in Safari auf dem iPhone technisch nicht möglich. Auch wenn du später eine Apple Watch kaufst, benötigt FitnessPlus dafür eine native iOS- und watchOS-App mit HealthKit-Freigabe. Deine Trainingsdaten kannst du weiterhin als JSON exportieren. Kalorienangaben sind Schätzwerte.</div>`}

const LIB=[['Kniebeugen','Beine','Stelle die Füße schulterbreit. Beuge kontrolliert Knie und Hüfte.'],['Ausfallschritte','Beine','Mach einen langen Schritt nach vorn, senke den Körper und drücke dich zurück.'],['Liegestütze','Brust','Spanne Rumpf und Gesäß an und senke den Körper kontrolliert.'],['Bankdrücken','Brust','Führe die Hantel kontrolliert zur Brust und drücke sie wieder hoch.'],['Rudern','Rücken','Ziehe die Ellbogen nach hinten und halte den Rücken neutral.'],['Klimmzüge','Rücken','Ziehe dich kontrolliert hoch, ohne zu schwingen.'],['Schulterdrücken','Schultern','Drücke die Gewichte stabil nach oben, ohne ins Hohlkreuz zu gehen.'],['Seitheben','Schultern','Hebe die Arme leicht gebeugt bis etwa Schulterhöhe.'],['Bizepscurls','Arme','Halte die Oberarme ruhig und beuge die Ellbogen.'],['Trizepsdrücken','Arme','Strecke die Ellbogen langsam gegen den Widerstand.'],['Plank','Core','Halte den Körper gerade und den Bauch aktiv.'],['Crunches','Core','Rolle den Oberkörper kontrolliert an, ohne am Kopf zu ziehen.'],['Radfahren','Ausdauer','Fahre in einem Tempo, bei dem du dich noch wohlfühlst.'],['Laufen','Ausdauer','Beginne locker und steigere die Dauer langsam.'],['Dehnen','Beweglichkeit','Bewege dich langsam und schmerzfrei in die Dehnung.']];
function libraryView(){let groups=['Alle','Beine','Brust','Rücken','Schultern','Arme','Core','Ausdauer','Beweglichkeit'];let q=(s.librarySearch||'').toLocaleLowerCase('de');return hdr('ÜBUNGEN ENTDECKEN','Übungsbibliothek.')+`<button class="btn" data-action="backTrain">← Zurück</button><input class="input" id="libSearch" placeholder="Übung suchen" value="${safe(s.librarySearch)}" style="margin:13px 0"><div class="chips">${groups.map(g=>`<button class="chip ${s.libraryFilter===g?'active':''}" data-libfilter="${g}">${g}</button>`).join('')}</div><div class="card">${LIB.filter(x=>(s.libraryFilter==='Alle'||s.libraryFilter===x[1])&&x[0].toLocaleLowerCase('de').includes(q)).map(x=>`<div class="exercise"><div class="row"><b>${safe(x[0])}</b><span class="sub">${x[1]}</span></div><p class="sub">${safe(x[2])}</p><button class="btn" data-useexercise="${safe(x[0])}">Als eigenes Training anlegen</button></div>`).join('')||'<p class="sub">Keine Übungen gefunden.</p>'}</div>`}
function plannerView(){return hdr('TRAINING NACH PLAN','Deine Trainingswoche.')+`<button class="btn" data-action="backTrain">← Zurück</button><div class="card" style="margin-top:15px"><p class="sub">FitnessPlus legt passende Workouts für die kommenden sieben Tage an. Du kannst Termine danach im Kalender verändern oder löschen.</p><form id="generatorForm"><label class="field">Dein Fitnessziel</label><select class="input" name="goal"><option value="strength">Kraft aufbauen</option><option value="endurance">Ausdauer verbessern</option><option value="balanced">Allgemein fit bleiben</option></select><label class="field">Trainingstage pro Woche</label><select class="input" name="count"><option>2</option><option selected>3</option><option>4</option><option>5</option></select><label class="field">Bevorzugte Dauer</label><select class="input" name="duration"><option value="20">20 Minuten</option><option value="30" selected>30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option></select><button class="primary" type="submit">7-Tage-Plan erstellen</button></form></div><div class="note">Der Wochenplan ist ein allgemeiner Vorschlag, keine medizinische oder individuelle Trainingsberatung.</div>`}
function generatePlan(f){let d=new FormData(f),goal=String(d.get('goal')),count=Number(d.get('count')),duration=Number(d.get('duration'));let ids=goal==='strength'?['p0','p2','p0','p2','p0']:goal==='endurance'?['p1','p4','p1','p4','p1']:['p0','p1','p2','p0','p4'];let offsets=count===2?[1,4]:count===3?[0,2,5]:count===4?[0,2,4,6]:[0,1,3,4,6];for(let i=0;i<count;i++){let date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+offsets[i]);let w=find(ids[i]);s.plans.push({id:uid(),workoutId:w.id,name:w.name,day:dkey(date),duration})}save();s.tab='calendar';s.view='';render();toast(count+' Trainings geplant')}

function timerTick(){let rest=$('#restClock');if(rest){let seconds=Math.ceil((s.restUntil-Date.now())/1000);rest.textContent=seconds>0?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'bereit'}const el=$('#timer');if(el&&s.active){let info=rewardTimeInfo();if(!s.active.goalReached&&info.actualElapsed>=info.required){handleGoalReached();info=rewardTimeInfo()}let sec=Math.max(0,Math.floor((info.elapsed)/1000));el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}}
function addExercise(){let name=prompt('Name der Übung (z. B. Kniebeugen)');if(!name||!name.trim())return;let sets=prompt('Anzahl der Sätze','3'),reps=prompt('Wiederholungen pro Satz','10'),weight=prompt('Gewicht in kg (0 ohne Gewicht)','0');if([sets,reps,weight].some(x=>x===null))return;let nums=[Number(sets),Number(reps),Number(weight)];if(!nums.every(Number.isFinite)||nums[0]<1||nums[0]>100||nums[1]<1||nums[1]>1000||nums[2]<0||nums[2]>1000){toast('Bitte gültige Zahlen eingeben.');return}s.draftExercises.push({id:uid(),name:name.trim().slice(0,80),sets:nums[0],reps:nums[1],weight:nums[2]});render()}
function openForm(id=null){s.tab='train';s.view='form';s.edit=id;s.draftExercises=(find(id)?.exercises||[]).map(x=>({...x}));render()}
function saveForm(f){let data=new FormData(f),name=String(data.get('name')||'').trim(),min=Number(data.get('min')),kcal=Number(data.get('kcal'));if(!name||!Number.isFinite(min)||min<1||min>600||!Number.isFinite(kcal)||kcal<0||kcal>2500){toast('Bitte Angaben prüfen.');return}let x={id:s.edit||uid(),name:name.slice(0,70),type:String(data.get('type')),min,kcal,exercises:s.draftExercises};if(s.edit){s.workouts=s.workouts.map(w=>String(w.id)===String(s.edit)?x:w)}else{s.workouts.push(x)}s.view='';s.edit=null;s.draftExercises=[];save();render();toast('Training gespeichert')}
function doExport(){const payload={app:'FitnessPlus',version:3,exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,goalSteps:s.goalSteps,steps:s.steps,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`FitnessPlus-Backup-${day()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

// FitnessPlus 4.0 Erweiterungen. Existing storage key remains unchanged for compatibility.
const guideData={
'Kniebeugen':['Beine','Füße schulterbreit, Hüfte nach hinten und unten führen; Knie folgen der Fußrichtung.'],
'Liegestütze':['Brust','Körper gerade halten, Ellenbogen kontrolliert beugen und wieder hochdrücken.'],
'Plank':['Core','Unterarme aufstützen, Bauch anspannen, Körper bildet eine Linie.'],
'Ausfallschritte':['Beine','Großen Schritt vorwärts machen; kontrolliert absenken, dann wieder aufrichten.'],
'Rudern':['Rücken','Rücken neutral halten und die Ellenbogen nach hinten ziehen.'],
'Bankdrücken':['Brust','Füße stabil aufstellen, Gewicht kontrolliert senken und hochdrücken.'],
'Kreuzheben':['Rücken','Hüfte nach hinten schieben, Rücken neutral halten und aus Hüfte und Beinen aufrichten.'],
'Schulterdrücken':['Schultern','Gewichte stabil über den Kopf führen, ohne ins Hohlkreuz zu fallen.'],
'Bizepscurls':['Arme','Oberarme ruhig am Körper halten und die Gewichte kontrolliert beugen.'],
'Crunches':['Core','Oberkörper leicht einrollen, nicht am Nacken ziehen.'],
'Joggen':['Ausdauer','In einem gleichmäßigen, passenden Tempo laufen.'],
'Dehnen':['Beweglichkeit','Langsam in die Dehnung gehen, ohne ruckartige Bewegung.']};
const groupSymbols={'Beine':'↟','Brust':'◇','Rücken':'⇧','Schultern':'△','Arme':'⌁','Core':'◎','Ausdauer':'↗','Beweglichkeit':'✧'};
const illustrated=(group)=>{let g=groupSymbols[group]||'✦';return `<div class="guidePic" aria-hidden="true"><span class="humanShape">◉<small>╱│╲<br>╱ ╲</small></span><span class="guideSymbol">${g}</span></div>`};
const oldLibrary4=libraryView;libraryView=function(){let html=oldLibrary4();return html.replace(/<div class="exercise"><div class="row"><b>/g,'<div class="exercise"><div class="row"><b>') .replace(/<p class="sub">([^<]*)<\/p><button class="btn" data-useexercise=/g,(all,description)=>`<div class="guideIllustration">${illustrated('Beweglichkeit')}<p class="sub">${description}</p></div><button class="btn" data-useexercise=`)};
const oldTrain4=train;train=function(){let html=oldTrain4();if(!s.active)return html;return html.replace(/<div class="chips"><button class="btn" data-rest="30">30 Sek.<\/button><button class="btn" data-rest="60">60 Sek.<\/button><button class="btn" data-rest="90">90 Sek.<\/button><button class="btn" data-rest="0">Stopp<\/button><\/div>/,`<div class="chips">${[30,45,60,90,120,180].map(n=>`<button class="btn" data-rest="${n}">${n} Sek.</button>`).join('')}<button class="btn" data-rest="0">Stopp</button></div><label class="field">Standardpause</label><select class="input" id="defaultRest">${[30,45,60,90,120,180].map(n=>`<option value="${n}" ${n===s.restDefault?'selected':''}>${n} Sekunden</option>`).join('')}</select><div class="sub">Countdown läuft auch beim Sperren anhand der Endzeit weiter. Vibration nur, wenn der Browser sie unterstützt.</div>`)};
const previousTick=timerTick;let restNotified=0;timerTick=function(){previousTick();if(s.restUntil&&Date.now()>=s.restUntil&&restNotified!==s.restUntil){restNotified=s.restUntil;const el=$('#restClock');if(el)el.textContent='Pause vorbei';if(s.restVibrate&&navigator.vibrate)navigator.vibrate([150,80,150])}};
const oldSave4=save;save=function(){oldSave4()};
const prevExport4=doExport;doExport=function(){const payload={app:'FitnessPlus',version:4,exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,challenges:s.challenges,homeWidgets:s.homeWidgets,restDefault:s.restDefault}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};

$('#importFile').addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{let p=JSON.parse(await file.text());if(p.app!=='FitnessPlus'||!p.data||!Array.isArray(p.data.workouts)||!Array.isArray(p.data.history))throw Error('Format');if(!confirm('Aktuelle Daten durch diese Sicherung ersetzen?'))return;let x=p.data;s={...s,goalMinutes:Number(x.goalMinutes)||45,goalCalories:Number(x.goalCalories)||400,goalSteps:Number(x.goalSteps)||8000,steps:x.steps&&typeof x.steps==='object'?x.steps:{},workouts:x.workouts,history:x.history,plans:Array.isArray(x.plans)?x.plans:[],reminders:Array.isArray(x.reminders)?x.reminders:[],water:x.water&&typeof x.water==='object'?x.water:{},waterGoal:Number(x.waterGoal)||2000,theme:x.theme==='dark'?'dark':'light',profile:x.profile&&typeof x.profile==='object'?{nickname:String(x.profile.nickname||'').slice(0,32),focus:String(x.profile.focus||'allround'),days:Math.min(7,Math.max(1,Number(x.profile.days)||3))}:{nickname:'',focus:'allround',days:3},tab:'home',view:'',active:null};s.challenges=Array.isArray(x.challenges)?x.challenges:[];s.homeWidgets=Array.isArray(x.homeWidgets)?x.homeWidgets:['activity','water','next','calendar','achievements','challenges'];s.restDefault=Number(x.restDefault)||60;save();render();toast('Daten importiert')}catch(err){toast('Diese Datei ist keine gültige FitnessPlus-Sicherung.')}finally{e.target.value=''}});
document.addEventListener('change',e=>{if(e.target.id==='strengthSelect'){s.strengthExercise=e.target.value;render();return}if(e.target.id==='libSearch')render()});document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='profileForm'){const fd=new FormData(e.target);const nickname=String(fd.get('nickname')||'').trim().slice(0,32);const focus=String(fd.get('focus')||'allround');const days=Number(fd.get('days'));s.profile={nickname,focus:['allround','strength','endurance','mobility'].includes(focus)?focus:'allround',days:Number.isInteger(days)&&days>=1&&days<=7?days:3};save();s.view='';render();toast('Profil gespeichert');return}if(e.target.id==='generatorForm'){generatePlan(e.target);return}if(e.target.id==='workoutForm')saveForm(e.target);if(e.target.id==='planForm'){let fd=new FormData(e.target),w=find(fd.get('workoutId'));if(w){s.plans.push({id:uid(),workoutId:w.id,name:w.name,day:String(fd.get('day'))});save();render();toast('Training eingeplant')}}if(e.target.id==='reminderForm'){let fd=new FormData(e.target);s.reminders.push({id:uid(),date:String(fd.get('date')),time:String(fd.get('time')),shown:false});save();render();toast('Erinnerung gespeichert')}});
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.theme){s.theme=b.dataset.theme;save();render();return}if(b.dataset.libfilter){s.libraryFilter=b.dataset.libfilter;render();return}if(b.dataset.useexercise){s.view='form';s.edit=null;s.tab='train';s.draftExercises=[{id:uid(),name:b.dataset.useexercise,sets:3,reps:10,weight:0}];render();return}if(b.dataset.rest!==undefined){s.restUntil=Date.now()+Number(b.dataset.rest)*1000;timerTick();return}if(b.dataset.setdone){let key=b.dataset.setdone;let [i,j]=key.split('-').map(Number);let w=find(s.active?.id);let ex=w?.exercises?.[i];if(ex){let x=s.trainingSets[key]||{reps:ex.reps,weight:ex.weight,done:false};x.done=!x.done;s.trainingSets[key]=x;render()}return}if(b.dataset.tab){s.tab=b.dataset.tab;s.view='';render();return}if(b.dataset.action==='new'){openForm();return}if(b.dataset.edit){openForm(b.dataset.edit);return}if(b.dataset.exremove!==undefined){s.draftExercises.splice(Number(b.dataset.exremove),1);render();return}if(b.dataset.start){let w=find(b.dataset.start);if(w){window.FP76Start?.();s.active={id:w.id,started:Date.now(),done:[],goalReached:false,stoppedAt:0};s.trainingSets={};s.restUntil=0;s.tab='train';s.view='';render()}return}if(b.dataset.done!==undefined&&s.active){let i=Number(b.dataset.done);s.active.done=s.active.done||[];s.active.done=s.active.done.includes(i)?s.active.done.filter(n=>n!==i):[...s.active.done,i];render();return}if(b.dataset.chart){s.weekType=b.dataset.chart;render();return}if(b.dataset.week){s.weekOffset=Math.max(-104,Math.min(0,(Number(s.weekOffset)||0)+Number(b.dataset.week)));render();return}if(b.dataset.weekhome){s.weekOffset=0;render();return}if(b.dataset.date){s.selectedDay=b.dataset.date;render();return}if(b.dataset.month){let [y,m]=s.calMonth.split('-').map(Number);let d=new Date(y,m-1+Number(b.dataset.month),1);s.calMonth=dkey(d).slice(0,7);s.selectedDay=dkey(d);render();return}if(b.dataset.removeplan){s.plans=s.plans.filter(p=>String(p.id)!==b.dataset.removeplan);save();render();return}if(b.dataset.removereminder){s.reminders=s.reminders.filter(x=>String(x.id)!==b.dataset.removereminder);save();render();return}switch(b.dataset.action){case 'showStrength':s.tab='progress';s.view='strength';render();break;case 'openProfile':s.tab='settings';s.view='profile';render();break;case 'backSettings':s.view='';render();break;case 'showRecords':s.tab='progress';s.view='records';render();break;case 'backProgress':s.view='';render();break;case 'openLibrary':s.tab='train';s.view='library';render();break;case 'openPlanner':s.tab='train';s.view='planner';render();break;case 'backTrain':s.tab='train';s.view='';render();break;case 'waterAdd':s.water[day()]=Math.min(20000,Number(s.water[day()]||0)+250);save();render();break;case 'waterMinus':s.water[day()]=Math.max(0,Number(s.water[day()]||0)-250);save();render();break;case 'addExercise':addExercise();break;case 'formcancel':s.view='';render();break;case 'deleteWorkout':if(confirm('Eigenes Training endgültig löschen?')){s.workouts=s.workouts.filter(w=>String(w.id)!==String(s.edit));s.view='';s.edit=null;save();render()}break;case 'cancel':if(confirm('Training verwerfen?')){s.active=null;render()}break;case 'finish':if(s.active){let w=find(s.active.id);let min=Math.max(1,Math.round((Date.now()-s.active.started)/60000));let kcal=Math.round((w?.kcal||0)*min/Math.max(1,w?.min||30));s.history.push({id:uid(),workoutId:s.active.id,name:w?.name||'Training',day:day(),min,kcal,exercises:(w?.exercises||[]).map((x,i)=>({...x,completedSets:Array.from({length:Number(x.sets)||0},(_,j)=>s.trainingSets[i+'-'+j]||{reps:x.reps,weight:x.weight,done:false}).filter(v=>v.done)}))});s.active=null;s.tab='progress';save();render();toast('Training gespeichert')}break;case 'export':doExport();break;case 'import':$('#importFile').click();break;}});
document.addEventListener('input',e=>{if(e.target.id==='libSearch'){s.librarySearch=e.target.value;return}if(e.target.dataset.setfield){let key=e.target.dataset.setfield;let [i,j]=key.split('-').map(Number);let ex=find(s.active?.id)?.exercises?.[i];if(ex){let entry=s.trainingSets[key]||{reps:ex.reps,weight:ex.weight,done:false};let v=Number(e.target.value);if(Number.isFinite(v)&&v>=0&&v<=1000)entry[e.target.dataset.field]=v;s.trainingSets[key]=entry}return}let k=e.target.dataset.range;if(k){s[k]=Number(e.target.value);let el=$(`#v-${k}`);if(el)el.textContent=s[k];save()}});

// FitnessPlus 4.1: virtueller Diamantboxen-Shop ohne reale Käufe.
s.diamonds=Math.max(0,Number(s.diamonds)||0);
s.rewardBoxes=Array.isArray(s.rewardBoxes)?s.rewardBoxes:[];
s.rewardClaims=s.rewardClaims&&typeof s.rewardClaims==='object'?s.rewardClaims:{};
s.rewardHistory=Array.isArray(s.rewardHistory)?s.rewardHistory:[];
// Rewards become eligible only after the workout's planned duration has elapsed.
function rewardTimeInfo(){
 if(!s.active)return {ready:false,remaining:0,required:0,elapsed:0,actualElapsed:0};
 const w=find(s.active.id)||s.active;
 const required=Math.max(1,Number(w.min)||30)*60000;
 const started=Number(s.active.started)||Date.now();
 const stopAt=Number(s.active.stoppedAt)||0;
 const actualElapsed=Math.max(0,(stopAt||Date.now())-started);
 const ready=!!s.active.goalReached||actualElapsed>=required;
 const elapsed=ready?required:actualElapsed;
 return {ready,remaining:Math.max(0,required-actualElapsed),required,elapsed,actualElapsed};
}
function rewardTimeLabel(ms){const n=Math.ceil(ms/60000);return n+' '+(n===1?'Minute':'Minuten')}
let rewardAudioCtx=null;
function playGoalAlarm(){
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(AudioCtx){
   rewardAudioCtx=rewardAudioCtx||new AudioCtx();
   if(rewardAudioCtx.state==='suspended')rewardAudioCtx.resume();
   const now=rewardAudioCtx.currentTime;
   [880,660,990].forEach((freq,i)=>{
    const osc=rewardAudioCtx.createOscillator();
    const gain=rewardAudioCtx.createGain();
    osc.type='sine';osc.frequency.value=freq;
    gain.gain.setValueAtTime(0.0001,now+i*0.24);
    gain.gain.exponentialRampToValueAtTime(0.18,now+i*0.24+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+i*0.24+0.20);
    osc.connect(gain).connect(rewardAudioCtx.destination);
    osc.start(now+i*0.24);osc.stop(now+i*0.24+0.22);
   });
  }
 }catch(_e){}
 try{if(navigator.vibrate)navigator.vibrate([220,120,220,120,320])}catch(_e){}
}
function handleGoalReached(){
 if(!s.active||s.active.goalReached)return;
 const current=s.active;
 const w=find(current.id)||current;
 const info=rewardTimeInfo();
 current.goalReached=true;
 current.stoppedAt=(Number(current.started)||Date.now())+info.required;
 const claim=String(current.started||'training')+':goal';
 let box=null;
 if(!window.FP76Online&&!s.rewardClaims[claim]){
  s.rewardClaims[claim]=true;
  box={id:uid(),name:(w?.name||'Training')+' Zeittruhe'};
  s.rewardBoxes.push(box);
 }
 save();render();playGoalAlarm();
 if(box)showEarnedBox(box);
 else toast('Trainingszeit geschafft!');
}
function rewardSummary(){return `<div class="card shopEntryCard"><div class="row"><div class="grow"><b>💎 Diamanten Store</b><div class="sub">Level-Booster kaufen und Freunde beschenken.</div></div><button class="btn" data-action="storeOpen">Zum Shop →</button></div></div>`}
const standardHome41=home;home=function(){return standardHome41()+rewardSummary()};
const standardTrain41=train;train=function(){return standardTrain41()+(s.active?`<div class="card"><div class="row"><b>🎁 Übungsbelohnungen</b><span class="sub">${s.rewardBoxes.length} Boxen bereit</span></div><p class="sub">Hake alle Sätze einer Übung ab. Für jede vollständig abgeschlossene Übung gibt es eine Box.</p><button class="btn" data-action="rewardScreen">Boxen öffnen</button></div>`:'')};
function rewardView(){return hdr('DEINE BELOHNUNGEN','Diamantboxen.')+`<button class="btn" data-action="rewardsBack">← Zurück</button><div class="card rewardHero"><div style="font-size:38px">💎</div><div class="huge">${s.diamonds} Diamanten</div><p class="sub">Virtuelle Sammelpunkte, kein echtes Geld und keine kostenpflichtigen Käufe.</p></div>`+(s.rewardBoxes.length?`<div class="card"><h2 class="section" style="margin:0 0 12px">Deine ungeöffneten Boxen</h2>${s.rewardBoxes.map((b,i)=>`<div class="item"><div class="symbol">🎁</div><div class="grow"><b>${safe(b.name)}</b><div class="sub">Übung abgeschlossen</div></div><button class="btn" data-openbox="${i}">Öffnen</button></div>`).join('')}</div>`:`<div class="card"><b>Im Moment keine Boxen</b><p class="sub">Starte ein Training mit Übungen und hake alle Sätze einer Übung ab.</p><button class="btn" data-action="rewardsTraining">Training ansehen</button></div>`)+(s.rewardHistory.length?`<div class="card"><b>Zuletzt gesammelt</b>${s.rewardHistory.slice(-10).reverse().map(x=>`<div class="item"><div class="grow"><b>${safe(x.name)}</b><div class="sub">${safe(x.date)}</div></div><b>+${x.amount} 💎</b></div>`).join('')}</div>`:'')}

// V4.4: Auto reward animation on the last completed set. No reward button required.
let rewardModal=null;
let rewardAnimationTimer=null;
let rewardDismissTimer=null;
function rewardModalRender(){
 const overlay=$('#fxOverlay'); if(!overlay)return;
 if(!rewardModal){overlay.classList.remove('show');overlay.innerHTML='';return}
 const m=rewardModal;
 if(m.mode==='earned'){
   overlay.innerHTML=`<div class="fxCard fullReward chestScreen" role="dialog" aria-modal="true" aria-label="Belohnungstruhe"><div class="fxTag">TRAINING GESCHAFFT!</div><h2>Eine Truhe für dich!</h2><p class="fxSub">${safe(m.name)}</p><button type="button" class="chestTap" data-chestopen="${safe(String(m.id))}" aria-label="Truhe öffnen"><div class="chestArt" aria-hidden="true"><div class="glow"></div><div class="lid"></div><div class="base"></div><div class="band left"></div><div class="band right"></div><div class="strap"></div><div class="lock"><span>★</span></div><div class="bolt b1"></div><div class="bolt b2"></div><div class="bolt b3"></div><div class="bolt b4"></div><div class="shine s1"></div><div class="shine s2"></div><div class="shine s3"></div></div><span>ANTIPPEN ZUM ÖFFNEN</span></button><p class="fxSub">Welche Seltenheit ist drin?</p></div>`;
 }else{
   const rarity=safe(m.rarity||'Episch');
   overlay.innerHTML=`<div class="fxCard fullReward chestResult rarity${rarity}" role="dialog" aria-modal="true" aria-label="Truhenbelohnung"><div class="fxTag">TRUHE GEÖFFNET!</div><div class="rarityText">${rarity.toUpperCase()}!</div><div class="fxEmojiWrap fxBurst"><span class="gem g1" style="--tx:-105px;--ty:-75px">💎</span><span class="gem g2" style="--tx:110px;--ty:-65px">💎</span><span class="gem g3" style="--tx:-90px;--ty:82px">💎</span><span class="gem g4" style="--tx:95px;--ty:80px">💎</span><div class="fxEmoji diamondPulse">${m.emoji}</div></div><div class="huge">+${Number(m.amount)||0} 💎</div><p class="fxSub">Dein Guthaben: ${Math.floor(s.diamonds)} Diamanten</p><button type="button" class="primary" data-chestclose="1">Weiter</button></div>`;
 }
 overlay.classList.add('show');
}
function showEarnedBox(box){
 clearTimeout(rewardAnimationTimer);clearTimeout(rewardDismissTimer);
 if(rewardModal?.mode==='earned'&&String(rewardModal.id)===String(box.id))return;
 rewardModal={mode:'earned',id:box.id,name:box.name};rewardModalRender();
}
function openRewardBox(id){
 if(rewardModal?.mode!=='earned'||String(rewardModal.id)!==String(id))return;
 const idx=s.rewardBoxes.findIndex(b=>String(b.id)===String(id));if(idx<0)return;
 const box=s.rewardBoxes.splice(idx,1)[0];
 const r=Math.random();const rarity=r<.70?'Episch':r<.94?'Mythisch':'Legendär';
 const amount=rarity==='Episch'?10+Math.floor(Math.random()*11):rarity==='Mythisch'?25+Math.floor(Math.random()*16):60+Math.floor(Math.random()*41);
 const emoji=rarity==='Episch'?'💠':rarity==='Mythisch'?'🔮':'👑';
 s.diamonds+=amount;s.rewardHistory.push({name:box.name,date:day(),amount,rarity});save();
 rewardModal={mode:'opened',name:box.name,amount,rarity,emoji};render();rewardModalRender();
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.chestopen!==undefined){e.preventDefault();e.stopImmediatePropagation();openRewardBox(b.dataset.chestopen)}
 if(b.dataset.chestclose!==undefined){e.preventDefault();e.stopImmediatePropagation();rewardModal=null;rewardModalRender()}
},true);
const normalRender41=render;render=function(){normalRender41();if(s.view==='rewards')$('#page').innerHTML=rewardView()};
// capture before older dispatcher so it does not toggle twice
// One unique claim is tied to the start timestamp and the exercise index.
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.action==='rewardScreen'){e.stopImmediatePropagation();s.shopReturn='';s.view='store';render();return}
 if(b.dataset.action==='rewardsBack'){e.stopImmediatePropagation();s.view='';s.tab=s.rewardReturn||'home';render();return}
 if(b.dataset.action==='rewardsTraining'){e.stopImmediatePropagation();s.view='';s.tab='train';render();return}
 if(b.dataset.openbox!==undefined){e.stopImmediatePropagation();let idx=Number(b.dataset.openbox);if(!Number.isInteger(idx)||idx<0||idx>=s.rewardBoxes.length)return;const box=s.rewardBoxes[idx];showEarnedBox(box);return}
 if(b.dataset.action==='finish'&&s.active){
  e.preventDefault();e.stopImmediatePropagation();
  const current=s.active;const w=find(current.id)||current;
  const started=Number(current.started)||Date.now();
  const endAt=Number(current.stoppedAt)||Date.now();
  const min=Math.max(1,Math.round((endAt-started)/60000));
  const kcal=Math.round((w?.kcal||0)*min/Math.max(1,w?.min||30));
  const exerciseRows=(w.exercises||[]).map((x,i)=>({...x,completedSets:Array.from({length:Number(x.sets)||0},(_,j)=>s.trainingSets[i+'-'+j]||{reps:x.reps,weight:x.weight,done:false}).filter(v=>v.done)}));
  s.history.push({id:uid(),workoutId:current.id,name:w?.name||'Training',day:day(),min,kcal,exercises:exerciseRows});
  const reachedGoal=!!current.goalReached;
  s.active=null;s.tab='progress';s.view='';save();render();
  toast(reachedGoal?'Training gespeichert. Zeittruhe wurde bereits vergeben!':'Training gespeichert – keine Truhe, Trainingszeit noch nicht erreicht.');
  return;
 }
 if(b.dataset.setdone&&s.active){e.stopImmediatePropagation();let key=b.dataset.setdone,parts=key.split('-').map(Number);let [i,j]=parts;let ex=find(s.active.id)?.exercises?.[i];if(!ex)return;
  let entry=s.trainingSets[key]||{reps:ex.reps,weight:ex.weight,done:false};entry.done=!entry.done;s.trainingSets[key]=entry;
  const count=Math.min(30,Math.max(1,Number(ex.sets)||1));const complete=Array.from({length:count},(_,n)=>{let set=s.trainingSets[i+'-'+n];return !!set?.done}).every(Boolean);
  const claim=String(s.active.started||'training')+':'+i;
  if(complete)recordLevelExercise(claim);
  if(complete&&!window.FP76Online&&rewardTimeInfo().ready&&!s.rewardClaims[claim]){s.rewardClaims[claim]=true;const box={id:uid(),name:ex.name};s.rewardBoxes.push(box);showEarnedBox(box)}
  else if(complete&&!rewardTimeInfo().ready){toast('Übung geschafft! Die Truhe kommt automatisch, sobald deine Trainingszeit abgelaufen ist.')}
  save();render();return
 }
},true);
// Extend export, retaining old data keys for backwards-compatible imports.
const previousExport41=doExport;doExport=function(){const payload={app:'FitnessPlus',version:'4.5',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};

$('#importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(payload.app==='FitnessPlus'&&payload.data&&Array.isArray(payload.data.workouts)&&Array.isArray(payload.data.history)){const x=payload.data;s.diamonds=Math.max(0,Number(x.diamonds)||0);s.rewardBoxes=Array.isArray(x.rewardBoxes)?x.rewardBoxes:[];s.rewardHistory=Array.isArray(x.rewardHistory)?x.rewardHistory:[];s.rewardClaims=x.rewardClaims&&typeof x.rewardClaims==='object'?x.rewardClaims:{};save();}}catch(e){}},true);

// FitnessPlus 4.6: virtual-currency cosmetic store, with no payments or money value.
const storeItems=[
 {id:'ocean',emoji:'🌊',name:'Aqua Flow',desc:'Türkisblauer Fitness-Look',price:35,type:'theme'},
 {id:'gold',emoji:'🌟',name:'Golden Rush',desc:'Goldene Highlights',price:90,type:'theme'},
 {id:'disco',emoji:'🪩',name:'Disco',desc:'Bunte Disco-Farben und Party-Akzente',price:140,type:'theme'},
 {id:'title_champion',emoji:'🥇',name:'Workout-Profi',desc:'Titel für dein Profil',price:45,type:'title'},
 {id:'title_diamond',emoji:'🔮',name:'Mythischer Athlet',desc:'Seltener Profil-Titel',price:120,type:'title'},
 {id:'title_legend',emoji:'👑',name:'Fitness-Legende',desc:'Legendärer Profil-Titel',price:220,type:'title'}
];
if(Array.isArray(s.storeOwned))s.storeOwned=s.storeOwned.map(id=>id==='neon'?'disco':id);if(s.storeTheme==='neon')s.storeTheme='disco';s.storeOwned=Array.isArray(s.storeOwned)?[...new Set(s.storeOwned.filter(id=>storeItems.some(item=>item.id===id)))]:[];
s.storeTheme=['default','ocean','gold','disco'].includes(s.storeTheme)?s.storeTheme:'default';
s.storeTitle=typeof s.storeTitle==='string'?s.storeTitle:'';
if(s.storeTheme!=='default'&&!s.storeOwned.includes(s.storeTheme))s.storeTheme='default';
if(s.storeTitle&&!s.storeOwned.includes(s.storeTitle))s.storeTitle='';
function storeScreen(){
 const categories=[['theme','🎨 Designs'],['title','🏅 Profil-Titel']];
 return hdr('DEIN FITNESSPLUS STORE','Gönn dir etwas!')+`<button class="btn" data-action="storeBack">← Zurück</button><div class="shopHero freshShop"><div class="shopKicker">DEIN DIAMANTEN-GUTHABEN</div><div class="balance">💎 ${Math.floor(s.diamonds)}</div><div class="small">Öffne Truhen und sammle Diamanten für neue Styles.</div></div>`+categories.map(([type,title])=>`<h2 class="section">${title}</h2><div class="shopGrid freshGrid">${storeItems.filter(i=>i.type===type).map(item=>{const owned=s.storeOwned.includes(item.id),equipped=item.type==='theme'?s.storeTheme===item.id:s.storeTitle===item.id;return `<div class="shopItem freshItem"><div class="shopSymbol">${item.emoji}</div><b>${item.name}</b><p>${item.desc}</p><button class="shopButton ${equipped?'equipped':''}" data-shopbuy="${item.id}" ${!owned&&s.diamonds<item.price?'disabled':''}>${equipped?'✓ Aktiv':owned?'Aktivieren':item.price+' 💎'}</button></div>`}).join('')}</div>`).join('')+`<div class="shopNotice">Alles nur für deine App: keine Echtgeldkäufe, keine Auszahlung und kein Geldwert.</div><button class="primary outline" data-shopreset="1">Standard-Design auswählen</button>`;
}
const renderBeforeStore=render;
render=function(){renderBeforeStore();if(s.storeTheme){document.documentElement.dataset.shopTheme=s.storeTheme}else{delete document.documentElement.dataset.shopTheme}if(s.view==='store')$('#page').innerHTML=storeScreen();const avatar=document.querySelector('.avatar');const titleItem=storeItems.find(item=>item.id===s.storeTitle);if(avatar){avatar.title=titleItem?.name||'FitnessPlus';avatar.textContent=(s.profile.nickname||'FP').slice(0,2).toUpperCase();}document.querySelectorAll('.profileTitleTop').forEach(el=>el.remove()); };
const homeBeforeStore=home;
home=function(){return homeBeforeStore()};
const rewardsBeforeStore=rewardView;
rewardView=function(){return rewardsBeforeStore()+`<button class="primary" data-action="storeOpen">💎 Zum Diamanten-Store</button>`};
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;
 if(b.dataset.action==='storeOpen'){e.preventDefault();e.stopImmediatePropagation();s.shopReturn=s.view==='rewards'?'rewards':'';s.view='store';render();return}
 if(b.dataset.action==='storeBack'){e.preventDefault();e.stopImmediatePropagation();s.view=s.shopReturn||'';render();return}
 if(b.dataset.shopreset){e.preventDefault();e.stopImmediatePropagation();s.storeTheme='default';save();render();toast('Standard-Design aktiviert');return}
 if(!b.dataset.shopbuy)return;
 e.preventDefault();e.stopImmediatePropagation();const item=storeItems.find(x=>x.id===b.dataset.shopbuy);if(!item)return;
 if(!s.storeOwned.includes(item.id)){
  if(s.diamonds<item.price){toast('Du hast noch nicht genug Diamanten.');return}
  if(!confirm(item.name+' für '+item.price+' Diamanten kaufen?'))return;
  s.diamonds-=item.price;s.storeOwned.push(item.id);
 }
 if(item.type==='theme')s.storeTheme=item.id;else s.storeTitle=item.id;
 save();render();toast('✨ '+item.name+' ist jetzt aktiv!');
},true);
// Extend existing backups with the virtual shop inventory.
const exportBeforeStore=doExport;
doExport=function(){const payload={app:'FitnessPlus',version:'5.3',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims,storeOwned:s.storeOwned,storeTheme:s.storeTheme,storeTitle:s.storeTitle}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('#importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const p=JSON.parse(await file.text());const x=p.data;if(p.app!=='FitnessPlus'||!x)return;s.storeOwned=Array.isArray(x.storeOwned)?[...new Set(x.storeOwned.map(id=>id==='neon'?'disco':id).filter(id=>storeItems.some(z=>z.id===id)))]:[];const importedTheme=x.storeTheme==='neon'?'disco':x.storeTheme;s.storeTheme=s.storeOwned.includes(importedTheme)?importedTheme:'default';s.storeTitle=s.storeOwned.includes(x.storeTitle)?x.storeTitle:'';save();render()}catch(err){}},true);

// FitnessPlus 5.5: Levels count unique completed exercises. No server is required.
s.levelExerciseClaims=s.levelExerciseClaims&&typeof s.levelExerciseClaims==='object'?s.levelExerciseClaims:{};
s.levelExercises=Math.max(0,Number(s.levelExercises)||0);
s.friends=Array.isArray(s.friends)?s.friends.filter(x=>x&&typeof x.name==='string'&&Number.isFinite(Number(x.exercises))):[];
function levelNumber(count=s.levelExercises){return 1+Math.floor(count/3)}
function recordLevelExercise(claim){
 if(window.FP76Online){window.FP76Exercise?.(claim);return}
 if(s.levelExerciseClaims[claim])return;
 const oldLevel=levelNumber();
 const multiplier=s.levelBoostUses>0?(s.levelBoostMultiplier===3?3:2):eventDoubleXP();
 s.levelExerciseClaims[claim]=true;
 s.levelExercises+=multiplier;seasonRecordExercise();
 if(s.levelBoostUses>0){s.levelBoostUses--;if(s.levelBoostUses===0)s.levelBoostMultiplier=1}
 save();
 if(levelNumber()>oldLevel)toast('🏆 LEVEL '+levelNumber()+' ERREICHT!'+(multiplier>1?' · '+multiplier+'× Booster':''));
 else toast('✅ +'+multiplier+' Level-Fortschritt'+(multiplier>1?' mit Booster!':'!'));
}
// Version 6.6: Share simple links; profile data stays inside URL fragment and never reaches a server in the URL request.
function friendBaseUrl(){
 const fallback=location.origin+location.pathname;
 const typed=String(localStorage.getItem('fitnessplus-friend-base')||'').trim();
 return typed||fallback;
}
function makeFriendLink(){
 const name=(s.profile.nickname||'FitnessPlus-Freund').trim().slice(0,32)||'FitnessPlus-Freund';
 const payload={v:1,name,exercises:Math.max(0,Math.floor(Number(s.levelExercises)||0))};
 const raw=friendBaseUrl();
 let base;
 try{base=new URL(raw,location.href);if(!/^https?:$/.test(base.protocol))throw Error('Bad URL');}catch(_){throw Error('Bitte gültige App-Adresse angeben.');}
 base.search='';base.hash='fp-friend='+encodeURIComponent(JSON.stringify(payload));
 return base.href;
}
function shareFriendLink(){
 let link;try{link=makeFriendLink()}catch(e){toast(e.message);return}
 if(navigator.share){navigator.share({title:'FitnessPlus Freund hinzufügen',text:'Füge mich bei FitnessPlus hinzu!',url:link}).catch(()=>{});return}
 copyFriendLink();
}
async function copyFriendLink(){
 let link;try{link=makeFriendLink()}catch(e){toast(e.message);return}
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(link);toast('Freundes-Link kopiert!');return}catch(_){}}
 prompt('Link auswählen und kopieren:',link);
}
function friendLinkPanel(){
 const configured=safe(String(localStorage.getItem('fitnessplus-friend-base')||''));
 return `<div class="card"><b>🔗 Freunde per Link einladen</b><p class="sub">Schicke deinen persönlichen Link. Beim Öffnen wird dein Profil direkt in die Freundesliste übernommen.</p><button class="primary" data-friendshare="1">Link teilen</button><button class="primary outline" data-friendcopy="1">Link kopieren</button><details class="friendLinkDetails"><summary>Andere App-Adresse verwenden</summary><p class="sub">Wenn du die Admin-App nutzt, trage hier die Adresse der normalen FitnessPlus-App deiner Freunde ein. So öffnet dein Link nicht die Admin-App.</p><input class="input" id="friendBaseInput" type="url" placeholder="https://deine-oeffentliche-app.netlify.app/" value="${configured}"><button class="btn" data-friendbase="1">Adresse speichern</button></details></div>`;
}
function acceptFriendFromLink(){
 const match=location.hash.match(/^#fp-friend=(.+)$/);
 if(!match)return;
 // Clear the URL so repeated re-renders / reopening do not silently re-import.
 try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}
 try{
  const decoded=JSON.parse(decodeURIComponent(match[1]));
  if(!decoded||decoded.v!==1)throw Error('Ungültiger Link');
  const name=String(decoded.name||'').trim().slice(0,32);
  const count=Number(decoded.exercises);
  if(!name||!Number.isSafeInteger(count)||count<0||count>999999)throw Error('Ungültige Freundesdaten');
  const mine=(s.profile.nickname||'FitnessPlus-Freund').trim();
  if(name===mine)throw Error('Das ist dein eigenes Profil.');
  s.friends=s.friends.filter(x=>x.name!==name);
  s.friends.push({name,exercises:count});
  s.tab='progress';s.view='friends';
  save();render();toast('👥 '+name+' zur Freundesliste hinzugefügt!');window.FitnessPlusSyncFriend?.(name);
 }catch(err){toast(err.message||'Freundes-Link konnte nicht gelesen werden.')}
}
function levelsScreen(){
 const lv=levelNumber();const part=s.levelExercises%3;
 const players=[{name:s.profile.nickname||'Ich',exercises:s.levelExercises,self:true},...s.friends]
 .sort((a,b)=>Number(b.exercises)-Number(a.exercises)||a.name.localeCompare(b.name,'de'));
 return hdr('DEIN FITNESSPLUS LEVEL','Trainieren. Aufsteigen.')+
 `<div class="card levelHero"><div class="levelMedal">🏆</div><div class="levelBig">LEVEL ${lv}</div><p class="sub">${s.levelExercises} abgeschlossene Übungen insgesamt</p><div class="levelTrack"><div style="width:${part/3*100}%"></div></div><b>${part} / 3 Übungen bis zum nächsten Level</b><p class="sub">Jede komplett abgehakte Übung zählt einmal pro Training. Die Trainingszeit-Truhe hat eigene Regeln.</p></div>`+
 `<div class="card"><div class="row"><b>👥 Freunde-Rangliste</b><button class="btn" data-action="openFriends">Freundesliste →</button></div><div class="sub">${players.length} Teilnehmer</div><div class="levelRanking">${players.map((x,i)=>`<div class="levelRow ${x.self?'mine':''}"><span class="rankNo">${i+1}.</span><span class="grow"><b>${safe(x.name)}${x.self?' (du)':''}</b><small>${Number(x.exercises)} Übungen</small></span><strong>Lv. ${levelNumber(Number(x.exercises))}</strong>${x.self?'':`<button class="btn" data-removefriend="${safe(x.name)}" aria-label="Freund entfernen">×</button>`}</div>`).join('')}</div></div>`+
 friendLinkPanel()+
 `<p class="sub">Hinweis: Die Rangliste basiert auf selbst geteilten Codes und ist kein verifizierter Wettkampf. Für aktuelle Werte braucht es einen neuen Code.</p>`;
}
function friendsScreen(){
 const friends=[...s.friends].sort((a,b)=>Number(b.exercises)-Number(a.exercises)||a.name.localeCompare(b.name,'de'));
 return hdr('DEINE FREUNDE','Gemeinsam stärker.')+
 `<div class="card"><div class="row"><div><b>👥 Freundesliste</b><div class="sub">${friends.length} ${friends.length===1?'Freund':'Freunde'} gespeichert</div></div><button class="btn" data-action="openLevels">🏆 Rangliste</button></div></div>`+
 (friends.length?friends.map((f,i)=>`<div class="card friendCard"><div class="row"><div class="friendAvatar">${safe(String(f.name||'?').slice(0,1).toUpperCase())}</div><div class="grow"><b>${safe(f.name)}</b><div class="sub">Level ${levelNumber(Number(f.exercises))} · ${Number(f.exercises)} Übungen</div><div class="friendMiniTrack"><div style="width:${Number(f.exercises)%3/3*100}%"></div></div></div><button class="btn danger" data-removefriend="${safe(f.name)}" aria-label="${safe(f.name)} entfernen">Entfernen</button></div></div>`).join(''):`<div class="card"><b>Noch keine Freunde</b><p class="sub">Lass dir einen Freundes-Link schicken und öffne ihn.</p></div>`)+
 friendLinkPanel()+
 `<p class="sub">Die Liste bleibt auf deinem Gerät gespeichert. Für einen aktuellen Levelstand öffnen Freunde einfach einen neuen Einladungslink.</p>`;
}
const homeBeforeLevels=home;
home=function(){return homeBeforeLevels()+`<div class="card"><div class="row"><div><b>🏆 Level ${levelNumber()}</b><div class="sub">${s.levelExercises} Übungen geschafft · Noch ${3-s.levelExercises%3} bis zum nächsten Level</div></div><button class="btn" data-action="openFriends">Freunde →</button></div><div class="levelTrack"><div style="width:${s.levelExercises%3/3*100}%"></div></div></div>`};
const progressBeforeLevels=progress;
progress=function(){if(s.view==='friends')return friendsScreen();if(s.view==='levels')return levelsScreen();return `<div class="card"><div class="row"><div><b>🏆 Level ${levelNumber()}</b><div class="sub">Vergleiche dich mit deinen Freunden</div></div><button class="btn" data-action="openFriends">Freundesliste →</button></div></div>`+progressBeforeLevels()};
// Capture these new actions before the original click handler.
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.action==='openFriends'){e.preventDefault();e.stopImmediatePropagation();s.view='friends';s.tab='progress';render();return}
 if(b.dataset.action==='openLevels'){
  e.preventDefault();e.stopImmediatePropagation();s.view='levels';s.tab='progress';render();return;
 }
 if(b.dataset.friendcopy){e.preventDefault();e.stopImmediatePropagation();copyFriendLink();return}
 if(b.dataset.friendshare){e.preventDefault();e.stopImmediatePropagation();shareFriendLink();return}
 if(b.dataset.friendbase){e.preventDefault();e.stopImmediatePropagation();const input=String($('#friendBaseInput')?.value||'').trim();try{if(input&&!/^https?:$/.test(new URL(input).protocol))throw Error('URL');if(input)localStorage.setItem('fitnessplus-friend-base',input);else localStorage.removeItem('fitnessplus-friend-base');render();toast('App-Adresse gespeichert!')}catch(_){toast('Bitte vollständige https://-Adresse eingeben.')}return}
 if(b.dataset.removefriend){e.preventDefault();e.stopImmediatePropagation();s.friends=s.friends.filter(x=>x.name!==b.dataset.removefriend);save();render();toast('Freund entfernt');return}
},true);
// Extend backups with level history and manual friend ranking.
const exportBeforeLevels=doExport;
doExport=function(){
 const payload={app:'FitnessPlus',version:'5.6',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims,storeOwned:s.storeOwned,storeTheme:s.storeTheme,storeTitle:s.storeTitle,levelExercises:s.levelExercises,levelExerciseClaims:s.levelExerciseClaims,friends:s.friends}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
};
// Latest import hook keeps the new level data in sync with other import handlers.
$('#importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(p.app!=='FitnessPlus'||!p.data)return;const x=p.data;s.levelExercises=Math.max(0,Number(x.levelExercises)||0);s.levelExerciseClaims=x.levelExerciseClaims&&typeof x.levelExerciseClaims==='object'?x.levelExerciseClaims:{};s.friends=Array.isArray(x.friends)?x.friends.filter(y=>y&&typeof y.name==='string'&&Number.isFinite(Number(y.exercises))).slice(0,100):[];save();render()}catch(_){}},true);

// FitnessPlus 5.7: exclusively level boosters in shop. Previous cosmetic purchases are retained in backup but no longer sold.
const levelBoosters=[
 {id:'boost2small',emoji:'⚡',name:'Doppel-Power',desc:'2× Level-Fortschritt bei den nächsten 3 wirklich abgeschlossenen Übungen.',price:60,multiplier:2,uses:3},
 {id:'boost2long',emoji:'🚀',name:'Trainings-Turbo',desc:'2× Level-Fortschritt bei den nächsten 8 wirklich abgeschlossenen Übungen.',price:130,multiplier:2,uses:8},
 {id:'boost3mega',emoji:'🔥',name:'Mega-XP',desc:'3× Level-Fortschritt bei den nächsten 5 wirklich abgeschlossenen Übungen.',price:200,multiplier:3,uses:5}
];
s.levelBoostMultiplier=[2,3].includes(Number(s.levelBoostMultiplier))?Number(s.levelBoostMultiplier):1;
s.levelBoostUses=Math.max(0,Math.floor(Number(s.levelBoostUses)||0));
if(!s.levelBoostUses)s.levelBoostMultiplier=1;
storeScreen=function(){
 const active=s.levelBoostUses>0?`${s.levelBoostMultiplier}× Fortschritt · ${s.levelBoostUses} Übung${s.levelBoostUses===1?'':'en'} übrig`:'Zurzeit kein Booster aktiv';
 return hdr('DIAMANTEN STORE','Deine Power-Ups.')+`<button class="btn" data-action="storeBack">← Zurück</button>
 <section class="shopHubHead"><div class="shopHubTop"><span>💎 DIAMANTEN STORE</span><span class="shopHubBalance">💎 ${Math.floor(s.diamonds)}</span></div><h2>Level schneller erreichen</h2><p>Trainiere und verstärke deinen Fortschritt mit Boostern.</p><div class="shopHubStatus">🏆 Level ${levelNumber()} <span>·</span> ${s.levelExercises%3}/3 bis zum nächsten Level</div><div class="shopHubStatus">⚡ ${active}</div></section>
 <div class="shopQuickGrid"><button class="shopQuick giftQuick" data-giftmenu="1"><span>🎁</span><b>Geschenke</b><small>Diamanten verschenken</small></button></div>
 <div class="shopSectionHead"><div><span class="eyebrow">POWER-UPS</span><h2 class="section">Level-Booster</h2></div><span class="shopCount">3 Produkte</span></div>
 <div class="boosterGrid shopNewGrid">${levelBoosters.map(i=>`<article class="boosterProduct shopNewProduct"><div class="boosterEmoji">${i.emoji}</div><div class="grow"><b>${i.name}</b><p>${i.desc}</p><strong>${i.price} 💎</strong></div><button class="shopButton" data-boostbuy="${i.id}" ${s.diamonds<i.price||s.levelBoostUses>0?'disabled':''}>${s.levelBoostUses>0?'Booster aktiv':s.diamonds<i.price?'Zu wenig 💎':'Kaufen'}</button></article>`).join('')}</div>
 <p class="shopNotice">Booster wirken nur bei wirklich abgeschlossenen Übungen. Diamanten und Freundes-Geschenke sind rein virtuell.</p>`;
};

const levelStoreHome=home;
home=function(){return levelStoreHome().replace('Hol dir neue Designs und Titel.','Hol dir Level-Booster.').replace('💎 Diamanten-Store','💎 Diamanten Store')};
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-boostbuy]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const i=levelBoosters.find(x=>x.id===b.dataset.boostbuy);if(!i)return;
 if(s.levelBoostUses>0){toast('Verbrauche zuerst deinen aktiven Booster.');return}
 if(s.diamonds<i.price){toast('Nicht genug Diamanten.');return}
 if(!confirm(i.name+' für '+i.price+' Diamanten kaufen?'))return;
 s.diamonds-=i.price;s.levelBoostMultiplier=i.multiplier;s.levelBoostUses=i.uses;
 save();render();toast(i.name+' aktiviert!');
},true);
const backupBeforeBoosters=doExport;
doExport=function(){
 const payload={app:'FitnessPlus',version:'5.7',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims,storeOwned:s.storeOwned,storeTheme:s.storeTheme,storeTitle:s.storeTitle,levelExercises:s.levelExercises,levelExerciseClaims:s.levelExerciseClaims,friends:s.friends,levelBoostMultiplier:s.levelBoostMultiplier,levelBoostUses:s.levelBoostUses}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
};
$('#importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(p.app!=='FitnessPlus'||!p.data)return;const x=p.data;s.levelBoostUses=Math.max(0,Math.floor(Number(x.levelBoostUses)||0));s.levelBoostMultiplier=s.levelBoostUses&&[2,3].includes(Number(x.levelBoostMultiplier))?Number(x.levelBoostMultiplier):1;save();render()}catch(_e){}},true);


// FitnessPlus 5.8: offline shareable gift vouchers. These are local codes, not server-verified.
s.giftsSent=Array.isArray(s.giftsSent)?s.giftsSent:[];
s.giftsRedeemed=Array.isArray(s.giftsRedeemed)?s.giftsRedeemed:[];
s.giftsInbox=Array.isArray(s.giftsInbox)?s.giftsInbox:[];
function makeGiftCode(g){
 const payload={v:1,id:g.id,booster:g.booster,from:g.from,to:g.to,created:g.created};
 const bytes=new TextEncoder().encode(JSON.stringify(payload));
 let binary='';for(const n of bytes)binary+=String.fromCharCode(n);
 return 'FPG58-'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeGiftCode(code){
 const v=String(code||'').trim();if(!v.startsWith('FPG58-')||v.length>1500)throw Error('Ungültiger Code');
 let raw=v.slice(6).replace(/-/g,'+').replace(/_/g,'/');raw+='='.repeat((4-raw.length%4)%4);
 const bytes=Uint8Array.from(atob(raw),x=>x.charCodeAt(0));
 const g=JSON.parse(new TextDecoder().decode(bytes));
 if(g.v!==1||typeof g.id!=='string'||g.id.length<8||g.id.length>80||typeof g.from!=='string'||typeof g.to!=='string')throw Error('Ungültiger Code');
 const i=levelBoosters.find(x=>x.id===g.booster);if(!i)throw Error('Unbekannter Booster');
 return {...g,item:i};
}
function giftScreen(){
 const friendOpts=s.friends.map(f=>`<option value="${safe(f.name)}">${safe(f.name)} · Lv. ${levelNumber(Number(f.exercises))}</option>`).join('');
 return hdr('GESCHENKE','Freunden Power schenken.')+`<button class="btn" data-giftback="1">← Zum Diamanten Store</button>
 <section class="boosterHero"><div class="shopKicker">DEINE DIAMANTEN</div><div class="boosterBalance">💎 ${Math.floor(s.diamonds)}</div><div class="boosterStatus">🎁 Wähle ein Geschenk, teile den Code per Nachricht.</div></section>
 <div class="card"><b>🎁 Geschenk vorbereiten</b><p class="sub">Ein Level-Booster wird von deinen Diamanten bezahlt. Dein Freund aktiviert ihn mit dem Geschenkcode in seiner App.</p>
 <label class="field" for="giftFriend">Für wen?</label><select class="input" id="giftFriend"><option value="">Freund auswählen</option>${friendOpts}</select>
 <label class="field" for="giftBooster">Welchen Booster schenken?</label><select class="input" id="giftBooster">${levelBoosters.map(i=>`<option value="${i.id}">${i.emoji} ${safe(i.name)} · ${i.price} 💎</option>`).join('')}</select>
 <button class="primary" data-giftbuy="1">Geschenk kaufen und Code erzeugen</button></div>
 ${s.giftsSent.length?`<div class="card"><b>📤 Deine Geschenkcodes</b>${s.giftsSent.slice().reverse().slice(0,12).map(g=>{const i=levelBoosters.find(x=>x.id===g.booster);return `<div class="giftEntry"><div><b>${i?i.emoji+' '+safe(i.name):'Level-Booster'}</b><div class="sub">Für ${safe(g.to)} · ${safe(g.created)}</div></div><button class="btn" data-giftcopy="${safe(g.id)}">Code kopieren</button></div>`}).join('')}</div>`:''}
 <div class="card"><b>📥 Geschenk einlösen</b><p class="sub">Geschenkcode von einem Freund einfügen:</p><textarea class="input" id="giftCodeInput" rows="4" placeholder="FPG58-..."></textarea><button class="primary" data-giftredeem="1">Geschenk einlösen</button>
 ${s.giftsInbox.length?`<div class="sub" style="margin-top:10px">${s.giftsInbox.length} eingelöste Geschenk${s.giftsInbox.length===1?'':'e'} gespeichert</div>`:''}</div>
 <div class="shopNotice">Hinweis: Geschenkcodes werden ohne Online-Server übertragen. Sie lassen sich deshalb nicht sicher gegen Kopieren oder Manipulation schützen. Ein Code wird nur auf diesem Gerät als eingelöst markiert. Booster lassen sich erst aktivieren, wenn kein anderer Booster läuft.</div>`;
}
const renderBeforeGifts=render;
render=function(){renderBeforeGifts();if(s.view==='gifts')$('#page').innerHTML=giftScreen()};
function activateGiftIfReady(){
 if(s.levelBoostUses>0||!s.giftsInbox.length)return false;
 const gift=s.giftsInbox.find(g=>!g.activated);if(!gift)return false;
 const i=levelBoosters.find(x=>x.id===gift.booster);if(!i)return false;
 s.levelBoostMultiplier=i.multiplier;s.levelBoostUses=i.uses;gift.activated=true;save();return true;
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.giftmenu!==undefined){e.preventDefault();e.stopImmediatePropagation();s.view='gifts';render();return}
 if(b.dataset.giftback!==undefined){e.preventDefault();e.stopImmediatePropagation();s.view='store';render();return}
 if(b.dataset.giftbuy!==undefined){
  e.preventDefault();e.stopImmediatePropagation();
  const to=String($('#giftFriend')?.value||'').trim(),i=levelBoosters.find(x=>x.id===$('#giftBooster')?.value);
  if(!to||!s.friends.some(f=>f.name===to)){toast('Bitte zuerst einen Freund auswählen.');return}
  if(!i||s.diamonds<i.price){toast('Nicht genug Diamanten.');return}
  if(!confirm(i.name+' für '+to+' verschenken? Das kostet '+i.price+' Diamanten.'))return;
  const g={id:uid()+'-'+Math.random().toString(36).slice(2,10),booster:i.id,to,from:s.profile.nickname||'FitnessPlus-Freund',created:day()};
  const customLabel=String($('#fp70BoosterLabel')?.value||'').trim();
  if(customLabel){try{g.customLabel=fp70Label(customLabel)}catch(err){toast(err.message);return}}
  s.diamonds-=i.price;s.giftsSent.push(g);save();render();
  const code=g.customLabel?fp70GiftCode(g,g.customLabel,'booster'):makeGiftCode(g);
  try{await navigator.clipboard.writeText(code);toast('Geschenkcode kopiert! Jetzt an '+to+' senden.')}catch(_){prompt('Geschenkcode kopieren und an '+to+' senden:',code)}
  return;
 }
 if(b.dataset.giftcopy!==undefined){
  e.preventDefault();e.stopImmediatePropagation();const g=s.giftsSent.find(x=>x.id===b.dataset.giftcopy);if(!g)return;
  const code=g.customLabel?fp70GiftCode(g,g.customLabel,'booster'):makeGiftCode(g);try{await navigator.clipboard.writeText(code);toast('Geschenkcode kopiert!')}catch(_){prompt('Geschenkcode kopieren:',code)}return;
 }
 if(b.dataset.giftredeem!==undefined){
  e.preventDefault();e.stopImmediatePropagation();let g;
  try{g=decodeGiftCode($('#giftCodeInput')?.value)}catch(_){toast('Ungültiger Geschenkcode.');return}
  if(s.giftsRedeemed.includes(g.id)){toast('Dieses Geschenk wurde hier bereits eingelöst.');return}
  const name=String(s.profile.nickname||'').trim();if(g.to!==name){toast('Das Geschenk ist für '+g.to+'. Trage diesen Namen zuerst im Profil ein.');return}
  s.giftsRedeemed.push(g.id);s.giftsInbox.push({id:g.id,booster:g.booster,from:g.from,activated:false});
  const activated=activateGiftIfReady();save();render();toast(activated?g.item.name+' geschenkt und aktiviert!':'Geschenk erhalten! Es wird nach deinem aktuellen Booster aktiviert.');return;
 }
},true);
// Auto-activate queued gifts after consuming an earlier boost.
setInterval(()=>{if(s.giftsInbox?.some(g=>!g.activated)&&s.levelBoostUses===0){if(activateGiftIfReady())toast('Geschenk-Booster aktiviert!')}},1000);
const exportBeforeGifts=doExport;
doExport=function(){const payload={app:'FitnessPlus',version:'5.8',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims,storeOwned:s.storeOwned,storeTheme:s.storeTheme,storeTitle:s.storeTitle,levelExercises:s.levelExercises,levelExerciseClaims:s.levelExerciseClaims,friends:s.friends,levelBoostMultiplier:s.levelBoostMultiplier,levelBoostUses:s.levelBoostUses,giftsSent:s.giftsSent,giftsRedeemed:s.giftsRedeemed,giftsInbox:s.giftsInbox}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
};
$('#importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(p.app!=='FitnessPlus'||!p.data)return;const x=p.data;s.giftsSent=Array.isArray(x.giftsSent)?x.giftsSent:[];s.giftsRedeemed=Array.isArray(x.giftsRedeemed)?x.giftsRedeemed:[];s.giftsInbox=Array.isArray(x.giftsInbox)?x.giftsInbox:[];save();render()}catch(_){}},true);



// FitnessPlus 6.1: Diamanten Store ohne Truhen-Menue.
// FitnessPlus 5.9 – täglich einmal einlösen, Bonus für aufeinanderfolgende Tage.
s.dailyReward=s.dailyReward&&typeof s.dailyReward==='object'?s.dailyReward:{last:'',streak:0,total:0};
function dailyInfo(){
 const today=day(),last=String(s.dailyReward.last||'');
 const yesterday=dkey(new Date(new Date(today+'T12:00:00').getTime()-86400000));
 const already=last===today;
 const streak=already?Math.max(1,Number(s.dailyReward.streak)||1):(last===yesterday?Math.max(0,Number(s.dailyReward.streak)||0)+1:1);
 const reward=10+5*Math.min(6,streak-1);
 return {today,already,streak,reward};
}
function dailyCard(){const i=dailyInfo();return `<div class="card dailyCard"><div class="row"><div><div class="dailyEyebrow">🎁 TAGESBELOHNUNG</div><h2 class="dailyTitle">${i.already?'Heute abgeholt!':'Dein täglicher Bonus'}</h2><div class="sub">${i.streak} ${i.streak===1?'Tag':'Tage'} in Folge · ${i.already?'Komm morgen wieder!':'Hol dir '+i.reward+' Diamanten'}</div></div><div class="dailyGem">💎</div></div><div class="dailyDays">${Array.from({length:7},(_,j)=>`<div class="dailyDay ${j<i.streak?'done':''}"><b>${j+1}</b><span>${j<i.streak?'✓':'◆'}</span></div>`).join('')}</div><button class="primary" data-dailyclaim="1" ${i.already?'disabled':''}>${i.already?'✓ Für heute eingelöst':'🎁 '+i.reward+' Diamanten abholen'}</button><p class="sub">Einmal pro Kalendertag auf diesem Gerät. Die Serie startet nach einem ausgelassenen Tag neu.</p></div>`}
const homeBeforeDaily=home;
home=function(){return dailyCard()+homeBeforeDaily()};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-dailyclaim]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const i=dailyInfo();if(i.already){toast('Die heutige Belohnung hast du bereits abgeholt.');return}s.diamonds+=i.reward;s.dailyReward={last:i.today,streak:i.streak,total:Math.max(0,Number(s.dailyReward.total)||0)+i.reward};save();render();toast('🎉 +'+i.reward+' Diamanten! Tag '+i.streak+' deiner Serie.');},true);
const exportBeforeDaily=doExport;
doExport=function(){const payload={app:'FitnessPlus',version:'6.0',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims,storeOwned:s.storeOwned,storeTheme:s.storeTheme,storeTitle:s.storeTitle,levelExercises:s.levelExercises,levelExerciseClaims:s.levelExerciseClaims,friends:s.friends,levelBoostMultiplier:s.levelBoostMultiplier,levelBoostUses:s.levelBoostUses,giftsSent:s.giftsSent,giftsRedeemed:s.giftsRedeemed,giftsInbox:s.giftsInbox,dailyReward:s.dailyReward}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='FitnessPlus-Backup-'+day()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('#importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(payload.app!=='FitnessPlus'||!payload.data)return;const r=payload.data.dailyReward;if(r&&typeof r==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.last||''))){s.dailyReward={last:String(r.last),streak:Math.max(0,Math.floor(Number(r.streak)||0)),total:Math.max(0,Number(r.total)||0)};save();render()}}catch(_){}},true);


// Public build: no admin entry point, no developer PIN or local credit / creation tools.
s.devDiamondRedeemed=Array.isArray(s.devDiamondRedeemed)?s.devDiamondRedeemed:[];
function decodeDiamondGiftCode(code){
 const raw=String(code||'').trim();if(!raw.startsWith('FPD63-')||raw.length>1400)throw Error('Code ungültig');
 let b=raw.slice(6).replace(/-/g,'+').replace(/_/g,'/');b+='='.repeat((4-b.length%4)%4);
 const x=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b),v=>v.charCodeAt(0))));
 if(x.v!==1||typeof x.id!=='string'||x.id.length<8||x.id.length>90||typeof x.to!=='string'||x.to.length>32||!Number.isInteger(x.amount)||x.amount<1||x.amount>100000)throw Error('Code ungültig');
 return x;
}
const giftScreenBeforeDev=giftScreen;
giftScreen=function(){return giftScreenBeforeDev()};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-devredeem]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();let gift;try{gift=decodeDiamondGiftCode($('#diamondGiftInput')?.value)}catch(_){toast('Ungültiger Diamanten-Code.');return}
 const name=String(s.profile.nickname||'').trim();if(name!==gift.to){toast('Code ist für '+gift.to+' bestimmt.');return}
 if(s.devDiamondRedeemed.includes(gift.id)){toast('Auf diesem Gerät bereits eingelöst.');return}
 if(!confirm(gift.amount+' Diamanten einlösen?'))return;s.devDiamondRedeemed.push(gift.id);s.diamonds+=gift.amount;save();render();toast('+'+gift.amount+' Diamanten erhalten!');
},true);
const exportBeforePublic=doExport;
doExport=function(){const payload={app:'FitnessPlus',version:'6.4',exportedAt:new Date().toISOString(),data:{goalMinutes:s.goalMinutes,goalCalories:s.goalCalories,workouts:s.workouts,history:s.history,plans:s.plans,reminders:s.reminders,theme:s.theme,water:s.water,waterGoal:s.waterGoal,profile:s.profile,restDefault:s.restDefault,diamonds:s.diamonds,rewardBoxes:s.rewardBoxes,rewardHistory:s.rewardHistory,rewardClaims:s.rewardClaims,storeOwned:s.storeOwned,storeTheme:s.storeTheme,storeTitle:s.storeTitle,levelExercises:s.levelExercises,levelExerciseClaims:s.levelExerciseClaims,friends:s.friends,levelBoostMultiplier:s.levelBoostMultiplier,levelBoostUses:s.levelBoostUses,giftsSent:s.giftsSent,giftsRedeemed:s.giftsRedeemed,giftsInbox:s.giftsInbox,dailyReward:s.dailyReward,devDiamondRedeemed:s.devDiamondRedeemed}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('#importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(p.app!=='FitnessPlus'||!p.data)return;s.devDiamondRedeemed=Array.isArray(p.data.devDiamondRedeemed)?p.data.devDiamondRedeemed:[];save()}catch(_){}} ,true);


// FitnessPlus 6.7: site-wide announcement banner loaded from public announcement.json.
const ANNOUNCE_SEEN='fitnessplus-announcement-seen-v67';
let currentAnnouncement=null, announcementBusy=false;
function announcementSource(){return './announcement.json'}
function announcementPopup(data){
 const el=document.getElementById('announcementOverlay');if(!el)return;
 const title=safe(String(data.title||'Neu bei FitnessPlus').slice(0,90));
 const body=safe(String(data.message||'').slice(0,1200)).replace(/\n/g,'<br>');
 el.innerHTML='<div class="announceModal" role="dialog" aria-modal="true" aria-labelledby="announcementTitle"><div class="announceMark">📣</div><div class="announceTop">MITTEILUNG</div><h2 id="announcementTitle">'+title+'</h2><p>'+body+'</p><button class="primary" type="button" data-announcement-close="1">Verstanden</button></div>';
 el.classList.add('show');
}
async function checkAnnouncement(){
 if(announcementBusy)return;announcementBusy=true;
 try{
  const r=await fetch(announcementSource()+'?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('No announcement');
  const data=await r.json();
  if(data&&data.active===true&&typeof data.id==='string'&&data.id.length<100&&typeof data.message==='string'&&data.message.trim()&&localStorage.getItem(ANNOUNCE_SEEN)!==data.id){
   if(!currentAnnouncement||currentAnnouncement.id!==data.id){currentAnnouncement=data;announcementPopup(data)}
  }
 }catch(_e){}finally{announcementBusy=false}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-announcement-close]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(currentAnnouncement){try{localStorage.setItem(ANNOUNCE_SEEN,currentAnnouncement.id)}catch(_e){}}
 document.getElementById('announcementOverlay')?.classList.remove('show');currentAnnouncement=null;
},true);
setTimeout(checkAnnouncement,1100);
setInterval(checkAnnouncement,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAnnouncement()});

// FitnessPlus 6.8: published offline-friendly events. This is not authenticated or tamper-proof.
const EVENT_FILE='./events.json';
let liveEvents={id:'',active:false}, eventLoading=false;
s.eventClaims=s.eventClaims&&typeof s.eventClaims==='object'?s.eventClaims:{};
s.seasonProgress=s.seasonProgress&&typeof s.seasonProgress==='object'?s.seasonProgress:{};
s.eventWheel=s.eventWheel&&typeof s.eventWheel==='object'?s.eventWheel:{};
function validEvent(x){return x&&typeof x.id==='string'&&x.id.length<=100&&x.active===true&&typeof x==='object'}
function activeEvent(){if(!validEvent(liveEvents))return null;let now=Date.now(),start=Date.parse(liveEvents.start||''),end=Date.parse(liveEvents.end||'');if(!Number.isFinite(start)||!Number.isFinite(end)||now<start||now>=end)return null;return liveEvents}
async function refreshEvents(){if(eventLoading)return;eventLoading=true;try{let r=await fetch(EVENT_FILE+'?nocache='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Not available');let j=await r.json();liveEvents=validEvent(j)?j:{id:'',active:false};if(s.view==='events')render()}catch(_){liveEvents={id:'',active:false}}finally{eventLoading=false}}
function eventDoubleXP(){const e=activeEvent();return e&&e.doubleXP?2:1}
function seasonRecordExercise(){const e=activeEvent();if(!e||!e.season||!e.season.active)return;let key=e.id;s.seasonProgress[key]=(Number(s.seasonProgress[key])||0)+1;save()}
function eventView(){let e=activeEvent(),parts=[hdr('FITNESSPLUS EVENTS','Events & Belohnungen.'),'<button class="btn" data-eventback="1">← Zurück</button>'];if(!e)return parts.join('')+'<div class="card"><b>Gerade kein Event aktiv</b><p class="sub">Neue Events erscheinen hier, wenn die öffentliche Eventdatei aktualisiert wird.</p><button class="btn" data-eventrefresh="1">Aktualisieren</button></div>';
 parts.push(`<div class="card"><b>✨ ${safe(e.title||'FitnessPlus-Event')}</b><p class="sub">Bis ${safe(String(e.end||'').slice(0,10))}</p></div>`);
 if(e.gift&&e.gift.active){const key='gift:'+e.id;let done=!!s.eventClaims[key],amount=Math.max(1,Math.min(500,Math.floor(Number(e.gift.diamonds)||10)));parts.push(`<div class="card"><h2>🎁 Geschenk an alle</h2><p>${amount} 💎 einmal pro Event abholen</p><button class="primary" data-eventgift="1" ${done?'disabled':''}>${done?'✓ Schon abgeholt':'Geschenk abholen'}</button></div>`)}
 if(e.doubleXP)parts.push('<div class="card"><h2>⚡ Doppel-XP aktiv</h2><p class="sub">Jede wirklich abgeschlossene Übung gibt während dieses Events doppelte Level-Punkte. Eigene gekaufte Booster werden nicht zusätzlich vervielfacht.</p></div>');
 if(e.season&&e.season.active){let count=Math.max(0,Number(s.seasonProgress[e.id])||0),tiers=Array.isArray(e.season.tiers)?e.season.tiers:[];parts.push(`<div class="card"><h2>🏆 Saison-Pass</h2><p class="sub">${count} Übungen seit dem Start dieses Events abgeschlossen</p>${tiers.filter(t=>Number.isInteger(t.at)&&t.at>0&&t.at<=100&&Number.isInteger(t.diamonds)&&t.diamonds>0&&t.diamonds<=500).map(t=>{let key='season:'+e.id+':'+t.at,claimed=!!s.eventClaims[key];return `<div class="item"><div class="grow"><b>${t.at} Übungen</b><div class="sub">${t.diamonds} 💎</div></div><button class="btn" data-seasonclaim="${t.at}" ${count<t.at||claimed?'disabled':''}>${claimed?'✓ Geholt':count<t.at?'Gesperrt':'Abholen'}</button></div>`}).join('')}</div>`)}
 if(e.wheel&&e.wheel.active){let today=day(),spun=s.eventWheel[e.id]===today;parts.push(`<div class="card"><h2>🎡 Glücksrad</h2><p class="sub">Eine kostenlose Drehung pro Tag. Zufallsbelohnung: 5, 10, 15, 20 oder 30 💎.</p><button class="primary" data-eventspin="1" ${spun?'disabled':''}>${spun?'✓ Heute schon gedreht':'Jetzt drehen'}</button></div>`)}
 parts.push('<p class="sub">Hinweis: Events und Belohnungen sind in dieser Version nur lokal gespeichert. Es gibt noch keine zentrale, gegen Manipulation geschützte Nutzerverwaltung.</p>');return parts.join('')}
const previousEventsHome=home;home=function(){return previousEventsHome()+'<div class="card"><div class="row"><div><b>🎉 FitnessPlus Events</b><div class="sub">Geschenke · Doppel-XP · Saison-Pass · Glücksrad</div></div><button class="btn" data-openevents="1">Ansehen →</button></div></div>'};
const previousEventsRender=render;render=function(){previousEventsRender();if(s.view==='events')$('#page').innerHTML=eventView()};
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;
 if(b.dataset.openevents!==undefined){e.preventDefault();e.stopImmediatePropagation();s.view='events';render();refreshEvents();return}
 if(b.dataset.eventback!==undefined){e.preventDefault();e.stopImmediatePropagation();s.view='';render();return}
 if(b.dataset.eventrefresh!==undefined){e.preventDefault();e.stopImmediatePropagation();refreshEvents();return}
 const ev=activeEvent();if(!ev)return;
 if(b.dataset.eventgift!==undefined){e.preventDefault();e.stopImmediatePropagation();if(!ev.gift?.active)return;let key='gift:'+ev.id;if(s.eventClaims[key])return;s.eventClaims[key]=true;s.diamonds+=Math.max(1,Math.min(500,Math.floor(Number(ev.gift.diamonds)||10)));save();render();toast('🎁 Geschenk abgeholt!');return}
 if(b.dataset.seasonclaim!==undefined){e.preventDefault();e.stopImmediatePropagation();let at=Number(b.dataset.seasonclaim),tier=ev.season?.tiers?.find(t=>t.at===at);if(!ev.season?.active||!tier||!Number.isInteger(at)||at>Number(s.seasonProgress[ev.id]||0))return;let key='season:'+ev.id+':'+at;if(s.eventClaims[key])return;let amt=Number(tier.diamonds);if(!Number.isInteger(amt)||amt<1||amt>500)return;s.eventClaims[key]=true;s.diamonds+=amt;save();render();toast('🏆 Saisonbelohnung: '+amt+' Diamanten!');return}
 if(b.dataset.eventspin!==undefined){e.preventDefault();e.stopImmediatePropagation();if(!ev.wheel?.active||s.eventWheel[ev.id]===day())return;const awards=[5,10,15,20,30];let a=new Uint32Array(1);if(window.crypto?.getRandomValues)crypto.getRandomValues(a);else a[0]=Math.floor(Math.random()*4294967295);let prize=awards[a[0]%awards.length];s.eventWheel[ev.id]=day();s.diamonds+=prize;save();render();toast('🎡 Gewonnen: '+prize+' 💎!');return}
},true);
const exportBeforeEvents=doExport;doExport=function(){const data=JSON.parse(localStorage.getItem(KEY)||'{}');const payload={app:'FitnessPlus',version:'6.8',exportedAt:new Date().toISOString(),data:{...data,eventClaims:s.eventClaims,seasonProgress:s.seasonProgress,eventWheel:s.eventWheel}};let blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('#importFile').addEventListener('change',async e=>{try{let f=e.target.files?.[0];if(!f)return;let p=JSON.parse(await f.text());if(p.app!=='FitnessPlus'||!p.data)return;let d=p.data;s.eventClaims=d.eventClaims&&typeof d.eventClaims==='object'?d.eventClaims:{};s.seasonProgress=d.seasonProgress&&typeof d.seasonProgress==='object'?d.seasonProgress:{};s.eventWheel=d.eventWheel&&typeof d.eventWheel==='object'?d.eventWheel:{};save();render()}catch(_){}},true);
setTimeout(refreshEvents,900);setInterval(refreshEvents,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEvents()});

const normalOldSettings=settings;
settings=function(){return normalOldSettings()+`<div class="card"><b>🌐 FitnessPlus Online</b><p class="sub">Die Online-Verwaltung läuft getrennt von dieser App. Dein lokaler Spielstand wird nicht automatisch übertragen.</p><a href="https://fitnessplus-server.onrender.com/online.html" target="_blank" rel="noopener noreferrer" class="primary" style="display:block;text-align:center;text-decoration:none">Online-Konto öffnen ↗</a></div>`};
function checkReminders(){let now=new Date(),stamp=dkey(now)+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');let any=false;for(let r of s.reminders){if(!r.shown&&`${r.date}T${r.time}`<=stamp){r.shown=true;any=true;toast('Erinnerung: Zeit für dein FitnessPlus-Training!')}}if(any)save()}
setInterval(timerTick,100);setInterval(()=>{const msg=$('#rewardTimeText');if(msg&&s.active){const g=rewardTimeInfo();msg.textContent=g.ready?'✓ Trainingszeit erreicht! Truhen sind jetzt freigeschaltet.':'Noch '+rewardTimeLabel(g.remaining)+' bis zu deinen Truhen. Du kannst vorher abschließen, bekommst dann aber keine Truhe.';}},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)timerTick()});window.addEventListener('pageshow',timerTick);render();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

// 6.9: Gift links deliver the existing offline gift payload; no server validation.
function diamondGiftPublicLink(g){
 const configured=String(localStorage.getItem('fitnessplus-friend-base')||'').trim();
 let dest;
 try{dest=new URL(configured||window.location.href,window.location.href);if(!/^https?:$/.test(dest.protocol))throw Error('address');}
 catch(_){dest=new URL(window.location.href)}
 dest.hash='diamond-gift='+encodeURIComponent(makeDiamondGiftCode(g));
 dest.searchParams.delete('diamond-gift');
 return dest.href;
}
async function shareDiamondGift(g){
 const link=diamondGiftPublicLink(g);
 try{if(navigator.share){await navigator.share({title:'FitnessPlus Diamanten-Geschenk',text:'Ich schenke dir '+g.amount+' Diamanten in FitnessPlus!',url:link});return}}
 catch(e){if(e&&e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(link);toast('Geschenkcode kopiert!')}
 catch(_){prompt('Geschenkcode teilen:',link)}
}
let pendingDiamondLink=null;
function readDiamondGiftLink(){
 const m=location.hash.match(/(?:^#|&)diamond-gift=([^&]+)/);
 if(!m)return;
 try{pendingDiamondLink=decodeDiamondGiftCode(decodeURIComponent(m[1]));}
 catch(_){pendingDiamondLink=null;toast('Dieser Geschenkcode ist ungültig.')}
 history.replaceState(null,'',location.pathname+location.search);
 if(pendingDiamondLink){s.view='gifts';s.tab='home';render();}
}
function renderDiamondGiftLanding(){
 const el=$('#diamondGiftLanding');if(!el)return;
 if(!pendingDiamondLink){el.innerHTML='<p class="sub">Noch kein Geschenkcode geöffnet.</p>';return}
 const g=pendingDiamondLink;
 const redeemed=(s.devDiamondRedeemed||[]).includes(g.id);
 el.innerHTML='<p><b>'+safe(String(g.amount))+' 💎</b> von '+safe(String(g.from||'FitnessPlus'))+' an '+safe(g.to)+'</p>'+
 (redeemed?'<p class="sub">Auf diesem Gerät bereits eingelöst.</p>':'<button class="primary" data-diamond-link-claim="1">Diamanten-Geschenk annehmen</button>');
}
function redeemDiamondLink(){
 const gift=pendingDiamondLink;if(!gift)return;
 const name=String(s.profile.nickname||'').trim();
 if(name!==gift.to){toast('Geschenk ist für '+gift.to+' bestimmt. Profilnamen prüfen.');return}
 if(s.devDiamondRedeemed.includes(gift.id)){toast('Auf diesem Gerät bereits eingelöst.');return}
 if(!confirm(gift.amount+' Diamanten von '+(gift.from||'FitnessPlus')+' einlösen?'))return;
 s.devDiamondRedeemed.push(gift.id);s.diamonds+=gift.amount;pendingDiamondLink=null;save();render();toast('+'+gift.amount+' Diamanten erhalten!');
}
const renderWithDiamondGift=render;
render=function(){renderWithDiamondGift();renderDiamondGiftLanding()};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-diamond-link-claim]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();redeemDiamondLink()},true);


// FitnessPlus 7.0: user-labelled, self-contained offline friend and gift codes.
// The chosen label appears as the first part; encoded data is still required without a server.
function fp70Label(v){let s=String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(s.length<3||s.length>18)throw Error('Code-Name: 3–18 Zeichen, nur Buchstaben/Zahlen.');return s;}
function fp70Encode(data){const b=new TextEncoder().encode(JSON.stringify(data));let x='';for(const n of b)x+=String.fromCharCode(n);return btoa(x).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function fp70Decode(value){let t=String(value||'').replace(/-/g,'+').replace(/_/g,'/');t+='='.repeat((4-t.length%4)%4);return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t),x=>x.charCodeAt(0))))}
function fp70FriendlyCode(){const key=fp70Label(localStorage.getItem('fp70-friend-label')||'FITNESS');const name=String(s.profile.nickname||'FitnessPlus-Freund').trim().slice(0,32);return 'FPF7-'+key+'-'+fp70Encode({v:1,name,exercises:Math.floor(Number(s.levelExercises)||0)})}
function fp70ImportFriend(code){const m=String(code||'').trim().match(/^FPF7-([A-Z0-9]{3,18})-([A-Za-z0-9_-]+)$/i);if(!m)throw Error('Ungültiger Freundes-Code.');const d=fp70Decode(m[2]);if(d.v!==1||typeof d.name!=='string'||!d.name.trim()||d.name.length>32||!Number.isSafeInteger(d.exercises)||d.exercises<0||d.exercises>999999)throw Error('Ungültige Freundesdaten.');if(d.name.trim()===String(s.profile.nickname||'FitnessPlus-Freund').trim())throw Error('Das ist dein eigenes Profil.');s.friends=s.friends.filter(x=>x.name!==d.name);s.friends.push({name:d.name,exercises:d.exercises});save();s.view='friends';s.tab='progress';render();toast('Freund '+d.name+' hinzugefügt!');window.FitnessPlusSyncFriend?.(d.name)}
const fp70OldFriendPanel=friendLinkPanel;
friendLinkPanel=function(){return `<div class="card"><b>👥 Freunde per Code hinzufügen</b><p class="sub">Wähle einen eigenen Code-Namen und teile den vollständigen Freundes-Code. Ohne Server sind die Profildaten im Code enthalten.</p><label class="field">Mein Code-Name</label><input class="input" id="fp70FriendLabel" maxlength="18" value="${safe(localStorage.getItem('fp70-friend-label')||'FITNESS')}" placeholder="z. B. MAX123"><button class="primary" data-fp70friendmake="1">Meinen Code kopieren</button><label class="field">Freundes-Code eingeben</label><textarea class="input" id="fp70FriendInput" rows="3" placeholder="FPF7-MAX123-..."></textarea><button class="primary" data-fp70friendadd="1">Freund hinzufügen</button></div>`};
function fp70GiftCode(g,label,type){return 'FPG7-'+fp70Label(label)+'-'+fp70Encode({v:1,type,id:g.id,to:g.to,from:g.from,amount:g.amount||0,booster:g.booster||'',created:g.created})}
function fp70ReadGift(text){const m=String(text||'').trim().match(/^FPG7-([A-Z0-9]{3,18})-([A-Za-z0-9_-]+)$/i);if(!m)throw Error('Ungültiger Geschenk-Code.');const g=fp70Decode(m[2]);if(g.v!==1||!['diamonds','booster'].includes(g.type)||typeof g.id!=='string'||g.id.length<8||g.id.length>100||typeof g.to!=='string'||g.to.length>32||typeof g.from!=='string'||g.from.length>32)throw Error('Ungültiges Geschenk.');if(g.type==='diamonds'&&(!Number.isInteger(g.amount)||g.amount<1||g.amount>100000))throw Error('Ungültiger Betrag.');if(g.type==='booster'&&!levelBoosters.some(x=>x.id===g.booster))throw Error('Unbekannter Booster.');return g;}
const fp70OldGiftScreen=giftScreen;
giftScreen=function(){return fp70OldGiftScreen()+`<div class="card"><b>🔤 Geschenke mit Wunsch-Code</b><p class="sub">Booster oder Diamanten per Code einlösen. Der Code enthält den selbst gewählten Namen plus die Geschenkdetails.</p><textarea class="input" id="fp70GiftInput" rows="3" placeholder="FPG7-GESCHENK-..."></textarea><button class="primary" data-fp70giftredeem="1">Wunsch-Code einlösen</button></div>`};
function fp70GiftRedeem(g){const me=String(s.profile.nickname||'').trim();if(me!==g.to)throw Error('Geschenk ist für '+g.to+'. Profilnamen prüfen.');if(g.type==='diamonds'){s.devDiamondRedeemed=Array.isArray(s.devDiamondRedeemed)?s.devDiamondRedeemed:[];if(s.devDiamondRedeemed.includes(g.id))throw Error('Auf diesem Gerät schon eingelöst.');s.devDiamondRedeemed.push(g.id);s.diamonds+=g.amount;save();render();toast('+'+g.amount+' Diamanten erhalten!');return}
if(s.giftsRedeemed.includes(g.id))throw Error('Auf diesem Gerät schon eingelöst.');s.giftsRedeemed.push(g.id);s.giftsInbox.push({id:g.id,booster:g.booster,from:g.from,activated:false});const active=activateGiftIfReady();save();render();toast(active?'Booster aktiviert!':'Booster als Geschenk gespeichert!')}
// Store a user-chosen label per generated present; all transfers use codes.
const fp70OriginalGift=giftScreen;
giftScreen=function(){const h=fp70OriginalGift();return h.replace('<button class="primary" data-giftbuy="1">', '<label class="field">Geschenk-Code-Name (optional für Wunsch-Code)</label><input class="input" id="fp70BoosterLabel" maxlength="18" placeholder="z. B. POWER2026"><button class="primary" data-giftbuy="1">')};
// Add admin option to create a named offline code from each diamond gift.
async function fp70Copy(v){try{await navigator.clipboard.writeText(v);toast('Code kopiert!')}catch(_){prompt('Code kopieren:',v)}}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
if(b.dataset.fp70friendmake!==undefined){e.preventDefault();e.stopImmediatePropagation();localStorage.setItem('fp70-friend-label',fp70Label($('#fp70FriendLabel')?.value));await fp70Copy(fp70FriendlyCode());return}
if(b.dataset.fp70friendadd!==undefined){e.preventDefault();e.stopImmediatePropagation();fp70ImportFriend($('#fp70FriendInput')?.value);return}
if(b.dataset.fp70giftredeem!==undefined){e.preventDefault();e.stopImmediatePropagation();fp70GiftRedeem(fp70ReadGift($('#fp70GiftInput')?.value));return}

}catch(err){toast(err.message||'Eingabe prüfen.')}},true);

// FitnessPlus 7.2: offline level adjustment codes. No authenticated server;
// codes are only for consensual, local game-state changes.
s.levelAdjustRedeemed=Array.isArray(s.levelAdjustRedeemed)?s.levelAdjustRedeemed:[];
function fp72LevelRead(input){
 const m=String(input||'').trim().match(/^FPL72-([A-Z0-9]{3,18})-([A-Za-z0-9_-]+)$/i);
 if(!m)throw Error('Ungültiger Level-Code.');
 const g=fp70Decode(m[2]);
 if(g.v!==1||g.type!=='level-adjust'||typeof g.id!=='string'||g.id.length<8||g.id.length>100||typeof g.to!=='string'||g.to.length<1||g.to.length>32||!Number.isInteger(g.level)||g.level<1||g.level>10000)throw Error('Level-Code ist ungültig.');
 return g;
}
function fp72LevelRedeem(){
 const code=$('#fp72LevelInput')?.value;
 const g=fp72LevelRead(code);
 const name=String(s.profile.nickname||'').trim();
 if(name!==g.to)throw Error('Dieser Code ist für '+g.to+'. Bitte Profilnamen prüfen.');
 if(s.levelAdjustRedeemed.includes(g.id))throw Error('Dieser Code wurde bereits eingelöst.');
 const current=levelNumber();
 if(!confirm('Dein Level von '+current+' auf '+g.level+' setzen? Dein bisheriger Level-Fortschritt wird überschrieben.'))return;
 s.levelExercises=(g.level-1)*3;
 s.levelAdjustRedeemed.push(g.id);
 if(g.level===1){s.levelBoostMultiplier=1;s.levelBoostUses=0;}
 save();render();toast('Level auf '+g.level+' gesetzt!');
}
const fp72BeforeGift=giftScreen;
giftScreen=function(){return fp72BeforeGift()+`<div class="card"><b>🏆 Level-Änderung einlösen</b><p class="sub">Hast du vom Administrator einen Level-Code erhalten? Füge ihn hier ein. Ein Zurücksetzen auf Level 1 ist ebenfalls möglich.</p><textarea id="fp72LevelInput" class="input" rows="3" placeholder="FPL72-..."></textarea><button class="primary" data-fp72levelredeem="1">Level-Code einlösen</button></div>`};
// Online-Geschenke: nur direkte Diamantenuebertragung, keine Codes.
giftScreen=function(){return hdr('GESCHENKE','Diamanten direkt an Freunde senden.')+`<button class="btn" data-giftback="1">← Zum Diamantenshop</button><div class="card"><b>🎁 Geschenk an Freunde senden</b><p class="sub">Geschenke werden geladen ...</p></div>`};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-fp72levelredeem]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();try{fp72LevelRedeem()}catch(err){toast(err.message||'Code ungültig')}},true);


// FitnessPlus Cloud Sync 7.5. Server-backed profile per logged-in account.
// Protected balances are server-only; local legacy reward displays are not yet authoritative.
(()=>{'use strict';
let revision=0, loggedIn=false, busy=false, queued=false, conflict=false, lastSent='', ready=false;
// Cloud sync keeps running; no floating badge obscures the bottom navigation.
const setStatus=t=>{};
const api=async(method,url,data)=>{let r=await fetch(url,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});let x=await r.json();if(!r.ok)throw Object.assign(Error(x.error||'Serverfehler'),{status:r.status});return x};
const clean=()=>{let x={...s};for(let k of ['active','view','edit','draftExercises','tab','calMonth','selectedDay','weekOffset','libraryFilter','restUntil'])delete x[k];return x};
const merge=(remote,user)=>{let ui={tab:s.tab,theme:s.theme,active:null,view:'',edit:null,draftExercises:[]};s={...s,...remote,...ui,diamonds:user.diamonds,levelExercises:user.xp};try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}render()};
async function init(){if(busy)return;busy=true;try{
 const x=await api('GET','/api/state');loggedIn=true;revision=x.revision;
 if(x.state){let local=clean();let hasLocal=(local.history||[]).length||(local.workouts||[]).length||(local.diamonds||0)||(local.levelExercises||0);
  if(!ready&&hasLocal&&JSON.stringify(local)!==JSON.stringify(x.state)){
   try{localStorage.setItem('fitnessplus-cloud-migration-backup',JSON.stringify(s))}catch{}
   if(!confirm('Online-Spielstand gefunden. Diesen auf diesem Gerät laden? Deine bisherigen iPhone-Daten bleiben als lokale Sicherung erhalten.')){ready=false;setStatus('☁️ Synchronisierung pausiert');return;}
  }
  merge(x.state,x.user);
 }else{
  if(!ready&&localStorage.getItem(KEY)&&!confirm('Noch kein Cloud-Spielstand vorhanden. Deinen aktuellen iPhone-Spielstand hochladen?')){ready=false;setStatus('☁️ Synchronisierung pausiert');return;}
  // Do not grant self-reported historic diamonds or XP in the cloud.
  s.diamonds=x.user.diamonds;s.levelExercises=x.user.xp;await upload();
 }
 ready=true;window.FP76Online=true;window.FP76Refresh?.();conflict=false;setStatus('☁️ Synchronisiert');
 }catch(e){if(e.status===401){loggedIn=false;ready=false;window.FP76Online=false;setStatus('☁️ Anmelden')}else setStatus('☁️ Verbindungsfehler')}finally{busy=false}}
async function upload(){if(!loggedIn||!ready&&revision!==0)return;
 const state=clean(),str=JSON.stringify(state);if(lastSent===str&&!queued)return;
 try{let r=await api('PUT','/api/state',{revision,state});revision=r.revision;lastSent=str;setStatus('☁️ Synchronisiert');}
 catch(e){if(e.status===409){conflict=true;ready=false;setStatus('⚠️ Cloud-Konflikt');alert('Dein Spielstand wurde auf einem anderen Gerät geändert. Öffne FitnessPlus neu, um die aktuelle Version zu laden. Deine lokalen Änderungen wurden nicht gelöscht.');}else setStatus('☁️ Speichern ausstehend')}
}
let debounce;window.FitnessPlusCloudSaved=()=>{if(!ready||conflict)return;queued=true;setStatus('☁️ Speichert …');clearTimeout(debounce);debounce=setTimeout(async()=>{if(busy)return;busy=true;queued=false;await upload();busy=false;if(queued)window.FitnessPlusCloudSaved()},1800)};
window.FitnessPlusCloudRefresh=init;
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='fitnessplus-session-changed')init()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)init();else if(queued){clearTimeout(debounce);busy=false;queued=false;upload()}});
setTimeout(init,750);setInterval(()=>{if(!queued&&!busy)init()},45000);
})();
// FitnessPlus v7.6 — cloud economy and training rewards.
(()=>{'use strict';
let runId='',pending=new Set(),starting=null;
const req=async (url,data)=>{let r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});let x=await r.json();if(!r.ok)throw Error(x.error||'Server nicht erreichbar');return x};
const status=async()=>{try{let r=await fetch('/api/game',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;let x=await r.json();s.diamonds=x.user.diamonds;s.levelExercises=x.user.xp;s.levelBoostMultiplier=x.booster.multiplier;s.levelBoostUses=x.booster.uses;s.rewardBoxes=x.chests.map(t=>({id:t.id,name:'Online-Truhe'}));render()}catch{}};
window.FP76Refresh=status;
window.FP76Start=()=>{if(!window.FP76Online)return;runId='';starting=req('/api/game/start').then(x=>runId=x.runId).catch(e=>toast('Online-Training nicht gestartet: '+e.message))};
window.FP76Exercise=async claim=>{
 if(!window.FP76Online||s.levelExerciseClaims[claim]||pending.has(claim))return;
 const ix=Number(String(claim).split(':').pop());if(!Number.isInteger(ix))return;
 pending.add(claim);
 try{if(starting)await starting;if(!runId)throw Error('Starte das Training bei bestehender Verbindung neu');
  const x=await req('/api/game/exercise',{runId,exerciseIndex:ix});
  s.levelExerciseClaims[claim]=true;s.levelExercises=x.user.xp;
  s.rewardBoxes.push({id:x.chestId,name:'Online-Truhe'});
  await status();save();render();toast('✅ +'+x.xpGain+' XP und eine Online-Truhe!');
 }catch(e){toast(e.message)}finally{pending.delete(claim)}
};
const openCloudChest=async id=>{
 try{const x=await req('/api/game/chest/open',{chestId:id});s.diamonds=x.user.diamonds;
  s.rewardBoxes=s.rewardBoxes.filter(b=>String(b.id)!==String(id));
  s.rewardHistory.push({name:'Online-Truhe',date:day(),amount:x.diamonds,rarity:x.rarity});
  rewardModal={mode:'opened',name:'Online-Truhe',amount:x.diamonds,rarity:x.rarity,emoji:x.rarity==='Episch'?'💠':x.rarity==='Mythisch'?'🔮':'👑'};
  save();render();rewardModalRender();
 }catch(e){toast(e.message)}
};
// Window capture handles game actions before legacy local-only listeners.
window.addEventListener('click',async e=>{
 if(!window.FP76Online)return;
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.chestopen!==undefined){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();await openCloudChest(b.dataset.chestopen);return}
 if(b.dataset.boostbuy!==undefined){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const item=levelBoosters.find(i=>i.id===b.dataset.boostbuy);if(!item)return;
  if(!confirm(item.name+' für '+item.price+' Diamanten online kaufen?'))return;
  try{const x=await req('/api/game/shop/buy',{item:item.id});s.diamonds=x.user.diamonds;s.levelBoostUses=x.booster.uses;s.levelBoostMultiplier=x.booster.multiplier;save();render();toast(item.name+' online aktiviert!')}
  catch(err){toast(err.message)}return;
 }
 if(b.dataset.dailyclaim!==undefined){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  try{const x=await req('/api/game/daily');s.diamonds=x.user.diamonds;s.dailyReward.last=day();save();render();toast('🎉 +'+x.diamonds+' tägliche Diamanten!')}catch(err){toast(err.message)}return;
 }
 // Offline gift/event claims remain local in legacy versions; disable for signed-in users.
 if(b.dataset.eventgift!==undefined||b.dataset.seasonclaim!==undefined||b.dataset.eventspin!==undefined||b.dataset.giftredeem!==undefined||b.dataset.fp70giftredeem!==undefined){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.FitnessPlusOpenOnline?.();toast('🎉 Online-Geschenke und Events im Online-Menü abholen.');return;
 }
},true);
})();

})();
