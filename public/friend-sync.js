/* FitnessPlus: lokale Freundes-Codes mit Online-Konten verbinden.
   Nur authentifizierte Konten koennen Freundschaften anlegen.
   Lokale Codes enthalten keinen Online-Kontonachweis: Zuordnung per exaktem Benutzernamen. */
(()=>{'use strict';
const pendingKey='fp-friends-awaiting-online-v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'[]')}catch{return []}};
const save=items=>localStorage.setItem(pendingKey,JSON.stringify([...new Set(items)].slice(-100)));
async function request(path,opts){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts});const data=await r.json().catch(()=>({}));return {ok:r.ok,status:r.status,data}}
async function sync(){
 const names=load();if(!names.length)return;
 const me=await request('/api/me');if(!me.ok)return;
 const remain=[];
 for(const name of names){
  if(name.toLocaleLowerCase('de')===String(me.data.user?.name||'').toLocaleLowerCase('de'))continue;
  try{
   const result=await request('/api/friends/add-name',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name})});
   if(!result.ok){remain.push(name);if(result.status===404)console.info('FitnessPlus: Kein Online-Konto mit dem Namen',name)}
  }catch(_){remain.push(name)}
 }
 save(remain);
}
window.FitnessPlusSyncFriend=name=>{name=String(name||'').trim();if(!name)return;save([...load(),name]);sync().catch(()=>{})};
window.FitnessPlusSyncPending=()=>sync().catch(()=>{});
window.addEventListener('focus',()=>window.FitnessPlusSyncPending());
window.addEventListener('online',()=>window.FitnessPlusSyncPending());
window.FitnessPlusSyncPending();
})();
