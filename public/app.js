(()=>{'use strict';
const KEY='fitnessplus-v3';const OLD='fitnessplus-web-v2';const ACTIVE_TRAINING_KEY='fitnessplus-active-training-v1';const ONLINE_RUN_KEY='fitnessplus-online-run-v1';window.FP76SessionReady=false;const presets=[{id:'p0',name:'Ganzkörper Workout',type:'Kraft',min:30,kcal:230},{id:'p1',name:'Laufen',type:'Ausdauer',min:25,kcal:260},{id:'p2',name:'Yoga & Mobility',type:'Beweglichkeit',min:20,kcal:90},{id:'p3',name:'HIIT Power',type:'Intervall',min:15,kcal:180},{id:'p4',name:'Spaziergang',type:'Bewegung',min:30,kcal:110}];
const base={tab:'home',goalMinutes:45,goalCalories:400,goalSteps:8000,steps:{},history:[],workouts:[],plans:[],reminders:[],active:null,view:'',edit:null,calMonth:'',selectedDay:'',draftExercises:[],weekType:'minutes',weekOffset:0,theme:'light',water:{},waterGoal:2000,libraryFilter:'Alle',restUntil:0,trainingSets:{},librarySearch:'',profile:{nickname:'',focus:'allround',days:3},strengthExercise:'',strengthWeeks:8};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const $=x=>document.querySelector(x);const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;const dkey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');const day=()=>dkey();
let s={...base};try{let old=JSON.parse(localStorage.getItem(KEY)||'null');if(old){s={...s,...old,active:null,view:'',edit:null,draftExercises:[]}}else{old=JSON.parse(localStorage.getItem(OLD)||'null');if(old){s.goalMinutes=+old.goalMinutes||45;s.goalCalories=+old.goalCalories||400;s.workouts=(old.customWorkouts||[]).map((x,i)=>({id:String(x.id||uid()),name:x.name||'Eigenes Training',type:x.type||x.category||'Eigenes',min:Number(x.min)||30,kcal:Number(x.kcal)||180,exercises:[]}));s.history=(old.history||[]).map(x=>({id:uid(),workoutId:typeof x.id==='number'?`p${x.id}`:String(x.id||x.workoutId||''),name:typeof x.id==='number'?presets[x.id]?.name||'Workout':x.name||'Workout',day:x.day||day(),min:+x.min||0,kcal:+x.kcal||0,exercises:[]}));}}}catch(e){}
s.profile=s.profile&&typeof s.profile==='object'?{nickname:String(s.profile.nickname||''),focus:String(s.profile.focus||'allround'),days:Number(s.profile.days)||3}:{nickname:'',focus:'allround',days:3};s.history=Array.isArray(s.history)?s.history:[];s.workouts=Array.isArray(s.workouts)?s.workouts:[];s.plans=Array.isArray(s.plans)?s.plans:[];s.reminders=Array.isArray(s.reminders)?s.reminders:[];s.steps=s.steps&&typeof s.steps==='object'?s.steps:{};s.water=s.water&&typeof s.water==='object'?s.water:{};s.theme=s.theme==='dark'?'dark':'light';s.trainingSets=s.trainingSets&&typeof s.trainingSets==='object'?s.trainingSets:{};s.calMonth=new Date().toISOString().slice(0,7);s.selectedDay=day();
// Ein laufendes Training bleibt auch beim Neuladen oder nach einem App-Wechsel erhalten.
// Der Zeitstempel sorgt dafuer, dass der Timer nach dem Zurueckkehren korrekt weiterzaehlt.
try{
 const saved=JSON.parse(localStorage.getItem(ACTIVE_TRAINING_KEY)||'null');
 const a=saved?.active, started=Number(a?.started);
 if(a&&typeof a.id==='string'&&a.id.length<100&&Number.isFinite(started)&&started>0&&started<=Date.now()&&Date.now()-started<=4*3600000){
  s.active={id:a.id,started,done:Array.isArray(a.done)?a.done:[],goalReached:!!a.goalReached,stoppedAt:Number(a.stoppedAt)||0};
  s.trainingSets=saved.trainingSets&&typeof saved.trainingSets==='object'&&!Array.isArray(saved.trainingSets)?saved.trainingSets:s.trainingSets;
  s.restUntil=Number(saved.restUntil)||0;
  s.tab='train';s.view='';
 }else if(saved){localStorage.removeItem(ACTIVE_TRAINING_KEY);localStorage.removeItem(ONLINE_RUN_KEY)}
}catch(_){try{localStorage.removeItem(ACTIVE_TRAINING_KEY)}catch(__){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify({...s,active:null,view:'',edit:null,draftExercises:[]}));window.FitnessPlusCloudSaved?.()}catch(e){toast('Speichern in diesem Browser nicht möglich.')}}function toast(v){let t=$('#toast');t.textContent=v;t.style.display='block';clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>t.style.display='none',2600)}function render(){document.documentElement.dataset.theme=s.theme;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===s.tab));$('#page').innerHTML=s.tab==='home'?home():s.tab==='train'?train():s.tab==='calendar'?calendar():s.tab==='progress'?progress():settings();timerTick()}
function hdr(sub,title){return `<div class="eyebrow">${sub}</div><h1 class="title">${title}</h1>`}function all(){return [...presets,...s.workouts]}function find(id){return all().find(x=>String(x.id)===String(id))}function totals(k=day()){return s.history.filter(x=>x.day===k).reduce((a,x)=>({min:a.min+(+x.min||0),kcal:a.kcal+(+x.kcal||0)}),{min:0,kcal:0})}function ring(value,max,r,color){let c=2*Math.PI*r;return `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#f0f0f4" stroke-width="15"/><circle cx="100" cy="100" r="${r}" fill="none" stroke="${color}" stroke-width="15" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-Math.min(value/Math.max(1,max),1))}"/>`}function workoutRow(x){let n=x.exercises?.length||0;return `<div class="item"><div class="symbol">${x.id.startsWith('p')?'✦':'▣'}</div><div class="grow"><div class="itemname">${safe(x.name)}</div><div class="sub">${safe(x.type||'Workout')} · ${x.min} Min ${n?'· '+n+' Übungen':''}</div></div><button class="btn" data-start="${safe(x.id)}">Start</button>${!x.id.startsWith('p')?`<button class="btn" data-edit="${safe(x.id)}">✎</button>`:''}</div>`}
function home(){let t=totals(),dt=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});return hdr(dt,'Dein Tag. Dein Tempo.')+`<div class="card"><div class="row"><b>Deine Aktivität</b><span class="sub">Heute</span></div><div class="rings"><svg viewBox="0 0 200 200">${ring(t.kcal,s.goalCalories,81,'#ff5673')}${ring(t.min,s.goalMinutes,60,'#8585fb')}</svg><div class="middle"><span class="huge">${t.min}</span><span class="sub">Trainingsminuten</span></div></div><div class="metrics"><div class="metric"><b style="color:#fa5975;font-size:12px">● Energie</b><div class="value">${t.kcal} <span class="sub">kcal</span></div><div class="sub">Ziel ${s.goalCalories}</div></div><div class="metric"><b style="color:#8585fb;font-size:12px">● Bewegung</b><div class="value">${t.min} <span class="sub">Min</span></div><div class="sub">Ziel ${s.goalMinutes}</div></div></div></div><div class="card"><div class="row"><div><b>Wasser heute</b><div class="sub">${Number(s.water[day()]||0)} / ${s.waterGoal} ml</div></div><button class="btn" data-action="waterAdd">+ 250 ml</button></div><div class="progressTrack"><div class="progressFill" style="width:${Math.min(100,100*Number(s.water[day()]||0)/s.waterGoal)}%;background:#55a9e8"></div></div><button class="btn" data-tab="settings" style="margin-top:10px">Trinkziel bearbeiten</button></div>${fpHomePlannedCard()}`}

