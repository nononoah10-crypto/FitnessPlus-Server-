/* FitnessPlus gifts: independent view replacement, compatible with existing backend. */
(()=>{
 'use strict';
 const page=document.getElementById('page');if(!page)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={boost2small:'Doppel-Power (3 Einsätze)',boost2long:'Trainings-Turbo (8 Einsätze)',boost3mega:'Mega-XP (5 Einsätze)'};
 let friends=[],balance=0,loading=false,showing=false,lastLoad=0,booster={uses:0,multiplier:1};
 async function request(method,url,payload){const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});let data;try{data=await r.json()}catch{throw Error('Antwort des Servers konnte nicht gelesen werden')}if(!r.ok)throw Error(data.error||'Serverfehler');return data}
 function giftPage(){return /Geschenke werden geladen|Direkt an Freunde senden|Geschenk senden/.test(page.textContent||'')&&(/GESCHENKE|Geschenke/i.test(page.textContent||''));}

 function drawBadge(){let el=document.getElementById('fpActiveBoosterBadge');const uses=Number(booster?.uses||0);if(!uses){el?.remove();return}if(!el){el=document.createElement('div');el.id='fpActiveBoosterBadge';el.style.cssText='position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);left:50%;transform:translateX(-50%);z-index:9998;background:#17283d;color:white;border:1px solid #75a8ff;border-radius:999px;padding:8px 13px;font:600 12px system-ui;pointer-events:none';document.body.append(el)}el.textContent='⚡ '+(Number(booster.multiplier)>=3?'Mega-XP':'Doppel-XP')+' aktiv · '+uses+' Übungen übrig'}
 function template(message=''){
  return `<div class="card" id="fpGiftForm"><b>🎁 Geschenk an Freunde senden</b><p class="sub">${message?esc(message):'Dein Guthaben: 💎 '+balance+' · Keine Geschenk-Codes'}</p>
  <label class="field" for="fpGiftFriend">Freund auswählen</label><select class="input" id="fpGiftFriend"><option value="">Bitte auswählen</option>${friends.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select>
  <div id="fpGiftDiamonds"><label class="field" for="fpGiftAmount">Anzahl Diamanten</label><input class="input" id="fpGiftAmount" type="number" inputmode="numeric" min="1" max="100000" value="10"></div>
  <button class="primary" type="button" id="fpGiftSend">Geschenk absenden</button><p class="sub" id="fpGiftStatus" aria-live="polite"></p></div>`;
 }
 function paint(msg=''){if(!giftPage())return;showing=true;page.innerHTML=`<div class="section">GESCHENKE</div><h1>Direkt an Freunde senden</h1><button class="btn" type="button" id="fpGiftBack">← Zum Diamantenshop</button>`+template(msg);showing=false}
 async function load(){if(loading||!giftPage())return;loading=true;paint('Freunde werden geladen ...');try{const [f,g]=await Promise.all([request('GET','/api/friends'),request('GET','/api/game')]);friends=f.friends||[];balance=g.user?.diamonds??0;booster=g.booster||{uses:0,multiplier:1};drawBadge();paint(friends.length?'':'Du hast noch keine Freunde hinzugefügt.');}catch(e){paint(e.message==='Bitte anmelden'?'Bitte zuerst oben auf „Anmelden“ tippen.':'Laden fehlgeschlagen: '+e.message)}finally{loading=false;lastLoad=Date.now()}}
 const observer=new MutationObserver(()=>{if(showing||loading)return;if(giftPage()&&!page.querySelector('#fpGiftForm'))load()});observer.observe(page,{childList:true,subtree:false});
 window.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='fpGiftBack'){e.preventDefault();e.stopImmediatePropagation();const legacy=document.createElement('button');legacy.dataset.giftback='1';legacy.style.display='none';document.body.append(legacy);legacy.click();legacy.remove();return}
  if(b.id!=='fpGiftSend')return;e.preventDefault();e.stopImmediatePropagation();if(b.disabled)return;
  const status=document.getElementById('fpGiftStatus'),friendId=document.getElementById('fpGiftFriend')?.value;
  if(!friendId){status.textContent='Bitte einen Freund auswählen.';return}
  const amount=Number(document.getElementById('fpGiftAmount')?.value);
  if(!Number.isSafeInteger(amount)||amount<1||amount>100000){status.textContent='Bitte eine gültige Anzahl Diamanten eingeben.';return}
  const friend=friends.find(f=>String(f.id)===String(friendId));if(!friend)return;
  const description=amount+' Diamanten';
  if(!confirm(description+' an '+friend.name+' senden?'))return;
  b.disabled=true;status.textContent='Geschenk wird gesendet ...';
  try{await request('POST','/api/gifts/send',{friendId,kind:'diamonds',amount});status.textContent='🎉 Geschenk erfolgreich an '+friend.name+' gesendet!';const g=await request('GET','/api/game');balance=g.user?.diamonds??balance;const p=document.querySelector('#fpGiftForm>.sub');if(p)p.textContent='Dein Guthaben: 💎 '+balance+' · Keine Geschenk-Codes';}
  catch(err){status.textContent='Fehler: '+err.message}finally{b.disabled=false}
 },true);
 setInterval(()=>{if(!loading&&Date.now()-lastLoad>5000) {if(giftPage())load();else request('GET','/api/game').then(g=>{booster=g.booster||{uses:0};drawBadge()}).catch(()=>{})}},5000);
 if(giftPage())load();
})();
