'use strict';
const $=id=>document.getElementById(id);let me=null;
const safe=t=>String(t??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const notify=(v,bad=false)=>{$('msg').textContent=v;$('msg').className=bad?'error':'good'};
async function api(route,method='GET',data){const r=await fetch('/api/'+route,{method,credentials:'same-origin',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});let x=await r.json();if(!r.ok)throw Error(x.error||'Fehler');return x}
async function doIt(fn){try{await fn();notify('Erledigt.')}catch(e){notify(e.message,true)}}
async function refresh(){try{me=(await api('me')).user;$('auth').classList.add('hide');$('account').classList.remove('hide');$('admin').classList.toggle('hide',me.role!=='admin');$('welcome').textContent='Hallo '+me.name;$('stats').textContent=`Online-Level ${me.level} · ${me.xp} XP · ${me.diamonds} 💎`;$('code').textContent=me.friendCode;await Promise.all([refreshFriends(),refreshGifts(),refreshAnnouncement(),me.role==='admin'?refreshUsers():Promise.resolve()])}catch{$('auth').classList.remove('hide');$('account').classList.add('hide');$('admin').classList.add('hide')}}
async function refreshFriends(){const d=await api('friends');$('friends').innerHTML=d.friends.length?d.friends.map(x=>`<div class="item row"><span><b>${safe(x.name)}</b><small>Level ${x.level}</small></span><button class="alt" data-remove="${safe(x.id)}">Entfernen</button></div>`).join(''):'<p class="muted">Noch keine Freunde.</p>'; $('directGiftFriends').innerHTML=d.friends.length?d.friends.map(x=>`<div class="item row"><b>${safe(x.name)}</b><button data-send="${safe(x.id)}">🎁 Senden</button></div>`).join(''):'<p class="muted">Füge zuerst Freunde hinzu.</p>'}
async function refreshGifts(){const d=await api('gifts/inbox');$('directGiftInbox').innerHTML=d.gifts.length?d.gifts.map(x=>`<div class="item row"><span>🎁 ${safe(x.item)} von ${safe(x.sender)}</span><button data-claim="${safe(x.id)}">Annehmen</button></div>`).join(''):'<p class="muted">Noch keine Geschenke.</p>'}
async function refreshAnnouncement(){let x=(await api('announcements')).message;$('announcement').innerHTML=x?`<b>${safe(x.title)}</b><p>${safe(x.message).replace(/\n/g,'<br>')}</p>`:'Aktuell keine Mitteilung.'}
async function refreshUsers(){let d=await api('admin/users');$('users').innerHTML=d.users.map(x=>`<option value="${safe(x.id)}">${safe(x.name)} (Level ${x.level})</option>`).join('')}
$('login').onclick=()=>doIt(async()=>{await api('login','POST',{name:$('name').value,password:$('password').value});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('register').onclick=()=>doIt(async()=>{await api('register','POST',{name:$('name').value,password:$('password').value});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('logout').onclick=()=>doIt(async()=>{await api('logout','POST',{});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('copy').onclick=()=>doIt(async()=>{await navigator.clipboard.writeText(me.friendCode)});
$('addFriendByName').onclick=()=>doIt(async()=>{await api('friends/add-name','POST',{name:$('friendName').value.trim()});$('friendName').value='';await refreshFriends()});
$('directGiftFriends').onclick=e=>{const b=e.target.closest('[data-send]');if(b&&confirm('Geschenk für Diamanten kaufen und senden?'))doIt(async()=>{await api('gifts/send','POST',{friendId:b.dataset.send,item:$('directGiftItem').value});await refresh();});};
$('directGiftInbox').onclick=e=>{const b=e.target.closest('[data-claim]');if(b)doIt(async()=>{await api('gifts/claim','POST',{giftId:b.dataset.claim});await refreshGifts();await refresh();});};
$('friends').onclick=e=>{let b=e.target.closest('[data-remove]');if(b&&confirm('Freund entfernen?'))doIt(async()=>{await api('friends/remove','POST',{userId:b.dataset.remove});await refreshFriends()})};
$('give').onclick=()=>doIt(async()=>{await api('admin/diamonds','POST',{userId:$('users').value,amount:Number($('diamonds').value)});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('setLevel').onclick=()=>doIt(async()=>{await api('admin/level','POST',{userId:$('users').value,level:Number($('level').value)});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('resetLevel').onclick=()=>{if(confirm('Level wirklich auf 1 zurücksetzen?'))doIt(async()=>{await api('admin/level','POST',{userId:$('users').value,level:1});await refresh()})};
$('publish').onclick=()=>doIt(async()=>{await api('admin/announcement','POST',{title:$('title').value,message:$('message').value});await refreshAnnouncement()});
$('clearMsg').onclick=()=>doIt(async()=>{await api('admin/announcement','POST',{title:'',message:''});await refreshAnnouncement()});
const quickEvents = {doubleXp:{doubleXp:true},wheel:{wheel:true},season:{season:true},gift:{giftDiamonds:50},off:{}};
document.querySelectorAll('[data-quick]').forEach(btn => btn.onclick = () => doIt(async () => {
 const action = btn.dataset.quick;
 const captions = {doubleXp:'Doppel-XP',wheel:'Glücksrad',season:'Season Pass',gift:'50 Diamanten für alle (einmal pro Konto)',off:'alle Events beenden'};
 if(!confirm('Wirklich '+captions[action]+'? Die bisherige Event-Konfiguration wird ersetzt.'))return;
 btn.disabled = true;
 try {
  const payload = {giftDiamonds:0,doubleXp:false,season:false,wheel:false,...quickEvents[action]};
  const result = await api('admin/events','POST',payload);
  $('quickStatus').textContent = 'Aktuell: '+(action==='off'?'Keine Events aktiv':captions[action]);
  $('gift').value=payload.giftDiamonds;
  $('doubleXp').checked=payload.doubleXp;
  $('season').checked=payload.season;
  $('wheel').checked=payload.wheel;
 } finally {btn.disabled=false;}
}));
$('saveEvents').onclick=()=>doIt(async()=>{await api('admin/events','POST',{giftDiamonds:Number($('gift').value),doubleXp:$('doubleXp').checked,season:$('season').checked,wheel:$('wheel').checked})});
refresh();