// "Heute": Keep only the expandable future plans list; the planner lives on Kalender.
let fpHomePlansExpanded=false;
function fpHomePlannedCard(){
 const upcoming=(Array.isArray(s.plans)?s.plans:[])
  .filter(p=>p&&typeof p.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.day)&&p.day>=day())
  .sort((a,b)=>a.day.localeCompare(b.day));
 const entries=upcoming.map(p=>{
  const workout=find(p.workoutId);
  const date=new Date(p.day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const minutes=Number(p.duration??workout?.min??0);
  return `<div class="item"><div class="symbol">📅</div><div class="grow"><b class="small">${safe(workout?.name||p.name||'Training')}</b><div class="sub">${safe(date)}${Number.isFinite(minutes)&&minutes>0?' · '+Math.round(minutes)+' Min':''}</div></div><button class="btn" type="button" data-fp-home-plan-day="${safe(p.day)}">Ansehen →</button></div>`;
 }).join('');
 return `<div class="card"><div class="row"><div><b>Geplante Trainings</b><div class="sub">${upcoming.length} ${upcoming.length===1?'anstehender Termin':'anstehende Termine'}</div></div><button class="btn" type="button" data-fp-home-plan-toggle="1" aria-expanded="${fpHomePlansExpanded}">${fpHomePlansExpanded?'Weniger':'Mehr'} ${fpHomePlansExpanded?'⌃':'⌄'}</button></div>${fpHomePlansExpanded?`<div style="margin-top:14px">${entries||'<p class="sub">Noch keine Trainings geplant. Du kannst im Kalender einen Plan erstellen.</p>'}</div><button class="btn" type="button" data-tab="calendar" style="margin-top:12px">Kalender öffnen →</button>`:''}</div>`;
}
function train(){if(s.active){let w=find(s.active.id)||s.active;return hdr('AKTIVES TRAINING',safe(w.name))+`<div class="card" style="text-align:center"><div class="sub">Deine Trainingszeit</div><div class="timer" id="timer">00:00</div><p class="sub">Der Timer stoppt automatisch, sobald deine Trainingszeit erreicht ist. Dann hörst du einen Signalton und deine Truhe erscheint direkt.</p></div>${(w.exercises||[]).length?`<div class="card"><b>Übungen & Sätze</b><p class="sub">Hake jeden Satz ab und passe deine Werte an.</p>${w.exercises.map((e,i)=>`<div class="exercise"><b class="small">${safe(e.name)}</b>${Array.from({length:Math.min(30,Math.max(1,Number(e.sets)||1))},(_,j)=>{let key=i+'-'+j;let entry=s.trainingSets[key]||{reps:e.reps,weight:e.weight,done:false};return `<div class="setrow"><button class="setcheck ${entry.done?'checked':''}" data-setdone="${key}">${entry.done?'✓':j+1}</button><label>Wdh.<input class="input slim" type="number" min="0" max="1000" data-setfield="${key}" data-field="reps" value="${entry.reps}"></label><label>kg<input class="input slim" type="number" min="0" max="1000" step="0.5" data-setfield="${key}" data-field="weight" value="${entry.weight}"></label></div>`}).join('')}</div>`).join('')}</div>`:''}<div class="card"><div class="row"><b>Pausentimer</b><b id="restClock">${s.restUntil>Date.now()?'läuft':'bereit'}</b></div><div class="chips"><button class="btn" data-rest="30">30 Sek.</button><button class="btn" data-rest="60">60 Sek.</button><button class="btn" data-rest="90">90 Sek.</button><button class="btn" data-rest="0">Stopp</button></div></div><div class="card" id="rewardTimeGate"><b>⏱ Truhen-Freigabe</b><p class="sub" id="rewardTimeText">${rewardTimeInfo().ready?'✓ Trainingszeit erreicht! Truhen sind jetzt freigeschaltet.':'Noch '+rewardTimeLabel(rewardTimeInfo().remaining)+' bis zu deinen Truhen. Du kannst vorher abschließen, bekommst dann aber keine Truhe.'}</p></div><button class="primary" data-action="finish">Training abschließen</button><button class="primary outline" data-action="cancel">Verwerfen</button>`}
if(s.view==='form')return form();if(s.view==='library')return libraryView();if(s.view==='planner')return plannerView();return hdr('DEINE WORKOUTS','Training gestalten.')+`<button class="primary" data-action="new">+ Eigenes Training erstellen</button><div class="row" style="margin-top:9px"><button class="btn" data-action="openLibrary">Übungsbibliothek</button><button class="btn" data-action="openPlanner">Wochenplan-Generator</button></div><h2 class="section">Meine Trainings</h2><div class="card">${s.workouts.length?s.workouts.map(workoutRow).join(''):'<div class="sub">Noch keine eigenen Trainings angelegt.</div>'}</div><h2 class="section">Vorgegebene Trainings</h2><div class="card">${presets.map(workoutRow).join('')}</div>`}
function form(){const x=s.edit?find(s.edit):null;let ex=s.draftExercises||[];return hdr('WORKOUT-EDITOR',x?'Training bearbeiten':'Eigenes Training erstellen')+`<form id="workoutForm" class="card"><label class="field">Name des Trainings</label><input required maxlength="70" class="input" name="name" placeholder="z. B. Oberkörper" value="${safe(x?.name||'')}"><label class="field">Trainingsart</label><select class="input" name="type">${['Kraft','Ausdauer','Beweglichkeit','Intervall','Sonstiges'].map(o=>`<option ${x?.type===o?'selected':''}>${o}</option>`).join('')}</select><div class="formgrid"><div><label class="field">Dauer (Min.)</label><input class="input" required name="min" type="number" min="1" max="600" value="${x?.min||30}"></div><div><label class="field">Kalorien-Schätzung</label><input class="input" required name="kcal" type="number" min="0" max="2500" value="${x?.kcal??200}"></div></div><h2 class="section">Übungen</h2><div id="exerciseList">${ex.map((e,i)=>`<div class="exercise"><div class="row"><b>${safe(e.name)}</b><button type="button" class="btn danger" data-exremove="${i}">Entfernen</button></div><div class="sub">${e.sets} Sätze × ${e.reps} Wdh. · ${e.weight} kg</div></div>`).join('')}</div><button class="btn" type="button" data-action="addExercise" style="width:100%;margin-top:12px">+ Übung hinzufügen</button><button type="submit" class="primary">Training speichern</button><button type="button" class="primary outline" data-action="formcancel">Abbrechen</button>${x?`<button type="button" class="primary outline danger" data-action="deleteWorkout">Training löschen</button>`:''}</form>`}
function calendar(){if(s.view==='planner')return plannerView();let [y,m]=s.calMonth.split('-').map(Number),first=new Date(y,m-1,1),offset=(first.getDay()+6)%7,days=new Date(y,m,0).getDate();let cells=Array.from({length:offset},()=>'<div></div>').concat(Array.from({length:days},(_,i)=>{let date=`${s.calMonth}-${String(i+1).padStart(2,'0')}`,done=s.history.some(h=>h.day===date),planned=s.plans.some(p=>p.day===date);return `<button class="day ${s.selectedDay===date?'selected':''} ${done?'done':''} ${planned?'planned':''}" data-date="${date}">${i+1}</button>`}));let picked=s.selectedDay;return hdr('TRAININGSPLANUNG','Dein Kalender.')+`<div class="card"><div class="row"><div><b>Dein Trainingsplan</b><div class="sub">Erstelle deinen persönlichen Wochenplan</div></div><button class="btn" data-action="openCalendarPlanner">Plan erstellen</button></div></div><div class="card"><div class="row"><button class="btn" data-month="-1">‹</button><b>${first.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</b><button class="btn" data-month="1">›</button></div><div class="calendar" style="margin:18px 0 10px">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="sub" style="text-align:center">${x}</div>`).join('')}${cells.join('')}</div><div class="sub">Punkt = absolviertes Training · Rahmen = geplant</div></div><div class="card"><b>${new Date(picked+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</b><div style="margin-top:12px">${s.plans.filter(p=>p.day===picked).map(p=>`<div class="item"><div class="grow"><b class="small">${safe(find(p.workoutId)?.name||p.name||'Training')}</b><div class="sub">Geplant</div></div><button class="btn" data-removeplan="${safe(p.id)}">Löschen</button></div>`).join('')||'<div class="sub">Noch kein Training geplant.</div>'}</div><form id="planForm"><input type="hidden" name="day" value="${picked}"><label class="field">Training für diesen Tag einplanen</label><select class="input" name="workoutId">${all().map(w=>`<option value="${safe(w.id)}">${safe(w.name)}</option>`).join('')}</select><button type="submit" class="primary">+ Termin hinzufügen</button></form></div>`}
function weekDates(offset=0){let monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7+offset*7);return Array.from({length:7},(_,i)=>{let d=new Date(monday);d.setDate(monday.getDate()+i);return d})}
function weekStats(offset=0){let dates=weekDates(offset),from=dkey(dates[0]),to=dkey(dates[6]),items=s.history.filter(h=>h.day>=from&&h.day<=to).sort((a,b)=>String(b.day).localeCompare(String(a.day)));return {dates,from,to,items,min:items.reduce((a,h)=>a+(+h.min||0),0),kcal:items.reduce((a,h)=>a+(+h.kcal||0),0)}}
function progress(){if(s.view==='records')return bestleistungen();if(s.view==='strength')return strengthView();let off=Math.max(-104,Math.min(0,Number(s.weekOffset)||0));s.weekOffset=off;let w=weekStats(off),before=weekStats(off-1),past=w.dates.map(d=>({label:d.toLocaleDateString('de-DE',{weekday:'short'}).replace('.',''),...totals(dkey(d))}));let max=Math.max(30,...past.map(x=>s.weekType==='minutes'?x.min:x.kcal)),fmt=d=>d.toLocaleDateString('de-DE',{day:'numeric',month:'short'});let delta=w.min-before.min;return hdr('DEINE ENTWICKLUNG','Deine Trainingswochen.')+`<div class="card"><div class="row"><button class="btn" data-week="-1" aria-label="Vorherige Woche">‹ Vorherige</button><div style="text-align:center"><b>${off===0?'Diese Woche':off===-1?'Letzte Woche':'Trainingswoche'}</b><div class="sub">${fmt(w.dates[0])} – ${fmt(w.dates[6])}</div></div><button class="btn" data-week="1" ${off===0?'disabled':''} aria-label="Nächste Woche">Nächste ›</button></div><div class="chips"><button class="chip ${s.weekType==='minutes'?'active':''}" data-chart="minutes">Minuten</button><button class="chip ${s.weekType==='calories'?'active':''}" data-chart="calories">Kalorien</button></div><div class="barview">${past.map(x=>{let v=s.weekType==='minutes'?x.min:x.kcal;return `<div class="barcol"><div class="bartrack"><div class="bar" style="height:${v?Math.max(4,100*v/max):0}%"></div></div><div style="margin-top:7px">${x.label}</div><b>${v}</b></div>`}).join('')}</div></div><button class="btn" data-action="showStrength">Kraftentwicklung →</button><button class="primary" data-action="showRecords">★ Meine Bestleistungen ansehen</button><div class="row"><h2 class="section">Trainings dieser Woche</h2>${off!==0?'<button class="btn" data-weekhome="1">Aktuelle Woche</button>':''}</div><div class="card">${w.items.length?w.items.map(h=>`<div class="item"><div class="symbol">✓</div><div class="grow"><b class="small">${safe(h.name||find(h.workoutId)?.name||'Training')}</b><div class="sub">${new Date(h.day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'long'})} · ${+h.kcal||0} kcal geschätzt</div>${(h.exercises||[]).map(e=>`<div class="sub">${safe(e.name)}: ${e.completedSets?.length??e.sets??0} Sätze${e.completedSets?.length?' · '+e.completedSets.map(t=>`${Number(t.reps)||0}×${Number(t.weight)||0} kg`).join(', '):' · '+(+e.reps||0)+' Wdh. · '+(+e.weight||0)+' kg'}</div>`).join('')}</div><b class="small">${+h.min||0} Min</b></div>`).join(''):'<div class="sub">Für diese Woche sind noch keine abgeschlossenen Trainings gespeichert. Mit „Vorherige“ kannst du frühere Wochen ansehen.</div>'}</div>`}
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
function settings(){if(s.view==='profile')return profileView();return hdr('DEINE APP','Ziele & Einstellungen.')+`<div class="card"><b>Dein persönliches Profil</b><p class="sub">${s.profile.nickname?'Hallo, '+safe(s.profile.nickname)+'!':'Lege deinen Trainingsfokus und deine Wochentage fest.'}</p><button class="btn" data-action="openProfile">Profil bearbeiten →</button></div>`+`<div class="card"><b>Tagesziele</b>${[['goalMinutes','Trainingsminuten',10,180,5],['goalCalories','Kalorien (geschätzt)',100,1200,50]].map(([key,label,min,max,step])=>`<label class="field" for="${key}">${label}: <span id="v-${key}">${s[key]}</span></label><input id="${key}" data-range="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}">`).join('')}</div><div class="card"><b>Darstellung</b><div class="chips"><button class="chip ${s.theme==='light'?'active':''}" data-theme="light">Hell</button><button class="chip ${s.theme==='dark'?'active':''}" data-theme="dark">Dunkel</button></div></div><div class="card"><b>Wasser-Tracker</b><p class="sub">Getrunken heute: ${Number(s.water[day()]||0)} ml</p><label class="field">Trinkziel: <span id="v-waterGoal">${s.waterGoal}</span> ml</label><input data-range="waterGoal" type="range" min="500" max="5000" step="250" value="${s.waterGoal}"><div class="chips"><button class="btn" data-action="waterAdd">+250 ml</button><button class="btn" data-action="waterMinus">−250 ml</button></div></div><div class="card"><b>Übungen & Planung</b><div class="chips"><button class="btn" data-action="openLibrary">Übungsbibliothek</button><button class="btn" data-action="openPlanner">Wochenplan erstellen</button></div></div>`}

const LIB=[['Kniebeugen','Beine','Stelle die Füße schulterbreit. Beuge kontrolliert Knie und Hüfte.'],['Ausfallschritte','Beine','Mach einen langen Schritt nach vorn, senke den Körper und drücke dich zurück.'],['Liegestütze','Brust','Spanne Rumpf und Gesäß an und senke den Körper kontrolliert.'],['Bankdrücken','Brust','Führe die Hantel kontrolliert zur Brust und drücke sie wieder hoch.'],['Rudern','Rücken','Ziehe die Ellbogen nach hinten und halte den Rücken neutral.'],['Klimmzüge','Rücken','Ziehe dich kontrolliert hoch, ohne zu schwingen.'],['Schulterdrücken','Schultern','Drücke die Gewichte stabil nach oben, ohne ins Hohlkreuz zu gehen.'],['Seitheben','Schultern','Hebe die Arme leicht gebeugt bis etwa Schulterhöhe.'],['Bizepscurls','Arme','Halte die Oberarme ruhig und beuge die Ellbogen.'],['Trizepsdrücken','Arme','Strecke die Ellbogen langsam gegen den Widerstand.'],['Plank','Core','Halte den Körper gerade und den Bauch aktiv.'],['Crunches','Core','Rolle den Oberkörper kontrolliert an, ohne am Kopf zu ziehen.'],['Radfahren','Ausdauer','Fahre in einem Tempo, bei dem du dich noch wohlfühlst.'],['Laufen','Ausdauer','Beginne locker und steigere die Dauer langsam.'],['Dehnen','Beweglichkeit','Bewege dich langsam und schmerzfrei in die Dehnung.']];
function libraryView(){let groups=['Alle','Beine','Brust','Rücken','Schultern','Arme','Core','Ausdauer','Beweglichkeit'];let q=(s.librarySearch||'').toLocaleLowerCase('de');return hdr('ÜBUNGEN ENTDECKEN','Übungsbibliothek.')+`<button class="btn" data-action="backTrain">← Zurück</button><input class="input" id="libSearch" placeholder="Übung suchen" value="${safe(s.librarySearch)}" style="margin:13px 0"><div class="chips">${groups.map(g=>`<button class="chip ${s.libraryFilter===g?'active':''}" data-libfilter="${g}">${g}</button>`).join('')}</div><div class="card">${LIB.filter(x=>(s.libraryFilter==='Alle'||s.libraryFilter===x[1])&&x[0].toLocaleLowerCase('de').includes(q)).map(x=>`<div class="exercise"><div class="row"><b>${safe(x[0])}</b><span class="sub">${x[1]}</span></div><p class="sub">${safe(x[2])}</p><button class="btn" data-useexercise="${safe(x[0])}">Als eigenes Training anlegen</button></div>`).join('')||'<p class="sub">Keine Übungen gefunden.</p>'}</div>`}
function plannerView(){return hdr('TRAINING NACH PLAN','Deine Trainingswoche.')+`<button class="btn" data-action="${s.tab==='calendar'?'backCalendar':'backTrain'}">← ${s.tab==='calendar'?'Zum Kalender':'Zurück'}</button><div class="card" style="margin-top:15px"><p class="sub">FitnessPlus legt passende Workouts für die kommenden sieben Tage an. Du kannst Termine danach im Kalender verändern oder löschen.</p><form id="generatorForm"><label class="field">Dein Fitnessziel</label><select class="input" name="goal"><option value="strength">Kraft aufbauen</option><option value="endurance">Ausdauer verbessern</option><option value="balanced">Allgemein fit bleiben</option></select><label class="field">Trainingstage pro Woche</label><select class="input" name="count"><option>2</option><option selected>3</option><option>4</option><option>5</option></select><label class="field">Bevorzugte Dauer</label><select class="input" name="duration"><option value="20">20 Minuten</option><option value="30" selected>30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option></select><button class="primary" type="submit">7-Tage-Plan erstellen</button></form></div><div class="note">Der Wochenplan ist ein allgemeiner Vorschlag, keine medizinische oder individuelle Trainingsberatung.</div>`}
function generatePlan(f){let d=new FormData(f),goal=String(d.get('goal')),count=Number(d.get('count')),duration=Number(d.get('duration'));let ids=goal==='strength'?['p0','p2','p0','p2','p0']:goal==='endurance'?['p1','p4','p1','p4','p1']:['p0','p1','p2','p0','p4'];let offsets=count===2?[1,4]:count===3?[0,2,5]:count===4?[0,2,4,6]:[0,1,3,4,6];for(let i=0;i<count;i++){let date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+offsets[i]);let w=find(ids[i]);s.plans.push({id:uid(),workoutId:w.id,name:w.name,day:dkey(date),duration})}save();s.tab='calendar';s.view='';render();toast(count+' Trainings geplant')}

function timerTick(){let rest=$('#restClock');if(rest){let seconds=Math.ceil((s.restUntil-Date.now())/1000);rest.textContent=seconds>0?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'bereit'}const el=$('#timer');if(el&&s.active){let info=rewardTimeInfo();if(!s.active.goalReached&&info.actualElapsed>=info.required&&window.FP76SessionReady!==false){handleGoalReached();info=rewardTimeInfo()}let sec=Math.max(0,Math.floor((info.elapsed)/1000));el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}}
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
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.theme){s.theme=b.dataset.theme;save();render();return}if(b.dataset.libfilter){s.libraryFilter=b.dataset.libfilter;render();return}if(b.dataset.useexercise){s.view='form';s.edit=null;s.tab='train';s.draftExercises=[{id:uid(),name:b.dataset.useexercise,sets:3,reps:10,weight:0}];render();return}if(b.dataset.rest!==undefined){s.restUntil=Date.now()+Number(b.dataset.rest)*1000;timerTick();return}if(b.dataset.setdone){let key=b.dataset.setdone;let [i,j]=key.split('-').map(Number);let w=find(s.active?.id);let ex=w?.exercises?.[i];if(ex){let x=s.trainingSets[key]||{reps:ex.reps,weight:ex.weight,done:false};x.done=!x.done;s.trainingSets[key]=x;render()}return}if(b.dataset.tab){s.tab=b.dataset.tab;s.view='';render();return}if(b.dataset.action==='new'){openForm();return}if(b.dataset.edit){openForm(b.dataset.edit);return}if(b.dataset.exremove!==undefined){s.draftExercises.splice(Number(b.dataset.exremove),1);render();return}if(b.dataset.start){let w=find(b.dataset.start);if(w){window.FP76Start?.();s.active={id:w.id,started:Date.now(),done:[],goalReached:false,stoppedAt:0};s.trainingSets={};s.restUntil=0;s.tab='train';s.view='';render()}return}if(b.dataset.done!==undefined&&s.active){let i=Number(b.dataset.done);s.active.done=s.active.done||[];s.active.done=s.active.done.includes(i)?s.active.done.filter(n=>n!==i):[...s.active.done,i];render();return}if(b.dataset.chart){s.weekType=b.dataset.chart;render();return}if(b.dataset.week){s.weekOffset=Math.max(-104,Math.min(0,(Number(s.weekOffset)||0)+Number(b.dataset.week)));render();return}if(b.dataset.weekhome){s.weekOffset=0;render();return}if(b.dataset.date){s.selectedDay=b.dataset.date;render();return}if(b.dataset.month){let [y,m]=s.calMonth.split('-').map(Number);let d=new Date(y,m-1+Number(b.dataset.month),1);s.calMonth=dkey(d).slice(0,7);s.selectedDay=dkey(d);render();return}if(b.dataset.removeplan){s.plans=s.plans.filter(p=>String(p.id)!==b.dataset.removeplan);save();render();return}if(b.dataset.removereminder){s.reminders=s.reminders.filter(x=>String(x.id)!==b.dataset.removereminder);save();render();return}switch(b.dataset.action){case 'showStrength':s.tab='progress';s.view='strength';render();break;case 'openProfile':s.tab='settings';s.view='profile';render();break;case 'backSettings':s.view='';render();break;case 'showRecords':s.tab='progress';s.view='records';render();break;case 'backProgress':s.view='';render();break;case 'openLibrary':s.tab='train';s.view='library';render();break;case 'openPlanner':s.tab='train';s.view='planner';render();break;case 'openCalendarPlanner':s.tab='calendar';s.view='planner';render();break;case 'backCalendar':s.tab='calendar';s.view='';render();break;case 'backTrain':s.tab='train';s.view='';render();break;case 'waterAdd':s.water[day()]=Math.min(20000,Number(s.water[day()]||0)+250);save();render();break;case 'waterMinus':s.water[day()]=Math.max(0,Number(s.water[day()]||0)-250);save();render();break;case 'addExercise':addExercise();break;case 'formcancel':s.view='';render();break;case 'deleteWorkout':if(confirm('Eigenes Training endgültig löschen?')){s.workouts=s.workouts.filter(w=>String(w.id)!==String(s.edit));s.view='';s.edit=null;save();render()}break;case 'cancel':if(confirm('Training verwerfen?')){s.active=null;render()}break;case 'finish':if(s.active){let w=find(s.active.id);let min=Math.max(1,Math.round((Date.now()-s.active.started)/60000));let kcal=Math.round((w?.kcal||0)*min/Math.max(1,w?.min||30));s.history.push({id:uid(),workoutId:s.active.id,name:w?.name||'Training',day:day(),min,kcal,exercises:(w?.exercises||[]).map((x,i)=>({...x,completedSets:Array.from({length:Number(x.sets)||0},(_,j)=>s.trainingSets[i+'-'+j]||{reps:x.reps,weight:x.weight,done:false}).filter(v=>v.done)}))});s.active=null;s.tab='progress';save();render();toast('Training gespeichert')}break;case 'export':doExport();break;case 'import':$('#importFile').click();break;}});
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
 {id:'boost2small',emoji:'⚡',name:'Doppel-Power',desc:'2× Level-Fortschritt bei den nächsten 3 wirklich abgeschlossenen Übungen.',price:300,multiplier:2,uses:3},
 {id:'boost2long',emoji:'🚀',name:'Trainings-Turbo',desc:'2× Level-Fortschritt bei den nächsten 8 wirklich abgeschlossenen Übungen.',price:650,multiplier:2,uses:8},
 {id:'boost3mega',emoji:'🔥',name:'Mega-XP',desc:'3× Level-Fortschritt bei den nächsten 5 wirklich abgeschlossenen Übungen.',price:1000,multiplier:3,uses:5}
];
// Server-Shop (auch ohne Login abrufbar): Preise und Angebote fuer alle Geraete.
let fpShopReady=false,fpShopLoading=null,fpShopError='';
async function fpShopRefresh(){
 if(fpShopLoading)return fpShopLoading;
 fpShopLoading=(async()=>{
  try{
   const response=await fetch('/api/shop',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('Shop-Server nicht erreichbar');
   const data=await response.json();
   if(!Array.isArray(data.items))throw Error('Shop-Daten fehlen');
   const items=data.items.filter(x=>x&&typeof x.id==='string'&&Number.isSafeInteger(x.price)&&x.price>0&&[2,3].includes(x.multiplier)&&Number.isInteger(x.uses)&&x.uses>0);
   levelBoosters.splice(0,levelBoosters.length,...items);
   fpShopReady=true;fpShopError='';
  }catch(err){fpShopError='Shop gerade nicht erreichbar. Bitte Internetverbindung pruefen.';}
  if(s.view==='store')render();
 })().finally(()=>{fpShopLoading=null});
 return fpShopLoading;
}
setTimeout(fpShopRefresh,700);
setInterval(()=>{if(!document.hidden)fpShopRefresh()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)fpShopRefresh()});
document.addEventListener('click',e=>{
 if(e.target.closest('button[data-action="storeOpen"],button[data-giftback],button[data-action="rewardScreen"]'))fpShopRefresh();
},true);
s.levelBoostMultiplier=[2,3].includes(Number(s.levelBoostMultiplier))?Number(s.levelBoostMultiplier):1;
s.levelBoostUses=Math.max(0,Math.floor(Number(s.levelBoostUses)||0));
if(!s.levelBoostUses)s.levelBoostMultiplier=1;
storeScreen=function(){
 const active=s.levelBoostUses>0?`${s.levelBoostMultiplier}\u00d7 Fortschritt \u00b7 ${s.levelBoostUses} ${s.levelBoostUses===1?'Uebung':'Uebungen'} uebrig`:'Zurzeit kein Booster aktiv';
 const products=levelBoosters.filter(i=>i.active!==false);
 return hdr('DIAMANTEN STORE','Deine Power-Ups.')+`<button class="btn" data-action="storeBack">\u2190 Zurueck</button>
 <section class="shopHubHead"><div class="shopHubTop"><span>&#128142; DIAMANTEN STORE</span><span class="shopHubBalance">&#128142; ${Math.floor(s.diamonds)}</span></div><h2>Level schneller erreichen</h2><p>Trainiere und verstaerke deinen Fortschritt mit Boostern.</p><div class="shopHubStatus">&#127942; Level ${levelNumber()} <span>\u00b7</span> ${s.levelExercises%3}/3 bis zum naechsten Level</div><div class="shopHubStatus">&#9889; ${active}</div></section>
 <div class="shopQuickGrid"><button class="shopQuick giftQuick" data-giftmenu="1"><span>&#127873;</span><b>Geschenke</b><small>Diamanten verschenken</small></button></div>
 <div class="shopSectionHead"><div><span class="eyebrow">POWER-UPS</span><h2 class="section">Level-Booster</h2></div><span class="shopCount">${products.length} Produkte</span></div>
 ${!fpShopReady?`<p class="sub" role="status">${safe(fpShopError||'Shop-Angebote werden geladen ...')}</p>`:''}
 <div class="boosterGrid shopNewGrid">${products.map(i=>{const discount=Number(i.discountPercent)||0;const crossed=discount>0?`<span class="sub" style="text-decoration:line-through;margin-right:8px">${Number(i.basePrice)} &#128142;</span><b style="color:#068a60">-${discount}%</b>`:'';return `<article class="boosterProduct shopNewProduct"><div class="boosterEmoji">${safe(i.emoji)}</div><div class="grow"><b>${safe(i.name)}</b><p>${safe(i.desc)}</p>${crossed?`<div>${crossed}</div>`:''}<strong>${Number(i.price)} &#128142;</strong></div><button class="shopButton" data-boostbuy="${safe(i.id)}" ${!fpShopReady||s.diamonds<i.price||s.levelBoostUses>0?'disabled':''}>${!fpShopReady?'Laden ...':s.levelBoostUses>0?'Booster aktiv':s.diamonds<i.price?'Zu wenig Diamanten':'Kaufen'}</button></article>`}).join('')||'<p class="sub">Zurzeit gibt es keine Booster im Shop.</p>'}</div>
 <p class="shopNotice">Alle Preise kommen direkt vom FitnessPlus-Server. Booster wirken nur bei abgeschlossenen Uebungen. Es handelt sich um virtuelle Diamanten ohne Geldwert.</p>`;
};
const levelStoreHome=home;
home=function(){return levelStoreHome().replace('Hol dir neue Designs und Titel.','Hol dir Level-Booster.').replace('💎 Diamanten-Store','💎 Diamanten Store')};
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-boostbuy]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const i=levelBoosters.find(x=>x.id===b.dataset.boostbuy);if(!i)return;
 if(!fpShopReady){toast('Shoppreise werden geladen. Bitte warten.');fpShopRefresh();return}
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
// Streak zaehlt nur nach erfolgreicher Abholung der Tagesbelohnung.
// Eine Unterbrechung setzt die aktuelle Serie zurueck, nicht den Rekord.
function fpDailyYesterday(today){
 const date=new Date(today+'T12:00:00');
 date.setDate(date.getDate()-1);
 return dkey(date);
}
function dailyInfo(){
 const today=day();
 const reward=s.dailyReward&&typeof s.dailyReward==='object'?s.dailyReward:{};
 const last=String(reward.last||'');
 const saved=Math.max(0,Math.floor(Number(reward.streak)||0));
 const already=last===today;
 const continuing=last===today||last===fpDailyYesterday(today);
 const streak=continuing?saved:0;
 const nextStreak=already?streak:(last===fpDailyYesterday(today)?streak+1:1);
 const best=Math.max(Math.max(0,Math.floor(Number(reward.best)||0)),saved);
 const amount=10+5*Math.min(6,Math.max(0,nextStreak-1));
 return {today,already,streak,nextStreak,best,reward:amount};
}
function fpDailyRecordClaim(info,diamonds){
 const previous=s.dailyReward&&typeof s.dailyReward==='object'?s.dailyReward:{};
 const best=Math.max(0,Math.floor(Number(previous.best)||0),Math.floor(Number(previous.streak)||0),info.nextStreak);
 s.dailyReward={...previous,last:info.today,streak:info.nextStreak,best,
  total:Math.max(0,Number(previous.total)||0)+Math.max(0,Number(diamonds)||0)};
}
function dailyCard(){
 const i=dailyInfo();
 const online=window.FP76Online===true;
 const amount=online?5:i.reward; // Der Online-Server vergibt aktuell 5 Diamanten je Tag.
 const days=i.streak===1?'Tag':'Tage';
 const streakMessage=i.already?'Heute abgeholt!':i.streak?'Heute abholen und Streak auf '+i.nextStreak+' erhoehen!':'Hole deine Belohnung ab und starte deine Streak!';
 return `<div class="card dailyCard">
  <div class="row"><div><div class="dailyEyebrow">🎁 TAGESBELOHNUNG</div>
   <h2 class="dailyTitle">${i.already?'Heute abgeholt!':'Dein täglicher Bonus'}</h2>
   <div class="sub">${i.already?'Komm morgen wieder!':'Hol dir '+amount+' Diamanten'}</div></div>
   <div class="dailyGem">💎</div></div>
  <div class="fpRewardStreak" aria-label="Aktuelle Tages-Streak: ${i.streak} ${days}">
   <span class="fpRewardStreakFlame" aria-hidden="true">🔥</span>
   <div><b>Deine Tages-Streak: ${i.streak} ${days}</b><div class="sub">${streakMessage}</div></div>
  </div>
  <div class="dailyDays">${Array.from({length:7},(_,j)=>`<div class="dailyDay ${j<i.streak?'done':''}"><b>${j+1}</b><span>${j<i.streak?'✓':'◆'}</span></div>`).join('')}</div>
  <button class="primary" data-dailyclaim="1" ${i.already?'disabled':''}>${i.already?'✓ Für heute eingelöst':'🎁 '+amount+' Diamanten abholen'}</button>
  <p class="sub">Deine Streak steigt nur, wenn du deine Tagesbelohnung abholst. Verpasst du einen Tag, beginnt sie wieder bei 1. Dein Streak-Rekord bleibt im Profil erhalten.</p>
 </div>`;
}
function fpDailyStreakStyles(){
 if(document.getElementById('fpDailyStreakStyles'))return;
 const css=document.createElement('style');css.id='fpDailyStreakStyles';
 css.textContent=`
  .fpRewardStreak{display:flex;align-items:center;gap:12px;padding:13px;margin:14px 0 5px;border-radius:15px;background:linear-gradient(110deg,rgba(255,159,68,.16),rgba(255,205,138,.06));border:1px solid rgba(229,129,42,.2)}
  .fpRewardStreakFlame{font-size:30px;flex:0 0 auto}
  .fpRewardStreak b{font-size:16px}
  .fpRewardStreak .sub{margin-top:4px;font-size:12px;line-height:1.4}
 `;
 document.head.appendChild(css);
}
fpDailyStreakStyles();
const homeBeforeDaily=home;
home=function(){return dailyCard()+homeBeforeDaily()};
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-dailyclaim]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(window.FP76SessionReady===false){toast('Bitte kurz warten, dein Konto wird geladen.');return}
 const i=dailyInfo();
 if(i.already){toast('Die heutige Belohnung hast du bereits abgeholt.');return}
 s.diamonds+=i.reward;
 fpDailyRecordClaim(i,i.reward);
 save();render();
 toast('🎉 +'+i.reward+' Diamanten! 🔥 Streak: '+i.nextStreak+' Tage');
},true);
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

// FitnessPlus: events are published for every user by the admin panel and fetched
// from the SAME online server that stores them. No independent events.json file.
let liveEvents={id:'',active:false}, eventLoading=false;
let fpWheelConfig={maxSpinsPerDay:1,prizes:[{diamonds:5,weight:40},{diamonds:10,weight:25},{diamonds:15,weight:18},{diamonds:20,weight:12},{diamonds:30,weight:5}]};
let fpEventAccount={authenticated:false,wheelUsed:false,wheelSpinsUsed:0,wheelSpinsRemaining:1,giftClaimed:false,progress:0,tiers:[]};
let fpEventBusy=false;
const FP_EVENT_SEEN='fitnessplus-last-online-event-v1';
const fpEventEnabled=x=>!!(x&&(x.wheel||x.season||x.doubleXp||Number(x.giftDiamonds)>0));
function validEvent(x){return !!(x&&typeof x==='object'&&Number.isFinite(Number(x.updatedAt))&&Number(x.updatedAt)>0&&fpEventEnabled(x))}
function activeEvent(){return validEvent(liveEvents)?liveEvents:null}
function fpEventName(e){const bits=[];if(e.doubleXp)bits.push('Doppel-XP');if(e.wheel)bits.push('Glücksrad');if(e.season)bits.push('Saison-Pass');if(Number(e.giftDiamonds)>0)bits.push('Geschenk');return bits.join(' · ')||'FitnessPlus-Event'}
function fpEventBanner(){
 let bar=document.getElementById('fpOnlineEventBanner');const e=activeEvent();
 if(!e){bar?.remove();return}
 if(!bar){bar=document.createElement('button');bar.type='button';bar.id='fpOnlineEventBanner';bar.setAttribute('aria-label','Aktives FitnessPlus-Event öffnen');document.body.append(bar)}
 bar.textContent='🎉 EVENT AKTIV · '+fpEventName(e)+'  ›';
 Object.assign(bar.style,{position:'fixed',bottom:'calc(83px + env(safe-area-inset-bottom, 0px))',left:'12px',right:'12px',width:'calc(100% - 24px)',maxWidth:'520px',margin:'0 auto',zIndex:'1001',padding:'12px 14px',borderRadius:'15px',background:'linear-gradient(110deg,#5b37d6,#a03ac9)',color:'white',fontWeight:'750',fontSize:'13px',textAlign:'center',border:'1px solid rgba(255,255,255,.25)',boxShadow:'0 6px 20px rgba(0,0,0,.20)',cursor:'pointer'});
 bar.onclick=()=>{s.tab='home';s.view='events';render();refreshEvents()};
}
async function refreshEvents(){
 if(eventLoading)return;eventLoading=true;
 try{
  const r=await fetch('/api/events',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('Event-Server nicht erreichbar');
  const response=await r.json();const candidate=response.events||{};
  if(response.wheelConfig&&Array.isArray(response.wheelConfig.prizes))fpWheelConfig=response.wheelConfig;
  const previousId=activeEvent()?.updatedAt||0;
  liveEvents=validEvent(candidate)?candidate:{id:'',active:false};
  const e=activeEvent();
  if(e){
   const eventId=String(e.updatedAt);
   try{if(localStorage.getItem(FP_EVENT_SEEN)!==eventId){
    localStorage.setItem(FP_EVENT_SEEN,eventId);
    toast('🎉 Neues Event: '+fpEventName(e)+'!');
   }}catch(_e){}
  }
  fpEventBanner();
  // Personal claims are server-controlled, never awarded in localStorage.
  try{
   const status=await fetch('/api/game/events',{credentials:'same-origin',cache:'no-store'});
   if(status.ok){const details=(await status.json()).events||{};
    fpEventAccount={authenticated:true,wheelUsed:!!details.wheelUsed,wheelSpinsUsed:Number(details.wheelSpinsUsed)||0,wheelSpinsRemaining:Number.isInteger(details.wheelSpinsRemaining)?details.wheelSpinsRemaining:details.wheelUsed?0:1,giftClaimed:!!details.giftClaimed,progress:Number(details.progress)||0,tiers:Array.isArray(details.tiers)?details.tiers:[]};
   }else if(status.status===401){fpEventAccount={authenticated:false,wheelUsed:false,wheelSpinsUsed:0,wheelSpinsRemaining:fpWheelConfig.maxSpinsPerDay,giftClaimed:false,progress:0,tiers:[]}}
  }catch(_e){/* Keep the most recent account status for temporary network errors. */}
  if(!fpWheelAnimating&&(s.view==='events'||previousId!==(e?.updatedAt||0)))render();
 }catch(err){
  // On a connection interruption keep the most recently confirmed event visible.
  if(s.view==='events')fpEventBanner();
 }finally{eventLoading=false}
}
function eventDoubleXP(){return activeEvent()?.doubleXp?2:1}
function seasonRecordExercise(){/* Online season XP is tracked securely on the server. */}
function fpEventLogin(){
 if(typeof window.FitnessPlusOpenOnline==='function'){window.FitnessPlusOpenOnline();return}
 window.location.assign('/online.html');
}
// FitnessPlus: sichtbares, servergesteuertes Gluecksrad.
// Die Sektoren folgen denselben Gewichten, die der Server bei der Ziehung verwendet.
let fpWheelRotation=0, fpWheelLastWin=null, fpWheelAnimating=false;
const FP_WHEEL_PALETTE=['#7c3aed','#0891b2','#ea580c','#db2777','#0d9488','#4f46e5','#b45309','#be185d'];
function fpWheelSectors(){
 const prizeList=Array.isArray(fpWheelConfig.prizes)?fpWheelConfig.prizes:[];
 const valid=prizeList.filter(x=>x&&Number.isSafeInteger(x.diamonds)&&x.diamonds>0&&Number.isSafeInteger(x.weight)&&x.weight>0);
 const total=valid.reduce((sum,p)=>sum+p.weight,0);
 let position=0;
 return valid.map((p,i)=>{
  const start=position,angle=360*p.weight/total;
  position+=angle;
  return {diamonds:p.diamonds,weight:p.weight,index:i,start,end:position,center:start+angle/2,angle,color:FP_WHEEL_PALETTE[i%FP_WHEEL_PALETTE.length],percentage:100*p.weight/total};
 });
}
function fpWheelPercent(pct){
 return pct.toLocaleString('de-DE',{maximumFractionDigits:pct<1?2:1})+' %';
}
function fpWheelPolar(radius,degree){
 const radians=degree*Math.PI/180;
 return {x:Math.sin(radians)*radius,y:-Math.cos(radians)*radius};
}
function fpWheelSvg(sectors){
 const r=145;
 const wedges=sectors.map(part=>{
  const a=fpWheelPolar(r,part.start),b=fpWheelPolar(r,part.end);
  const large=part.angle>180?1:0;
  const label=fpWheelPolar(part.angle<22?110:91,part.center);
  const size=part.angle<18?9:part.angle<30?11:part.diamonds>=1000?12:15;
  const path=`M0 0 L${a.x.toFixed(3)} ${a.y.toFixed(3)} A${r} ${r} 0 ${large} 1 ${b.x.toFixed(3)} ${b.y.toFixed(3)} Z`;
  return `<path d="${path}" fill="${part.color}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`+
   `<text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" fill="#fff" stroke="#243049" stroke-opacity=".32" stroke-width="2.5" paint-order="stroke" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800">${part.diamonds}</text>`+
   (part.angle>=17?`<text x="${label.x.toFixed(2)}" y="${(label.y+size*1.10).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${Math.max(10,size-1)}">💎</text>`:'');
 }).join('');
 return `<svg viewBox="-155 -155 310 310" class="fp-wheel-svg" role="img" aria-label="Glücksrad mit ${sectors.length} Gewinnen">${wedges}<circle cx="0" cy="0" r="146" fill="none" stroke="#fef3c7" stroke-width="4"/></svg>`;
}
function fpWheelWidget(){
 const sectors=fpWheelSectors();
 if(sectors.length<2)return '<p class="sub">Die Glücksrad-Gewinne werden geladen.</p>';
 const wins=sectors.map(p=>`<div class="fp-wheel-odds-entry" role="listitem"><span class="fp-wheel-swatch" style="background:${p.color}"></span><span class="fp-wheel-prize">${p.diamonds} 💎</span><strong>${fpWheelPercent(p.percentage)}</strong></div>`).join('');
 return `<div class="fp-wheel-wrap"><div class="fp-wheel-rotator" id="fpWheelSpinner" style="transform:rotate(${fpWheelRotation}deg)">${fpWheelSvg(sectors)}</div><div class="fp-wheel-pointer" aria-hidden="true"></div><div class="fp-wheel-center" aria-hidden="true">★</div></div>`+
  `<div class="fp-wheel-odds"><b>💎 Gewinne & Gewinnchancen</b><div class="fp-wheel-odds-grid" role="list">${wins}</div><div class="sub" style="margin-top:8px">Die Feldgrößen zeigen die Gewinnchancen. Prozentangaben sind gerundet.</div></div>`+
  `<div id="fpWheelSpinResult" class="fp-wheel-result" role="status" aria-live="polite">${fpWheelAnimating?'🎡 Das Glücksrad dreht sich …':fpWheelLastWin!==null?'🎉 Du hast '+Number(fpWheelLastWin)+' 💎 gewonnen!':''}</div>`;
}
function fpWheelStyles(){
 if(document.getElementById('fpWheelStyles'))return;
 const style=document.createElement('style');style.id='fpWheelStyles';
 style.textContent=`
 .fp-wheel-wrap{position:relative;width:min(100%,320px);aspect-ratio:1;margin:16px auto 20px;isolation:isolate}
 .fp-wheel-rotator{position:absolute;inset:9px;border:9px solid #ffcf54;border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 10px 28px rgba(66,31,120,.25),inset 0 0 0 2px #fff;will-change:transform}
 .fp-wheel-svg{width:100%;height:100%;display:block}
 .fp-wheel-pointer{position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:31px;height:42px;background:#f9b925;clip-path:polygon(0 0,100% 0,50% 100%);filter:drop-shadow(0 4px 3px rgba(0,0,0,.35));z-index:3}
 .fp-wheel-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6d4,#f6ba3c);border:5px solid #fff4c0;box-shadow:0 3px 9px rgba(0,0,0,.25);display:grid;place-items:center;color:#725017;font-size:23px;font-weight:900}
 .fp-wheel-odds{margin:14px 0 8px;padding:14px;border-radius:16px;background:#f5f3ff;color:#24163f}
 .fp-wheel-odds-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
 .fp-wheel-odds-entry{display:flex;align-items:center;gap:7px;background:white;border-radius:11px;padding:9px 8px;font-size:13px;min-width:0}
 .fp-wheel-odds-entry strong{margin-left:auto;white-space:nowrap;color:#5b21b6;font-size:12px}
 .fp-wheel-prize{white-space:nowrap;font-weight:750}
 .fp-wheel-swatch{height:13px;width:13px;flex:0 0 13px;border-radius:50%;border:1px solid rgba(0,0,0,.13)}
 .fp-wheel-result{font-weight:800;text-align:center;color:#6d28d9;min-height:22px;margin:14px 0 2px;font-size:17px}
 @media (max-width:350px){.fp-wheel-odds-grid{grid-template-columns:1fr}.fp-wheel-wrap{width:min(100%,285px)}}
 @media (prefers-reduced-motion:reduce){.fp-wheel-rotator{animation:none}}
 `;document.head.appendChild(style);
}
fpWheelStyles();
async function fpWheelSpinResult(prize){
 // Das Guthaben wurde bereits durch den Server gebucht. Die Animation zeigt nur das Ergebnis.
 let arcs=fpWheelSectors();
 if(!arcs.some(x=>x.diamonds===prize)){
  await refreshEvents();arcs=fpWheelSectors();
  // Bei zeitgleich geaenderter Admin-Konfiguration bleibt der Gewinn gueltig.
  if(!arcs.some(x=>x.diamonds===prize))return;
  render();
 }
 const match=arcs.find(x=>x.diamonds===prize);
 const wheel=document.getElementById('fpWheelSpinner');
 if(!wheel)return;
 const current=((fpWheelRotation%360)+360)%360;
 const desired=((360-match.center)%360+360)%360;
 const delta=(desired-current+360)%360;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const duration=reduced?30:4800;
 fpWheelRotation+=360*(reduced?1:6)+delta;
 wheel.style.transition=`transform ${duration}ms cubic-bezier(.12,.73,.13,1)`;
 // Zwei Frames erlauben Safari und Samsung Internet, den Startwinkel zu zeichnen.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 wheel.style.transform=`rotate(${fpWheelRotation}deg)`;
 await new Promise(resolve=>setTimeout(resolve,duration+90));
}

