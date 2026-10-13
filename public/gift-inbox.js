/* FitnessPlus: online gift inbox in Diamantenshop > Geschenke, and active booster badge. */
(()=>{
 'use strict';
 const names={boost2small:'Doppel-Power',boost2long:'Trainings-Turbo',boost3mega:'Mega-XP'};
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const request=async(method,path,body)=>{const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Serverfehler');return d};
 let gifts=[],booster={multiplier:1,uses:0},online=false,claiming=false,fetching=false,lastFetch=0,status='',loadError='';
 function giftView(){try{return typeof s!=='undefined'&&s.view==='gifts'}catch{return false}}
 function label(){if(!(booster.uses>0))return '';return Number(booster.multiplier)>=3?'Mega-XP':Number(booster.multiplier)===2?'Doppel-XP':'XP-Booster'}
 function drawBadge(){let el=document.getElementById('fpActiveBoosterBadge');if(!online||!(booster.uses>0)){el?.remove();return}if(!el){el=document.createElement('div');el.id='fpActiveBoosterBadge';el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:calc(env(safe-area-inset-bottom, 0px) + 12px);left:50%;transform:translateX(-50%);z-index:9998;background:#17283d;color:#fff;border:1px solid #75a8ff;border-radius:999px;padding:8px 13px;box-shadow:0 4px 18px #0005;font:600 12px system-ui,sans-serif;max-width:90vw;text-align:center;pointer-events:none';document.body.append(el)}el.textContent='⚡ '+label()+' aktiv · '+booster.uses+' Übung'+(booster.uses===1?'':'en')+' übrig'}
 function drawInbox(){const page=document.getElementById('page');if(!page)return;let el=document.getElementById('fpOnlineGiftInbox');if(!giftView()){el?.remove();return}if(!el){el=document.createElement('section');el.id='fpOnlineGiftInbox';el.className='card';el.style.cssText='margin:16px 0;padding:16px'}const form=document.getElementById('fpGiftForm');if(form){if(el.previousElementSibling!==form)form.after(el)}else if(el.parentElement!==page)page.append(el)
  const locked=booster.uses>0;
  const html='<h3 style="margin:0 0 8px">🎁 Meine Geschenke</h3>'+
   (!online?'<p>'+esc(loadError||'Bitte melde dich mit deinem Online-Konto an, um Geschenke zu sehen.')+'</p>':
   gifts.length?gifts.map(g=>'<div style="padding:12px 0;border-top:1px solid #8885"><strong>'+esc(names[g.item]||g.item)+'</strong><p style="margin:6px 0">Von: <strong>'+esc(g.sender)+'</strong></p><button class="primary" type="button" data-fp-claim="'+esc(g.id)+'" '+(locked||claiming?'disabled':'')+'>'+(locked?'Erst aktiven Booster aufbrauchen':'Geschenk einlösen')+'</button></div>').join(''):'<p>Du hast aktuell keine offenen Geschenke.</p>')+
   (locked?'<p class="sub">Du kannst ein neues Geschenk erst einlösen, wenn dein aktiver Booster aufgebraucht ist. Deine Geschenke bleiben erhalten.</p>':'')+
   '<p class="sub" role="status" id="fpInboxStatus">'+esc(status)+'</p>';
  if(el.dataset.content!==html){el.innerHTML=html;el.dataset.content=html}
 }
 async function refresh(){if(fetching||claiming||document.hidden)return;fetching=true;try{const [g,b]=await Promise.all([request('GET','/api/gifts/inbox'),request('GET','/api/game')]);online=true;loadError='';gifts=Array.isArray(g.gifts)?g.gifts:[];booster=b.booster||{multiplier:1,uses:0}}catch(e){online=false;loadError='Geschenke konnten nicht geladen werden: '+e.message;gifts=[];booster={multiplier:1,uses:0}}finally{fetching=false;lastFetch=Date.now();drawBadge();drawInbox()}}
 document.addEventListener('click',async e=>{const btn=e.target.closest('button[data-fp-claim]');if(!btn||claiming)return;e.preventDefault();e.stopImmediatePropagation();if(booster.uses>0){status='Bitte verbrauche zuerst deinen aktiven Booster.';drawInbox();return}const giftId=btn.dataset.fpClaim;if(!gifts.some(g=>String(g.id)===giftId))return;claiming=true;btn.disabled=true;btn.textContent='Wird eingelöst …';try{await request('POST','/api/gifts/claim',{giftId});status='Geschenk erfolgreich eingelöst!';gifts=gifts.filter(g=>String(g.id)!==giftId)}catch(err){status='Einlösen nicht möglich: '+err.message}finally{claiming=false;await refresh();drawInbox()}},true);
 // Existing app re-renders the gifts page. Restore the inbox without replacing the send form.
 let scheduled=false;const page=document.getElementById('page');if(page)new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;drawInbox()})}).observe(page,{childList:true,subtree:false});
 setTimeout(refresh,1200);setInterval(()=>{drawInbox();drawBadge();if(Date.now()-lastFetch>7000)refresh()},3000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
