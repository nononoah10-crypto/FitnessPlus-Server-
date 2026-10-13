/* FitnessPlus: secure online gift inbox for existing booster gift endpoints. */
(()=>{
 'use strict';
 const page=document.getElementById('page');if(!page)return;
 const names={boost2small:'Doppel-Power',boost2long:'Trainings-Turbo',boost3mega:'Mega-XP'};
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let gifts=[],authenticated=false,loading=false,claiming=false,lastPoll=0;
 const request=async(method,url,body)=>{
  const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Serverfehler');return data;
 };
 const view=()=>{
  if(typeof s==='undefined')return '';
  if(s.view==='store')return 'shop';
  if(s.view==='gifts')return 'gifts';
  if(s.tab==='home'&&!s.view)return 'home';
  return '';
 };
 function panel(){
  const where=view();if(!where||!authenticated)return;
  const existing=document.getElementById('fpOnlineGiftInbox');
  const fingerprint=where+'|'+gifts.map(g=>g.id).join(',');
  if(existing){if(existing.dataset.fingerprint===fingerprint)return;existing.remove();}
  const section=document.createElement('section');section.id='fpOnlineGiftInbox';section.dataset.where=where;section.dataset.fingerprint=fingerprint;section.className='card';section.style.margin='14px 0';
  section.innerHTML='<h3 style="margin:0 0 8px">🎁 '+(where==='home'?'Deine Geschenk-Benachrichtigungen':'Meine Geschenke')+'</h3>'+
   (gifts.length?gifts.map(g=>'<div style="border-top:1px solid rgba(128,128,128,.3);padding:12px 0"><b>🎁 '+escapeHtml(names[g.item]||g.item)+'</b><p style="margin:6px 0">Von: <strong>'+escapeHtml(g.sender)+'</strong></p><button class="primary" type="button" data-fp-claim="'+escapeHtml(g.id)+'">Geschenk einlösen</button></div>').join(''):'<p class="sub" style="margin:0">Du hast aktuell keine offenen Geschenke.</p>')+
   '<p id="fpInboxStatus" class="sub" role="status" aria-live="polite"></p>';
  if(where==='gifts'){const form=document.getElementById('fpGiftForm');if(form)form.after(section);else page.append(section);}
  else page.prepend(section);
 }
 async function refresh(){
  if(loading||claiming||document.hidden)return;
  loading=true;
  try{const data=await request('GET','/api/gifts/inbox');authenticated=true;gifts=Array.isArray(data.gifts)?data.gifts:[];panel();}
  catch(e){authenticated=false;gifts=[];document.getElementById('fpOnlineGiftInbox')?.remove();}
  finally{loading=false;lastPoll=Date.now();}
 }
 document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-fp-claim]');if(!button||claiming)return;
  e.preventDefault();e.stopPropagation();
  const id=button.getAttribute('data-fp-claim');if(!gifts.some(g=>String(g.id)===id))return;
  claiming=true;button.disabled=true;button.textContent='Wird eingelöst …';
  try{
   await request('POST','/api/gifts/claim',{giftId:id});
   gifts=gifts.filter(g=>String(g.id)!==id);panel();
   const status=document.getElementById('fpInboxStatus');if(status)status.textContent='✅ Geschenk erfolgreich eingelöst!';
  }catch(err){button.disabled=false;button.textContent='Geschenk einlösen';const status=document.getElementById('fpInboxStatus');if(status)status.textContent='Einlösen nicht möglich: '+err.message;}
  finally{claiming=false;}
 },true);
 let scheduled=false;
 new MutationObserver(()=>{
  if(scheduled)return;scheduled=true;
  queueMicrotask(()=>{scheduled=false;if(view())panel();else document.getElementById('fpOnlineGiftInbox')?.remove();});
 }).observe(page,{childList:true,subtree:false});
 setTimeout(refresh,1700);
 setInterval(()=>{if(Date.now()-lastPoll>20000)refresh();},20000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