function eventView(){
 const e=activeEvent();let html=hdr('FITNESSPLUS EVENTS','Events & Belohnungen.')+
  '<button class="btn" data-eventback="1">← Zurück</button>';
 if(!e)return html+'<div class="card"><b>Gerade kein Event aktiv</b><p class="sub">Starte im Admin-Panel ein Event. Es erscheint dann hier für alle Nutzer.</p><button class="btn" data-eventrefresh="1">Aktualisieren</button></div>';
 html+='<div class="card"><div style="font-size:35px">🎉</div><b>Event läuft!</b><p class="sub">'+safe(fpEventName(e))+'</p></div>';
 if(e.doubleXp)html+='<div class="card"><b>⚡ Doppel-XP aktiv</b><p class="sub">Online bestätigte Übungen geben doppelten Fortschritt, sofern kein anderer Booster aktiv ist.</p></div>';
 if(e.wheel){
  const used=fpEventAccount.authenticated&&fpEventAccount.wheelSpinsRemaining<=0;
  const spinsLeft=fpEventAccount.authenticated?fpEventAccount.wheelSpinsRemaining:fpWheelConfig.maxSpinsPerDay;
  html+='<div class="card"><h2>🎡 Dein Glücksrad</h2><p class="sub">Heute noch '+spinsLeft+' von '+fpWheelConfig.maxSpinsPerDay+' Drehungen übrig. Neuer Tag ab 00:00 Uhr UTC.</p>'+fpWheelWidget()+'<button class="primary" data-eventspin="1" '+(used||fpEventBusy?'disabled':'')+'>'+(fpWheelAnimating?'🎡 Das Rad dreht sich …':used?'✓ Für heute alle Drehungen verbraucht':fpEventAccount.authenticated?'🎡 Jetzt drehen':'🔑 Anmelden und Glücksrad drehen')+'</button></div>';
 }
 const gift=Math.floor(Number(e.giftDiamonds)||0);
 if(gift>0)html+='<div class="card"><b>🎁 Geschenk für alle</b><p class="sub">'+gift+' 💎 einmalig pro Event abholen.</p><button class="primary" data-eventgift="1" '+(fpEventAccount.giftClaimed?'disabled':'')+'>'+(fpEventAccount.giftClaimed?'✓ Geschenk abgeholt':fpEventAccount.authenticated?'🎁 '+gift+' Diamanten einlösen':'🔑 Anmelden und Geschenk einlösen')+'</button></div>';
 if(e.season){
  html+='<div class="card"><b>🏆 Saison-Pass</b><p class="sub">'+fpEventAccount.progress+' abgeschlossene Online-Übungen seit Eventbeginn</p>'+
   (fpEventAccount.tiers.length?fpEventAccount.tiers.map(t=>'<div class="item"><div class="grow"><b>'+Number(t.at)+' Übungen</b><div class="sub">'+Number(t.diamonds)+' 💎</div></div><button class="btn" data-seasonclaim="'+Number(t.at)+'" '+(t.claimed||fpEventAccount.progress<Number(t.at)?'disabled':'')+'>'+(t.claimed?'✓ Abgeholt':fpEventAccount.progress<Number(t.at)?'Noch gesperrt':'Einlösen')+'</button></div>').join(''):'<p class="sub">Melde dich an, um deine Stufen zu sehen.</p>')+'</div>';
 }
 return html+'<p class="sub">Alle Event-Belohnungen werden einmalig über dein Online-Konto vergeben.</p>';
}
const previousEventsHome=home;home=function(){return previousEventsHome()+'<div class="card"><div class="row"><div><b>🎉 FitnessPlus Events</b><div class="sub">Geschenke · Doppel-XP · Saison-Pass · Glücksrad</div></div><button class="btn" data-openevents="1">Ansehen →</button></div></div>'};
const previousEventsRender=render;render=function(){previousEventsRender();if(s.view==='events')$('#page').innerHTML=eventView()};
async function fpEventClaim(endpoint,payload){
 const r=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})});
 const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(result.error||'Event konnte nicht eingelöst werden');
 return result;
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.openevents!==undefined){e.preventDefault();e.stopImmediatePropagation();s.tab='home';s.view='events';render();refreshEvents();return}
 if(b.dataset.eventback!==undefined){e.preventDefault();e.stopImmediatePropagation();s.view='';render();return}
 if(b.dataset.eventrefresh!==undefined){e.preventDefault();e.stopImmediatePropagation();refreshEvents();return}
 const isWheel=b.dataset.eventspin!==undefined,isGift=b.dataset.eventgift!==undefined,isTier=b.dataset.seasonclaim!==undefined;
 if(!isWheel&&!isGift&&!isTier)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(fpEventBusy)return;
 if(!fpEventAccount.authenticated){fpEventLogin();return}
 const active=activeEvent();if(!active){toast('Dieses Event ist nicht mehr aktiv.');refreshEvents();return}
 if(isWheel&&(!active.wheel||fpEventAccount.wheelSpinsRemaining<=0))return;
 if(isGift&&(!(Number(active.giftDiamonds)>0)||fpEventAccount.giftClaimed))return;
 if(isTier&&!active.season)return;
 fpEventBusy=true;b.disabled=true;
 try{
  let result;
  if(isWheel)result=await fpEventClaim('/api/game/wheel');
  else if(isGift)result=await fpEventClaim('/api/game/event/gift');
  else result=await fpEventClaim('/api/game/season/claim',{tier:Number(b.dataset.seasonclaim)});
  if(result.user){s.diamonds=result.user.diamonds;s.levelExercises=result.user.xp}
  if(isWheel){
   fpWheelAnimating=true;fpWheelLastWin=null;
   if(Number.isSafeInteger(result.spinsRemaining))fpEventAccount.wheelSpinsRemaining=result.spinsRemaining;
   const statusEl=document.getElementById('fpWheelSpinResult');
   if(statusEl)statusEl.textContent='🎡 Das Glücksrad dreht sich …';
   await fpWheelSpinResult(Number(result.diamonds));
   fpWheelAnimating=false;fpWheelLastWin=Number(result.diamonds);
  }
  await refreshEvents();
  render();
  if(isWheel)toast('🎡 Gewonnen: +'+result.diamonds+' 💎!');
  else toast('🎁 Eventbelohnung: +'+result.diamonds+' 💎!');
 }catch(err){fpWheelAnimating=false;toast(err.message||'Einlösen fehlgeschlagen');await refreshEvents();}
 finally{fpEventBusy=false;if(s.view==='events')render();}
},true);
const exportBeforeEvents=doExport;doExport=function(){const data=JSON.parse(localStorage.getItem(KEY)||'{}');const payload={app:'FitnessPlus',version:'6.8',exportedAt:new Date().toISOString(),data:{...data,eventClaims:s.eventClaims,seasonProgress:s.seasonProgress,eventWheel:s.eventWheel}};let blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='FitnessPlus-Backup-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('#importFile').addEventListener('change',async e=>{try{let f=e.target.files?.[0];if(!f)return;let p=JSON.parse(await f.text());if(p.app!=='FitnessPlus'||!p.data)return;let d=p.data;s.eventClaims=d.eventClaims&&typeof d.eventClaims==='object'?d.eventClaims:{};s.seasonProgress=d.seasonProgress&&typeof d.seasonProgress==='object'?d.seasonProgress:{};s.eventWheel=d.eventWheel&&typeof d.eventWheel==='object'?d.eventWheel:{};save();render()}catch(_){}},true);
setTimeout(refreshEvents,900);setInterval(refreshEvents,12000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEvents()});

const normalOldSettings=settings;
settings=function(){return normalOldSettings()+`<div class="card"><b>🌐 FitnessPlus Online</b><p class="sub">Die Online-Verwaltung läuft getrennt von dieser App. Dein lokaler Spielstand wird nicht automatisch übertragen.</p><a href="https://fitnessplus-server.onrender.com/online.html" target="_blank" rel="noopener noreferrer" class="primary" style="display:block;text-align:center;text-decoration:none">Online-Konto öffnen ↗</a></div>`};
function checkReminders(){let now=new Date(),stamp=dkey(now)+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');let any=false;for(let r of s.reminders){if(!r.shown&&`${r.date}T${r.time}`<=stamp){r.shown=true;any=true;toast('Erinnerung: Zeit für dein FitnessPlus-Training!')}}if(any)save()}
setInterval(timerTick,100);setInterval(()=>{const msg=$('#rewardTimeText');if(msg&&s.active){const g=rewardTimeInfo();msg.textContent=g.ready?'✓ Trainingszeit erreicht! Truhen sind jetzt freigeschaltet.':'Noch '+rewardTimeLabel(g.remaining)+' bis zu deinen Truhen. Du kannst vorher abschließen, bekommst dann aber keine Truhe.';}},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)timerTick()});window.addEventListener('pageshow',timerTick);if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

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
const merge=(remote,user)=>{
 // Cloud-Spielstand darf ein lokal laufendes Workout samt Timer/Saetzen nicht loeschen.
 const live=s.active;
 let ui={tab:live?'train':s.tab,theme:s.theme,active:live,trainingSets:s.trainingSets,restUntil:s.restUntil,view:live?'':s.view,edit:null,draftExercises:[]};
 s={...s,...remote,...ui,diamonds:user.diamonds,levelExercises:user.xp};
 // Nicht die kurzlebige aktive Session in den normalen Cloud-Spielstand mischen.
 try{localStorage.setItem(KEY,JSON.stringify({...s,active:null}))}catch{}
 render();
};
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
 ready=true;window.FP76Online=true;window.FP76Refresh?.();window.FP76EnsureRun?.();conflict=false;setStatus('☁️ Synchronisiert');
 }catch(e){if(e.status===401){loggedIn=false;ready=false;window.FP76Online=false;setStatus('☁️ Anmelden')}else setStatus('☁️ Verbindungsfehler')}finally{busy=false;window.FP76SessionReady=true;if(s.active)timerTick()}}
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
try{
 const cached=JSON.parse(localStorage.getItem(ONLINE_RUN_KEY)||'null');
 if(s.active&&cached&&cached.started===s.active.started&&typeof cached.runId==='string')runId=cached.runId;
}catch(_){}

const req=async (url,data)=>{let r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});let x=await r.json();if(!r.ok)throw Error(x.error||'Server nicht erreichbar');return x};
const status=async()=>{try{let r=await fetch('/api/game',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;let x=await r.json();s.diamonds=x.user.diamonds;s.levelExercises=x.user.xp;s.levelBoostMultiplier=x.booster.multiplier;s.levelBoostUses=x.booster.uses;s.rewardBoxes=x.chests.map(t=>({id:t.id,name:'Online-Truhe'}));render()}catch{}};
window.FP76Refresh=status;
window.addEventListener('focus',()=>{if(window.FP76Online)status()});
window.FP76EnsureRun=()=>{
 if(!window.FP76Online||!s.active||runId||starting)return;
 const started=s.active.started;
 starting=req('/api/game/start').then(x=>{
  if(!s.active||s.active.started!==started)return;
  runId=x.runId;
  try{localStorage.setItem(ONLINE_RUN_KEY,JSON.stringify({runId,started}))}catch(_){}
 }).catch(e=>toast('Online-Training nicht gestartet: '+e.message)).finally(()=>{starting=null});
};
window.FP76Start=()=>{
 if(!window.FP76Online)return;
 runId='';try{localStorage.removeItem(ONLINE_RUN_KEY)}catch(_){}
 starting=req('/api/game/start').then(x=>{
  runId=x.runId;
  // Start-Klick legt s.active unmittelbar nach FP76Start an.
  try{if(s.active&&runId)localStorage.setItem(ONLINE_RUN_KEY,JSON.stringify({runId,started:s.active.started}))}catch(_){}
 }).catch(e=>toast('Online-Training nicht gestartet: '+e.message));
};
window.FP76Exercise=async claim=>{
 if(!window.FP76Online||s.levelExerciseClaims[claim]||pending.has(claim))return;
 const ix=Number(String(claim).split(':').pop());if(!Number.isInteger(ix))return;
 pending.add(claim);
 try{if(!runId&&!starting)window.FP76EnsureRun();if(starting)await starting;if(!runId)throw Error('Starte das Training bei bestehender Verbindung neu');
  const x=await req('/api/game/exercise',{runId,exerciseIndex:ix});
  s.levelExerciseClaims[claim]=true;s.levelExercises=x.user.xp;
  s.rewardBoxes.push({id:x.chestId,name:'Online-Truhe'});
  await status();save();render();showEarnedBox({id:x.chestId,name:'Online-Truhe'});toast('✅ +'+x.xpGain+' XP und eine Online-Truhe!');return true;
 }catch(e){toast(e.message);return false}finally{pending.delete(claim)}
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
  if(!fpShopReady){toast('Shop wird geladen. Bitte kurz warten.');fpShopRefresh();return;}
  if(!confirm(item.name+' für '+item.price+' Diamanten online kaufen?'))return;
  try{const x=await req('/api/game/shop/buy',{item:item.id,expectedPrice:item.price});s.diamonds=x.user.diamonds;s.levelBoostUses=x.booster.uses;s.levelBoostMultiplier=x.booster.multiplier;save();render();toast(item.name+' online aktiviert!')}
  catch(err){toast(err.message);fpShopRefresh()}return;
 }
 if(b.dataset.dailyclaim!==undefined){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  b.disabled=true;
  try{
   const x=await req('/api/game/daily');
   s.diamonds=x.user.diamonds;
   fpDailyRecordClaim(dailyInfo(),x.diamonds);
   save();render();
   toast('🎉 +'+x.diamonds+' Diamanten! 🔥 Streak: '+s.dailyReward.streak+' Tage');
  }catch(err){b.disabled=false;toast(err.message)}return;
 }
 // Offline gift/event claims remain local in legacy versions; disable for signed-in users.
 if(b.dataset.giftredeem!==undefined||b.dataset.fp70giftredeem!==undefined){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.FitnessPlusOpenOnline?.();toast('🎉 Online-Geschenke und Events im Online-Menü abholen.');return;
 }
},true);
})();


// FitnessPlus update: hide rest timer and show active booster at bottom.
const fpUpdateTrain=train;
train=function(){
  const html=fpUpdateTrain();
  if(!s.active)return html;
  // Remove only the pause card, leaving the reward card untouched.
  const start=html.indexOf('<div class="card"><div class="row"><b>Pausentimer</b>');
  const end=html.indexOf('<div class="card" id="rewardTimeGate">',start);
  return start>=0&&end>start?html.slice(0,start)+html.slice(end):html;
};
// Use the existing online booster indicator; no second floating banner.
// Remove any stale legacy badge on the next render.
const fpRenderWithoutDuplicateBooster=render;
render=function(){fpRenderWithoutDuplicateBooster();document.getElementById('fpActiveBoosterBanner')?.remove()};

// Automatic workout completion once the configured duration is reached.
  let finishingStart = null;
  let finishingRetryAt = 0;
  const originalTick = timerTick;
  timerTick = function() {
    originalTick();
    if (window.FP76SessionReady===false) return;
    if (!s.active) { finishingStart = null; finishingRetryAt = 0; return; }
    if(Date.now()<finishingRetryAt)return;
    const active = s.active;
    const started = Number(active.started) || 0;
    if (!started || finishingStart === started) return;
    const info = rewardTimeInfo();
    if (info.actualElapsed < info.required && !active.goalReached) return;
    finishingStart = started;
    if (!active.goalReached) handleGoalReached();
    // Keep the reward notification visible briefly before saving the workout.
    setTimeout(async () => {
      if (!s.active || Number(s.active.started) !== started) return;
      // A time-based workout counts as one exercise only if no exercise
      // in this workout has already earned XP. The server remains authoritative.
      const prefix = String(started) + ':';
      const alreadyCredited = Object.keys(s.levelExerciseClaims || {}).some(k => k.startsWith(prefix));
      if (!alreadyCredited) {
        const claim = prefix + '0';
        if (window.FP76Online) {
          if (typeof window.FP76Exercise !== 'function') {
            finishingStart = null; finishingRetryAt=Date.now()+6000;
            toast('Server nicht bereit. Bitte Training erneut abschließen.');
            return;
          }
          const awarded = await window.FP76Exercise(claim);
          if (!awarded) {
            finishingStart = null; finishingRetryAt=Date.now()+6000;
            toast('Punkte konnten nicht gespeichert werden. Bitte Verbindung prüfen.');
            return;
          }
        } else {
          recordLevelExercise(claim);
        }
      }
      if (!s.active || Number(s.active.started) !== started) return;
      const finish = document.querySelector('[data-action="finish"]');
      if (finish) finish.click();
      else {
        s.tab = 'train'; s.view = ''; render();
        document.querySelector('[data-action="finish"]')?.click();
      }
    }, 1100);
  };



const fpRenderEventBanner=render;
render=function(){const output=fpRenderEventBanner();fpEventBanner();return output};

// FitnessPlus: persoenliche taegliche Checkliste.
// Aufgaben bleiben erhalten; nur die Haken werden bei einem neuen Kalendertag geloescht.
s.dailyTodos=Array.isArray(s.dailyTodos)?s.dailyTodos.filter(x=>x&&typeof x.text==='string').slice(0,100).map(x=>({id:String(x.id||uid()),text:String(x.text).slice(0,100),done:!!x.done})):[];
s.dailyTodoDate=/^\d{4}-\d{2}-\d{2}$/.test(String(s.dailyTodoDate||''))?s.dailyTodoDate:day();
// Jede abgehakte Aufgabe wird mit Datum gespeichert, auch nach dem Tageswechsel.
// Trainingshistorie, Kalorien und Level bleiben davon unberuehrt.
s.dailyTodoHistory=Array.isArray(s.dailyTodoHistory)?s.dailyTodoHistory.filter(x=>x&&typeof x.taskId==='string'&&typeof x.text==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.day||''))).map(x=>({taskId:x.taskId,text:x.text.slice(0,100),day:x.day})) : [];
// Bereits heute abgehakte Aufgaben aus der vorigen App-Version uebernehmen.
if(s.dailyTodoDate===day()){
  let migrated=false;
  for(const task of s.dailyTodos){
    if(task.done&&!s.dailyTodoHistory.some(x=>x.taskId===task.id&&x.day===day())){
      s.dailyTodoHistory.push({taskId:task.id,text:task.text,day:day()});
      migrated=true;
    }
  }
  if(migrated)save();
}
function fpTodoRecord(task,completed){
  const today=day();
  s.dailyTodoHistory=s.dailyTodoHistory.filter(x=>!(x.taskId===task.id&&x.day===today));
  if(completed)s.dailyTodoHistory.push({taskId:task.id,text:task.text,day:today});
}

function fpTodoNewDay(){
  const today=day();
  if(s.dailyTodoDate===today)return false;
  s.dailyTodoDate=today;
  s.dailyTodos.forEach(x=>{x.done=false});
  save();
  return true;
}
function fpTodoCard(){
  fpTodoNewDay();
  const tasks=s.dailyTodos;
  const completed=tasks.filter(x=>x.done).length;
  return `<div class="card" id="fpTodoCard"><div class="row"><div><b>✅ Meine tägliche Liste</b><div class="sub">Jeden Tag neue Häkchen, deine Aufgaben bleiben.</div></div><span class="sub">${completed} / ${tasks.length}</span></div>
    <div class="progressTrack" style="margin:12px 0"><div class="progressFill" style="width:${tasks.length?Math.round(completed/tasks.length*100):0}%;background:#55b98d"></div></div>
    ${tasks.length?tasks.map(t=>`<div class="item" style="gap:9px;align-items:center"><label class="grow" style="display:flex;gap:11px;align-items:center;min-width:0;cursor:pointer"><input type="checkbox" data-todocheck="${safe(t.id)}" ${t.done?'checked':''} style="width:22px;height:22px;flex-shrink:0;accent-color:#55b98d"><span style="overflow-wrap:anywhere;${t.done?'text-decoration:line-through;opacity:.55;':''}">${safe(t.text)}</span></label><button type="button" class="btn danger" data-tododelete="${safe(t.id)}" aria-label="Aufgabe löschen">×</button></div>`).join(''):'<p class="sub">Noch keine Aufgaben. Füge deine erste Aufgabe hinzu!</p>'}
    <form id="fpTodoForm" style="display:flex;gap:8px;margin-top:12px"><input class="input" name="task" required maxlength="100" placeholder="Neue Aufgabe ..." aria-label="Neue Aufgabe" style="min-width:0;flex:1"><button class="btn" type="submit">+ Hinzufügen</button></form>
    <p class="sub" style="margin-top:10px">Die Häkchen werden am nächsten Tag automatisch zurückgesetzt.</p></div>`;
}
// Die Tagesliste erscheint ausschliesslich im Reiter Training.
const fpTrainBeforeTodo=train;
train=function(){
  const html=fpTrainBeforeTodo();
  if(!s.active&&['form','library','planner'].includes(s.view))return html;
  const todo=fpTodoCard();
  if(s.active)return html+todo;
  const titleEnd=html.indexOf('</h1>');
  return titleEnd>=0?html.slice(0,titleEnd+5)+todo+html.slice(titleEnd+5):todo+html;
};
document.addEventListener('submit',e=>{
  if(e.target.id!=='fpTodoForm')return;
  e.preventDefault();e.stopImmediatePropagation();fpTodoNewDay();
  const name=String(new FormData(e.target).get('task')||'').trim().slice(0,100);
  if(!name)return;
  if(s.dailyTodos.length>=100){toast('Maximal 100 Aufgaben möglich.');return}
  s.dailyTodos.push({id:uid(),text:name,done:false});save();render();toast('Aufgabe hinzugefügt');
},true);
document.addEventListener('change',e=>{
  const input=e.target.closest('input[data-todocheck]');if(!input)return;
  e.stopImmediatePropagation();fpTodoNewDay();
  const task=s.dailyTodos.find(x=>x.id===input.dataset.todocheck);
  if(!task)return;
  task.done=!!input.checked;fpTodoRecord(task,task.done);save();render();
},true);
document.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-tododelete]');if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();fpTodoNewDay();
  s.dailyTodos=s.dailyTodos.filter(x=>x.id!==btn.dataset.tododelete);
  save();render();toast('Aufgabe gelöscht');
},true);

// Erledigte To-dos werden im Verlauf der ausgewaehlten Trainingswoche angezeigt.
// Sie werden NICHT zu echten Trainings umgewandelt (keine Minuten, kcal oder XP).
const fpProgressBeforeTodoHistory=progress;
progress=function(){
  const html=fpProgressBeforeTodoHistory();
  if(['records','strength','friends','levels'].includes(s.view))return html;
  const selectedWeek=weekStats(Math.max(-104,Math.min(0,Number(s.weekOffset)||0)));
  const completed=(s.dailyTodoHistory||[])
    .filter(x=>x.day>=selectedWeek.from&&x.day<=selectedWeek.to)
    .sort((a,b)=>b.day.localeCompare(a.day)||a.text.localeCompare(b.text,'de-DE'));
  if(!completed.length)return html;
  const rows=`<div class="row" style="margin:16px 0 7px"><b>✅ Erledigte To-dos</b><span class="sub">${completed.length} erledigt</span></div>`+
    completed.map(x=>{
      const date=new Date(x.day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'long'});
      return `<div class="item"><div class="symbol" style="background:#d8f5e9;color:#087b5c">✓</div><div class="grow"><b class="small">${safe(x.text)}</b><div class="sub">${safe(date)} · To-do erledigt</div></div><span class="sub">✓</span></div>`;
    }).join('');
  // Der letzte Card-Container dieser Ansicht enthaelt die abgeschlossenen Trainings.
  // Dort fuegen wir den separaten To-do-Bereich ein.
  const end=html.lastIndexOf('</div>');
  return end>=0?html.slice(0,end)+rows+html.slice(end):html+`<div class="card">${rows}</div>`;
};

// Bei geoeffneter App auch ohne Seitenwechsel den Tageswechsel bemerken.
setInterval(()=>{if(fpTodoNewDay()&&s.tab==='train')render()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&fpTodoNewDay()&&s.tab==='train')render()});

// Localer Trainings-Checkpoint bei jedem Bildschirmwechsel bzw. jedem Satz-Haekchen.
const fpRenderBeforeTrainingCheckpoint=render;
render=function(){
 const result=fpRenderBeforeTrainingCheckpoint();
 try{
  if(s.active){
   localStorage.setItem(ACTIVE_TRAINING_KEY,JSON.stringify({active:s.active,trainingSets:s.trainingSets,restUntil:s.restUntil}));
  }else{
   localStorage.removeItem(ACTIVE_TRAINING_KEY);
   localStorage.removeItem(ONLINE_RUN_KEY);
  }
 }catch(_){}
 return result;
};



// FitnessPlus: eigenstaendige Geschenkaktionen fuer alle (nicht an Events gekoppelt).
let fpBroadcastGifts=[];
let fpBroadcastBusy=false,fpBroadcastClaimBusy=false;
let fpBroadcastLastSeen='';
const FP_BROADCAST_SEEN='fp-broadcast-seen-v1';
async function fpBroadcastRefresh(){
 if(fpBroadcastBusy)return;
 fpBroadcastBusy=true;
 try{
  const response=await fetch('/api/game/broadcast-gifts',{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){fpBroadcastGifts=[];fpBroadcastUpdateBar();return;}
  if(!response.ok)throw Error('Geschenkserver nicht erreichbar');
  const payload=await response.json();
  const prev=JSON.stringify(fpBroadcastGifts);
  fpBroadcastGifts=Array.isArray(payload.gifts)?payload.gifts:[];
  const pending=fpBroadcastGifts.filter(g=>g.active&&g.eligible&&!g.claimed);
  if(pending.length){
   const current=pending[0];
   if(fpBroadcastLastSeen!==current.id){
    fpBroadcastLastSeen=current.id;
    try{if(localStorage.getItem(FP_BROADCAST_SEEN)!==current.id){localStorage.setItem(FP_BROADCAST_SEEN,current.id);toast('💎 Neue Diamanten von FitnessPlus!')}}catch(_e){}
   }
  }
  fpBroadcastUpdateBar();
  if(s.view==='broadcastgifts'&&prev!==JSON.stringify(fpBroadcastGifts))render();
 }catch(_e){/* Keep existing list through temporary connection problems. */}
 finally{fpBroadcastBusy=false}
}
function fpBroadcastUpdateBar(){
 let banner=document.getElementById('fpBroadcastGiftBanner');
 const gift=fpBroadcastGifts.find(g=>g.active&&g.eligible&&!g.claimed);
 // Ein laufendes Training wird durch eine Benachrichtigung nicht verdeckt.
 if(!gift||s.active||s.view==='broadcastgifts'){
  if(banner)banner.remove();return;
 }
 if(!banner){banner=document.createElement('button');banner.id='fpBroadcastGiftBanner';banner.type='button';document.body.append(banner)}
 banner.textContent='💎 '+gift.diamonds+' Diamanten fuer dich! Jetzt abholen ›';
 const otherBanner=!!document.getElementById('fpOnlineEventBanner');
 Object.assign(banner.style,{position:'fixed',left:'12px',right:'12px',bottom:otherBanner?'calc(141px + env(safe-area-inset-bottom, 0px))':'calc(83px + env(safe-area-inset-bottom, 0px))',maxWidth:'520px',margin:'0 auto',zIndex:'1002',width:'calc(100% - 24px)',border:'0',borderRadius:'14px',padding:'12px 14px',background:'#087a67',color:'#fff',fontWeight:'750',fontSize:'13px',boxShadow:'0 6px 20px rgba(0,0,0,.25)',cursor:'pointer'});
 banner.onclick=()=>{s.tab='home';s.view='broadcastgifts';render()};
}
function fpBroadcastView(){
 let html=hdr('FITNESSPLUS DIAMANTEN','Diamanten fuer dich.')+'<button class="btn" data-fpbroadcastback="1">← Zurueck</button>';
 if(!fpBroadcastGifts.length)return html+'<div class="card"><b>Zurzeit keine Diamanten-Aktionen</b><p class="sub">Neue Diamanten-Aktionen aus der Admin-App erscheinen hier.</p><button class="btn" data-fpbroadcastrefresh="1">Aktualisieren</button></div>';
 return html+fpBroadcastGifts.map(g=>'<div class="card"><div style="font-size:36px">🎁</div><b>'+safe(g.title)+'</b><p class="sub">'+safe(g.message||'Diamanten von FitnessPlus')+'</p><div class="huge">'+Number(g.diamonds)+' 💎</div><button class="primary" data-fpbroadcastclaim="'+safe(g.id)+'" '+(g.claimed||!g.active?'disabled':'')+'>'+(g.claimed?'✓ Bereits abgeholt':g.active?'💎 Diamanten abholen':'Nicht mehr verfuegbar')+'</button></div>').join('')+'<button class="btn" data-fpbroadcastrefresh="1">↻ Aktualisieren</button>';
}
const fpBroadcastPreviousHome=home;
home=function(){
 const count=fpBroadcastGifts.filter(g=>g.active&&!g.claimed).length;
 return fpBroadcastPreviousHome()+(fpBroadcastGifts.length?'<div class="card"><div class="row"><div><b>💎 Diamanten fuer dich</b><div class="sub">'+(count?count+' Diamanten-Aktion'+(count===1?'':'en')+' bereit zum Abholen':'Alle aktuellen Diamanten abgeholt')+'</div></div><button class="btn" data-fpbroadcastopen="1">Ansehen →</button></div></div>':'');
};
const fpBroadcastPreviousRender=render;
render=function(){fpBroadcastPreviousRender();if(s.view==='broadcastgifts')$('#page').innerHTML=fpBroadcastView();fpBroadcastUpdateBar()};
document.addEventListener('click',async e=>{
 const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.fpbroadcastopen!==undefined){e.preventDefault();e.stopImmediatePropagation();s.tab='home';s.view='broadcastgifts';render();fpBroadcastRefresh();return}
 if(btn.dataset.fpbroadcastback!==undefined){e.preventDefault();e.stopImmediatePropagation();s.view='';render();return}
 if(btn.dataset.fpbroadcastrefresh!==undefined){e.preventDefault();e.stopImmediatePropagation();await fpBroadcastRefresh();render();return}
 if(btn.dataset.fpbroadcastclaim===undefined)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(fpBroadcastClaimBusy)return;
 fpBroadcastClaimBusy=true;btn.disabled=true;
 try{
  const r=await fetch('/api/game/broadcast-gifts/claim',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({giftId:btn.dataset.fpbroadcastclaim})});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(result.error||'Geschenk konnte nicht abgeholt werden');
  s.diamonds=result.user.diamonds;
  // Der Server ist fuer Guthaben und Einmal-Einloesung verantwortlich.
  await fpBroadcastRefresh();
  window.FP76Refresh?.();
  render();toast('🎉 +'+result.diamonds+' 💎 von FitnessPlus erhalten!');
 }catch(err){toast(err.message||'Geschenk konnte nicht abgeholt werden');await fpBroadcastRefresh();render()}
 finally{fpBroadcastClaimBusy=false}
},true);
setTimeout(fpBroadcastRefresh,1800);
setInterval(fpBroadcastRefresh,45000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)fpBroadcastRefresh()});
window.addEventListener('focus',fpBroadcastRefresh);


// FitnessPlus 8.1: Erweiterte Trainingsstatistiken direkt im Reiter "Verlauf".
// Ausschliesslich gespeicherte, abgeschlossene Trainings werden ausgewertet.
// Alte Wochenansicht, To-do-Verlauf, Freundeslisten und Rekorde bleiben bestehen.
s.fpStatsPeriod=['week','month','year'].includes(s.fpStatsPeriod)?s.fpStatsPeriod:'month';
s.fpStatsMetric=['minutes','workouts','kcal'].includes(s.fpStatsMetric)?s.fpStatsMetric:'minutes';
s.fpStatsOffset=Number.isSafeInteger(s.fpStatsOffset)?Math.max(-104,Math.min(0,s.fpStatsOffset)):0;

function fpStatsDate(d){return dkey(d)}
function fpStatsMove(d,days){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);x.setDate(x.getDate()+days);return x}
function fpStatsRange(period,offset){
  const today=new Date();today.setHours(12,0,0,0);
  let start,end,caption,buckets=[];
  if(period==='year'){
    start=new Date(today.getFullYear()+offset,0,1,12);
    end=new Date(start.getFullYear(),11,31,12);
    caption=String(start.getFullYear());
    buckets=Array.from({length:12},(_,i)=>({start:fpStatsDate(new Date(start.getFullYear(),i,1,12)),end:fpStatsDate(new Date(start.getFullYear(),i+1,0,12)),label:new Date(start.getFullYear(),i,1,12).toLocaleDateString('de-DE',{month:'short'}).replace('.','')}));
  }else if(period==='week'){
    const monday=fpStatsMove(today,-(today.getDay()+6)%7+offset*7);
    start=monday;end=fpStatsMove(start,6);
    caption=start.toLocaleDateString('de-DE',{day:'numeric',month:'short'})+' bis '+end.toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'});
    buckets=Array.from({length:7},(_,i)=>{const d=fpStatsMove(start,i);return {start:fpStatsDate(d),end:fpStatsDate(d),label:['Mo','Di','Mi','Do','Fr','Sa','So'][i]}});
  }else{
    start=new Date(today.getFullYear(),today.getMonth()+offset,1,12);
    end=new Date(start.getFullYear(),start.getMonth()+1,0,12);
    caption=start.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    const count=end.getDate();
    for(let i=1;i<=count;i+=7){
      const last=Math.min(i+6,count);
      buckets.push({start:fpStatsDate(new Date(start.getFullYear(),start.getMonth(),i,12)),end:fpStatsDate(new Date(start.getFullYear(),start.getMonth(),last,12)),label:i===last?String(i):i+'–'+last});
    }
  }
  return {from:fpStatsDate(start),to:fpStatsDate(end),caption,buckets};
}
function fpStatsSessions(from,to){
  return (Array.isArray(s.history)?s.history:[]).filter(h=>h&&typeof h.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(h.day)&&h.day>=from&&h.day<=to);
}
function fpStatsValue(value,maximum){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.min(n,maximum):0}
function fpStatsTotals(items){
  return {
    workouts:items.length,
    days:new Set(items.map(h=>h.day)).size,
    minutes:Math.round(items.reduce((n,h)=>n+fpStatsValue(h.min,1440),0)),
    kcal:Math.round(items.reduce((n,h)=>n+fpStatsValue(h.kcal,10000),0)),
    sets:items.reduce((n,h)=>n+(Array.isArray(h.exercises)?h.exercises.reduce((t,e)=>t+(Array.isArray(e?.completedSets)?e.completedSets.filter(x=>x&&x.done).length:0),0):0),0)
  };
}
function fpStatsDelta(value,before){
  if(!before)return value?'Zum ersten Mal in diesem Zeitraum':'Noch kein Vergleich';
  const change=Math.round((value-before)*100/before);
  return (change>0?'+':'')+change+' % gegenüber dem vorherigen Zeitraum';
}
function fpStatsTopWorkout(items){
  const amounts=new Map();
  for(const h of items){const title=String(h.name||find(h.workoutId)?.name||'Training').slice(0,90);amounts.set(title,(amounts.get(title)||0)+1)}
  return [...amounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'de-DE'))[0]||null;
}
function fpStatsPanel(){
  const period=s.fpStatsPeriod,offset=Math.max(-104,Math.min(0,s.fpStatsOffset));
  const range=fpStatsRange(period,offset),prior=fpStatsRange(period,offset-1);
  const items=fpStatsSessions(range.from,range.to),sum=fpStatsTotals(items),before=fpStatsTotals(fpStatsSessions(prior.from,prior.to));
  const metric=s.fpStatsMetric;
  const labels={minutes:'Minuten',workouts:'Workouts',kcal:'kcal'};
  const bars=range.buckets.map(b=>({label:b.label,value:fpStatsTotals(fpStatsSessions(b.start,b.end))[metric]}));
  const max=Math.max(1,...bars.map(x=>x.value));
  const canGoBack=offset>-104;
  const now=offset===0;
  return `<section class="fpstats" aria-label="Erweiterte Trainingsstatistiken">
    <div class="card fpstats-main">
      <div class="row"><div><div class="eyebrow">DEIN TRAININGSFORTSCHRITT</div><h2 class="section" style="margin:5px 0 0">📈 Trainingsstatistiken</h2></div><span class="fpstats-icon" aria-hidden="true">📊</span></div>
      <div class="fpstats-tabs" role="group" aria-label="Zeitraum auswählen">
        ${[['week','Woche'],['month','Monat'],['year','Jahr']].map(([key,text])=>`<button class="fpstats-tab ${period===key?'fpstats-selected':''}" type="button" data-fpstat-period="${key}" aria-pressed="${period===key}">${text}</button>`).join('')}
      </div>
      <div class="fpstats-nav"><button class="btn" type="button" data-fpstat-shift="-1" ${!canGoBack?'disabled':''} aria-label="Vorheriger Zeitraum">‹</button><b>${safe(range.caption)}</b><button class="btn" type="button" data-fpstat-shift="1" ${now?'disabled':''} aria-label="Nächster Zeitraum">›</button></div>
      <div class="fpstats-numbers">
        <div class="fpstats-number"><span>💪 Trainings</span><strong>${sum.workouts.toLocaleString('de-DE')}</strong></div>
        <div class="fpstats-number"><span>⏱ Minuten</span><strong>${sum.minutes.toLocaleString('de-DE')}</strong></div>
        <div class="fpstats-number"><span>🔥 kcal geschätzt</span><strong>${sum.kcal.toLocaleString('de-DE')}</strong></div>
        <div class="fpstats-number"><span>📅 Trainingstage</span><strong>${sum.days.toLocaleString('de-DE')}</strong></div>
      </div>
      <p class="fpstats-comparison">${safe(fpStatsDelta(sum.minutes,before.minutes))}</p>
    </div>
    <p class="sub" style="margin:8px 2px 18px">Nur abgeschlossene, gespeicherte Trainings zählen. Kalorien sind Schätzwerte. Die Daten stammen aus deinem persönlichen Trainingsverlauf.</p>
  </section>`;
}
function fpStatsStyles(){
  if(document.getElementById('fpStatsStyles'))return;
  const sheet=document.createElement('style');sheet.id='fpStatsStyles';sheet.textContent=`
  .fpstats-main{overflow:hidden}.fpstats-icon{font-size:34px}.fpstats-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:18px 0 12px;padding:5px;border-radius:14px;background:rgba(127,127,150,.12)}
  .fpstats-tab,.fpstats-metric{border:0;border-radius:10px;padding:10px 5px;background:transparent;color:inherit;font:inherit;font-weight:700;font-size:13px;cursor:pointer}
  .fpstats-selected{background:#6553db!important;color:#fff!important;box-shadow:0 2px 7px rgba(55,44,117,.2)}
  .fpstats-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:center;margin:12px 0 18px}.fpstats-nav b{font-size:14px;line-height:1.3}
  .fpstats-numbers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fpstats-number{border-radius:13px;padding:13px 10px;background:rgba(111,95,214,.09);min-width:0}
  .fpstats-number span{display:block;font-size:12px;opacity:.8}.fpstats-number strong{display:block;font-size:26px;font-weight:850;margin-top:5px;font-variant-numeric:tabular-nums;word-break:break-word}
  .fpstats-comparison{font-size:12px;opacity:.8;margin:14px 0 0}
  .fpstats-metrics{display:flex;gap:6px;margin:14px 0;flex-wrap:wrap}.fpstats-metric{background:rgba(127,127,150,.12);flex:1;min-width:75px}
  .fpstats-chart{display:flex;align-items:stretch;justify-content:space-between;gap:4px;height:218px;width:100%;margin-top:6px;overflow:hidden}
  .fpstats-column{display:flex;flex:1 1 0;min-width:0;flex-direction:column;align-items:center;font-size:11px;gap:5px}
  .fpstats-value{height:19px;line-height:19px;font-size:11px;font-weight:750;font-variant-numeric:tabular-nums}
  .fpstats-track{width:100%;flex:1;display:flex;align-items:flex-end;justify-content:center;border-bottom:1px solid rgba(111,95,214,.25)}
  .fpstats-fill{width:min(70%,35px);background:linear-gradient(180deg,#a78bfa,#6553db);border-radius:7px 7px 0 0;transition:height .25s ease}
  .fpstats-label{min-height:20px;max-width:100%;white-space:nowrap;font-size:10px;overflow:hidden;text-overflow:clip;text-align:center}
  .fpstats-recap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}
  .fpstats-recap>div{padding:12px;border-radius:12px;background:rgba(111,95,214,.08)}.fpstats-recap span{display:block;opacity:.75;font-size:12px}.fpstats-recap strong{display:block;font-size:20px;margin-top:7px}
  @media(max-width:350px){.fpstats-label{font-size:9px}.fpstats-number strong{font-size:22px}.fpstats-tab,.fpstats-metric{font-size:12px}}
  `;document.head.appendChild(sheet);
}
fpStatsStyles();
const fpProgressBeforeExtendedStatistics=progress;
progress=function(){
  // Freunde, Level, Kraftentwicklung und persoenliche Rekorde bleiben auf ihren Unterseiten.
  if(['records','strength','friends','levels'].includes(s.view)){
    return fpProgressBeforeExtendedStatistics();
  }
  // Die neuen Trainingsstatistiken erscheinen sofort, ohne zusaetzliches Diagramm.
  // Anschliessend folgt wieder die originale Rubrik "Deine Trainingswochen."
  // mit Wochennavigation, Balken, Kraftentwicklung, Bestleistungen und Trainingsliste.
  // Die bereits entfernte "Wochenuebersicht" ist nicht Teil der alten Ansicht.
  return fpStatsPanel()+fpProgressBeforeExtendedStatistics();
};
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.fpstatPeriod){
    e.preventDefault();e.stopImmediatePropagation();
    s.fpStatsPeriod=button.dataset.fpstatPeriod;s.fpStatsOffset=0;
    save();render();return;
  }
  if(button.dataset.fpstatMetric){
    e.preventDefault();e.stopImmediatePropagation();
    s.fpStatsMetric=button.dataset.fpstatMetric;
    save();render();return;
  }
  if(button.dataset.fpstatShift!==undefined){
    e.preventDefault();e.stopImmediatePropagation();
    const next=s.fpStatsOffset+Number(button.dataset.fpstatShift);
    s.fpStatsOffset=Math.max(-104,Math.min(0,next));
    save();render();return;
  }
},true);


// FP_WEEKLY_CARD_REMOVED_20261014: Hide exactly the legacy weekly totals card.
// Other progress cards, charts, and the workout history are unchanged.
const fpRenderWithoutWeeklyTotalsCard = render;
render = function(){
  const result = fpRenderWithoutWeeklyTotalsCard();
  if(s.tab === 'progress' && !['records','strength','friends','levels'].includes(s.view)){
    const page = document.querySelector('#page');
    if(page){
      for(const card of page.querySelectorAll('.card')){
        const heading = card.querySelector(':scope > b, :scope > h2, :scope > .row > b, :scope > .row > h2');
        if(heading && heading.textContent.trim() === 'Wochen\u00fcbersicht') card.remove();
      }
    }
  }
  return result;
};

// Besuch allein erhoeht keine Serie. Die alte Extra-Karte und ihre
// automatischen Besuchs-Zaehlungen wurden entfernt.
// Im Profil ist die bisher beste Tages-Streak dauerhaft sichtbar.
const fpProfileBeforeDailyRecord=profileView;
profileView=function(){
 const info=dailyInfo();
 const html=fpProfileBeforeDailyRecord();
 const current=info.streak;
 const days=info.best===1?'Tag':'Tage';
 const card=`<div class="card fpProfileStreakRecord" aria-label="Dein bester Tages-Streak-Rekord">
  <div class="row" style="align-items:center"><div><b>🏆 Dein Tages-Streak-Rekord</b>
   <div class="sub" style="margin-top:6px">Höchste Serie beim Abholen der Tagesbelohnung</div></div><span style="font-size:32px">🔥</span></div>
  <div class="value" style="font-size:30px;margin:12px 0 5px;font-weight:850">${info.best} ${days}</div>
  <div class="sub">Aktuelle Streak: ${current} ${current===1?'Tag':'Tage'}</div>
  <p class="sub" style="margin-top:11px">Dein Rekord bleibt bestehen, auch wenn du einen Tag verpasst.</p>
 </div>`;
 return html.replace('<form id="profileForm"',card+'<form id="profileForm"');
};

// Erst jetzt rendern: Die neuen Statistik-Ansichten sind vollstaendig registriert.
// Auch wenn der zuletzt geoeffnete Tab "Verlauf" war, erscheint sofort das Dashboard.


// FitnessPlus: antippbare Freundesprofile mit automatisch berechnetem
// Online-Streak-Rekord. Kein Austausch von Streak-Codes und keine frei
// eingebbaren Streak-Werte. Nur online verknuepfte Freunde werden angezeigt.
let fpOnlineFriends=[],fpFriendsOnlineStatus='unknown',fpFriendsFetchedAt=0,fpFriendsBusy=false;
function fpFriendNameKey(name){return String(name||'').trim().toLocaleLowerCase('de-DE')}
function fpFriendDisplayRows(){
 const rows=[];
 const byName=new Map(fpOnlineFriends.map(f=>[fpFriendNameKey(f.name),f]));
 const used=new Set();
 for(const local of (Array.isArray(s.friends)?s.friends:[])){
  if(!local||typeof local.name!=='string')continue;
  const live=byName.get(fpFriendNameKey(local.name));
  if(live){used.add(live.id);rows.push({...live,online:true,exercises:Number(live.xp)||0});}
  else rows.push({name:local.name,online:false,exercises:Number(local.exercises)||0});
 }
 for(const live of fpOnlineFriends){
  if(used.has(live.id))continue;
  rows.push({...live,online:true,exercises:Number(live.xp)||0});
 }
 return rows.sort((a,b)=>Number(b.exercises)-Number(a.exercises)||String(a.name).localeCompare(String(b.name),'de-DE'));
}
async function fpFriendsOnlineRefresh(force=false){
 if(fpFriendsBusy||(!force&&Date.now()-fpFriendsFetchedAt<15000))return;
 fpFriendsBusy=true;
 try{
  const response=await fetch('/api/friends',{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){fpOnlineFriends=[];fpFriendsOnlineStatus='login';return}
  if(!response.ok)throw Error('Freunde nicht erreichbar');
  const body=await response.json();
  if(!Array.isArray(body.friends))throw Error('Ungültige Freundesliste');
  fpOnlineFriends=body.friends.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string')
   .map(f=>({id:f.id,name:f.name,xp:Math.max(0,Number(f.xp)||0),
     level:Math.max(1,Number(f.level)||1),
     bestStreak:Math.max(0,Math.floor(Number(f.bestStreak)||0)),
     currentStreak:Math.max(0,Math.floor(Number(f.currentStreak)||0))}));
  fpFriendsOnlineStatus='ready';fpFriendsFetchedAt=Date.now();
 }catch(_){fpFriendsOnlineStatus='error'}
 finally{
  fpFriendsBusy=false;
  if(s.tab==='progress'&&['friends','friendProfile'].includes(s.view))render();
 }
}
function fpFriendChosen(){
 const id=String(s.fpFriendSelectedId||'');
 const name=fpFriendNameKey(s.fpFriendSelectedName);
 return fpFriendDisplayRows().find(f=>id?f.online&&f.id===id:!f.online&&fpFriendNameKey(f.name)===name)||null;
}
function fpFriendProfileView(){
 const friend=fpFriendChosen();
 if(!friend)return hdr('FREUNDESPROFIL','Freund nicht gefunden.')+'<button class="btn" data-fp-friend-back="1">← Zur Freundesliste</button>';
 const name=safe(friend.name);
 const online=!!friend.online;
 const best=online?Math.max(0,Number(friend.bestStreak)||0):null;
 const current=online?Math.max(0,Number(friend.currentStreak)||0):null;
 const level=online?Math.max(1,Number(friend.level)||1):levelNumber(Number(friend.exercises)||0);
 const exerciseCount=online?Math.max(0,Number(friend.xp)||0):Math.max(0,Number(friend.exercises)||0);
 return hdr('DEINE FREUNDE','Profil von '+name)+
  '<button class="btn" data-fp-friend-back="1">← Zur Freundesliste</button>'+
  `<div class="card" style="margin-top:15px"><div class="row" style="gap:15px;align-items:center"><div class="friendAvatar">${safe(friend.name.slice(0,1).toUpperCase())}</div><div class="grow"><b style="font-size:20px">${name}</b><div class="sub">🏆 Level ${level} · ${exerciseCount} Übungen</div></div></div></div>`+
  (online?`<button type="button" class="primary" data-fp-chat-open="${safe(friend.id)}" style="margin:12px 0">💬 Nachricht schreiben</button>`:'<div class="card"><p class="sub">💬 Chat ist mit bestätigten Online-Freunden möglich.</p></div>')+
  `<div class="card"><div class="row" style="align-items:center"><b>🔥 Bester Tages-Streak-Rekord</b><span style="font-size:28px" aria-hidden="true">🏆</span></div>`+
  (online?`<div class="value" style="font-size:32px;margin:14px 0 7px">${best} ${best===1?'Tag':'Tage'}</div><div class="sub">Aktuelle Tages-Streak: ${current} ${current===1?'Tag':'Tage'}</div><p class="sub" style="margin-top:12px">Der Rekord aktualisiert sich automatisch aus den online abgeholten Tagesbelohnungen. Kein Code nötig.</p>`:
  `<p class="sub" style="margin-top:14px">Der Streak-Rekord ist noch nicht verfügbar. Dafür müsst ihr beide mit euren FitnessPlus-Online-Konten angemeldet und online befreundet sein. Dein Freund muss keinen Rekord-Code verschicken.</p>`)+
  '</div>';
}
function fpFriendProfileStyles(){
 if(document.getElementById('fpFriendProfileStyles'))return;
 const css=document.createElement('style');css.id='fpFriendProfileStyles';
 css.textContent='.fpFriendOpen{border:0;background:transparent;color:inherit;font:inherit;text-align:left;display:flex;align-items:center;gap:12px;flex:1;min-width:0;padding:3px 0;cursor:pointer}.fpFriendOpen:focus-visible{outline:3px solid #13b89c;border-radius:10px}.fpFriendOpen .grow{flex:1;min-width:0}.fpFriendChevron{color:#149a85;font-size:23px;padding:0 2px}';
 document.head.appendChild(css);
}
fpFriendProfileStyles();
friendsScreen=function(){
 const friends=fpFriendDisplayRows();
 return hdr('DEINE FREUNDE','Gemeinsam stärker.')+
 `<div class="card"><div class="row"><div><b>👥 Freundesliste</b><div class="sub">${friends.length} ${friends.length===1?'Freund':'Freunde'} gespeichert</div></div><button class="btn" data-action="openLevels">🏆 Rangliste</button></div></div>`+
 (friends.length?friends.map(f=>{
  const label=safe(f.name),level=f.online?Math.max(1,Number(f.level)||1):levelNumber(f.exercises);
  const key=safe(f.online?'online:'+f.id:'local:'+f.name);
  return `<div class="card friendCard"><div class="row"><button type="button" class="fpFriendOpen" data-fp-friend-open="${key}" aria-label="Profil von ${label} öffnen"><div class="friendAvatar">${safe(f.name.slice(0,1).toUpperCase())}</div><div class="grow"><b>${label}</b><div class="sub">Level ${level} · ${Math.max(0,Number(f.exercises)||0)} Übungen</div>${f.online?`<div class="sub">🔥 Bester Streak: ${Math.max(0,Number(f.bestStreak)||0)} Tage</div>`:''}</div><span class="fpFriendChevron">›</span></button>${f.online?`<button class="btn" type="button" data-fp-chat-open="${safe(f.id)}" aria-label="${label} Nachricht schreiben">💬</button>`:''}<button class="btn danger" type="button" data-fp-friend-remove="${key}" aria-label="${label} entfernen">Entfernen</button></div></div>`;
 }).join(''):'<div class="card"><b>Noch keine Freunde</b><p class="sub">Füge einen Freund hinzu, um sein Profil anzusehen.</p></div>')+
 (fpFriendsOnlineStatus==='login'?'<div class="sub" style="margin:10px 0">🔐 Melde dich bei FitnessPlus Online an, um die Streak-Rekorde deiner Freunde automatisch zu sehen.</div>':
 fpFriendsOnlineStatus==='error'?'<div class="sub" style="margin:10px 0">Online-Rekorde derzeit nicht erreichbar. Deine gespeicherten Freunde bleiben sichtbar.</div>':'')+
 friendLinkPanel()+
 '<p class="sub">Freundescodes dienen nur zum Hinzufügen. Streak-Rekorde werden nicht per Code geteilt, sondern nur bei verbundenen Online-Konten automatisch angezeigt.</p>';
};
const fpProgressBeforeFriendProfile=progress;
progress=function(){if(s.view==='friendProfile')return fpFriendProfileView();return fpProgressBeforeFriendProfile()};
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.action==='openFriends'){
  fpFriendsOnlineRefresh(true);return;
 }
 if(button.dataset.fpFriendBack!==undefined){
  e.preventDefault();e.stopImmediatePropagation();s.fpFriendSelectedId='';s.fpFriendSelectedName='';s.tab='progress';s.view='friends';render();fpFriendsOnlineRefresh();return;
 }
 if(button.dataset.fpFriendOpen!==undefined){
  e.preventDefault();e.stopImmediatePropagation();
  const key=button.dataset.fpFriendOpen;
  if(key.startsWith('online:')){s.fpFriendSelectedId=key.slice(7);s.fpFriendSelectedName=''}
  else if(key.startsWith('local:')){s.fpFriendSelectedId='';s.fpFriendSelectedName=key.slice(6)}
  else return;
  s.tab='progress';s.view='friendProfile';render();fpFriendsOnlineRefresh(true);return;
 }
 if(button.dataset.fpFriendRemove!==undefined){
  e.preventDefault();e.stopImmediatePropagation();
  const key=button.dataset.fpFriendRemove;
  const friend=fpFriendDisplayRows().find(f=>f.online?'online:'+f.id===key:'local:'+f.name===key);
  if(!friend)return;
  if(!confirm(friend.name+' aus der Freundesliste entfernen?'))return;
  if(friend.online){
   button.disabled=true;
   try{
    const response=await fetch('/api/friends/remove',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:friend.id})});
    if(!response.ok)throw Error('Online-Freund konnte nicht entfernt werden');
    fpOnlineFriends=fpOnlineFriends.filter(f=>f.id!==friend.id);
   }catch(err){button.disabled=false;toast(err.message);return}
  }
  s.friends=s.friends.filter(f=>fpFriendNameKey(f.name)!==fpFriendNameKey(friend.name));
  save();render();toast('Freund entfernt');return;
 }
},true);
window.addEventListener('focus',()=>{if(s.tab==='progress'&&['friends','friendProfile'].includes(s.view))fpFriendsOnlineRefresh(true)});
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='fitnessplus-session-changed')fpFriendsOnlineRefresh(true)});
setInterval(()=>{if(!document.hidden&&s.tab==='progress'&&['friends','friendProfile'].includes(s.view))fpFriendsOnlineRefresh()},45000);


// "Heute": expand a list of upcoming workouts without leaving the start page.
document.addEventListener('click',e=>{
 const toggle=e.target.closest('button[data-fp-home-plan-toggle]');
 if(toggle){e.preventDefault();e.stopImmediatePropagation();fpHomePlansExpanded=!fpHomePlansExpanded;render();return;}
 const selected=e.target.closest('button[data-fp-home-plan-day]');
 if(selected){
  e.preventDefault();e.stopImmediatePropagation();
  const chosen=String(selected.dataset.fpHomePlanDay||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(chosen))return;
  s.selectedDay=chosen;s.calMonth=chosen.slice(0,7);s.tab='calendar';s.view='';render();
 }
},true);



// FitnessPlus: Private Nachrichten unter bestätigten Online-Freunden.
// Server speichert Nachrichten. Keine Nachrichten im Cloud-Spielstand oder localStorage.
let fpChatFriendId='',fpChatMessages=[],fpChatError='',fpChatBusy=false,fpChatSending=false;
const fpChatFriend=()=>fpOnlineFriends.find(f=>f.id===fpChatFriendId)||null;
function fpChatTime(timestamp){
 const d=new Date(Number(timestamp));
 return Number.isFinite(d.getTime())?d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
}
function fpChatView(){
 const friend=fpChatFriend(),name=friend?.name||'Freund';
 const rows=fpChatMessages.length?fpChatMessages.map(m=>`<div class="fpChatLine ${m.mine?'mine':''}"><div class="fpChatBubble"><div>${safe(m.text)}</div><small>${safe(fpChatTime(m.createdAt))}</small></div></div>`).join(''):'<p class="sub" style="text-align:center;margin:25px 0">Noch keine Nachrichten. Sag Hallo! 👋</p>';
 return hdr('FITNESSPLUS NACHRICHTEN','Chat mit '+safe(name))+
 `<button type="button" class="btn" data-fp-chat-back="1">← Zur Freundesliste</button>`+
 `<div class="card" style="margin-top:14px;padding:12px"><div class="row" style="margin-bottom:10px"><b>💬 ${safe(name)}</b><span class="sub">Privater Chat</span></div>`+
 `<div id="fpChatMessages" class="fpChatMessages" role="log" aria-live="polite">${rows}</div>`+
 (fpChatError?`<p class="sub" role="alert">${safe(fpChatError)}</p>`:'')+
 `<form id="fpChatForm" class="fpChatForm"><label class="field" for="fpChatInput">Deine Nachricht</label><textarea id="fpChatInput" class="input" name="text" rows="2" maxlength="500" placeholder="Nachricht schreiben …" required></textarea><div class="row" style="margin-top:10px"><span class="sub">Max. 500 Zeichen</span><button type="submit" class="btn" ${fpChatSending?'disabled':''}>${fpChatSending?'Sendet …':'Senden ➤'}</button></div></form></div>`+
 `<p class="sub">Nachrichten sind nur für euch beide abrufbar und werden auf dem FitnessPlus-Server gespeichert. Bitte keine privaten Daten teilen.</p>`;
}
const fpChatBeforeProgress=progress;
progress=function(){if(s.view==='friendChat')return fpChatView();return fpChatBeforeProgress()};
function fpChatStyles(){
 if(document.getElementById('fpChatStyles'))return;
 const style=document.createElement('style');style.id='fpChatStyles';
 style.textContent='.fpChatMessages{height: min(55vh,400px);min-height:220px;overflow-y:auto;background:var(--surface,#f5f6fa);border-radius:12px;padding:12px 8px;border:1px solid rgba(120,120,120,.16)}.fpChatLine{display:flex;margin:7px 0;justify-content:flex-start}.fpChatLine.mine{justify-content:flex-end}.fpChatBubble{max-width:83%;background:#e7e8f0;color:#18202b;padding:10px 12px;border-radius:14px;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.45;font-size:14px}.fpChatLine.mine .fpChatBubble{background:#d5f2e5;color:#132e21}.fpChatBubble small{display:block;text-align:right;font-size:10px;opacity:.64;margin-top:4px}.fpChatForm{margin-top:12px}.fpChatForm textarea{resize:vertical;min-height:68px}';
 document.head.appendChild(style);
}
fpChatStyles();
async function fpChatRefresh(silent=false){
 const id=fpChatFriendId;
 if(fpChatBusy||!id||s.view!=='friendChat'||document.hidden)return;
 fpChatBusy=true;
 try{
  const r=await fetch('/api/chat?friendId='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Chat konnte nicht geladen werden');
  if(id!==fpChatFriendId||s.view!=='friendChat')return;
  const incoming=Array.isArray(data.messages)?data.messages:[];
  const differs=JSON.stringify(incoming)!==JSON.stringify(fpChatMessages);
  fpChatMessages=incoming;fpChatError='';
  if(differs||!silent){
   const list=document.getElementById('fpChatMessages');
   if(list){
    const nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<100;
    list.innerHTML=fpChatMessages.length?fpChatMessages.map(m=>`<div class="fpChatLine ${m.mine?'mine':''}"><div class="fpChatBubble"><div>${safe(m.text)}</div><small>${safe(fpChatTime(m.createdAt))}</small></div></div>`).join(''):'<p class="sub" style="text-align:center;margin:25px 0">Noch keine Nachrichten. Sag Hallo! 👋</p>';
    if(nearBottom||!silent)list.scrollTop=list.scrollHeight;
   }
   if(fpChatError===''){
    const errorEl=document.querySelector('#fpChatForm')?.previousElementSibling;
    if(errorEl?.getAttribute('role')==='alert')errorEl.remove();
   }
  }
 }catch(e){
  fpChatError=e.message||'Chat gerade nicht erreichbar';
  if(!silent&&id===fpChatFriendId){render()}
 }finally{fpChatBusy=false}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.fpChatOpen!==undefined){
  e.preventDefault();e.stopImmediatePropagation();
  const friend=fpOnlineFriends.find(f=>f.id===b.dataset.fpChatOpen);
  if(!friend){toast('Bitte zuerst mit einem Online-Freund verbinden.');return}
  fpChatFriendId=friend.id;fpChatMessages=[];fpChatError='';s.tab='progress';s.view='friendChat';render();fpChatRefresh();return;
 }
 if(b.dataset.fpChatBack!==undefined){
  e.preventDefault();e.stopImmediatePropagation();
  fpChatFriendId='';fpChatMessages=[];s.tab='progress';s.view='friends';render();fpFriendsOnlineRefresh(true);return;
 }
},true);
document.addEventListener('submit',async e=>{
 if(e.target.id!=='fpChatForm')return;
 e.preventDefault();e.stopImmediatePropagation();
 if(fpChatSending||!fpChatFriendId)return;
 const input=document.getElementById('fpChatInput');
 const text=String(input?.value||'').trim();
 if(!text||text.length>500){toast('Bitte eine Nachricht bis 500 Zeichen schreiben.');return}
 const id=fpChatFriendId;fpChatSending=true;
 const send=e.target.querySelector('button[type="submit"]');if(send)send.disabled=true;
 try{
  const r=await fetch('/api/chat/send',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendId:id,text})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Nachricht konnte nicht gesendet werden');
  if(id===fpChatFriendId&&input)input.value='';
  await fpChatRefresh();
 }catch(err){toast(err.message||'Senden fehlgeschlagen');}
 finally{fpChatSending=false;if(send)send.disabled=false}
},true);
setInterval(()=>{if(s.tab==='progress'&&s.view==='friendChat')fpChatRefresh(true)},8000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&s.view==='friendChat')fpChatRefresh(true)});

render();
})();