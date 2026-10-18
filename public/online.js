'use strict';
const $=id=>document.getElementById(id);let me=null;
const safe=t=>String(t??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const notify=(v,bad=false)=>{$('msg').textContent=v;$('msg').className=bad?'error':'good'};
async function api(route,method='GET',data){const r=await fetch('/api/'+route,{method,credentials:'same-origin',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});let x=await r.json();if(!r.ok)throw Error(x.error||'Fehler');return x}
async function doIt(fn){try{await fn();notify('Erledigt.')}catch(e){notify(e.message,true)}}
async function refresh(){try{me=(await api('me')).user;$('auth').classList.add('hide');$('account').classList.remove('hide');$('welcome').textContent='Hallo '+me.name;$('stats').textContent=`Online-Level ${me.level} · ${me.xp} XP · ${me.diamonds} 💎`;$('code').textContent=me.friendCode;await Promise.all([refreshFriends(),refreshAnnouncement(),Promise.resolve()])}catch{$('auth').classList.remove('hide');$('account').classList.add('hide');}}
async function refreshFriends(){const d=await api('friends');$('friends').innerHTML=d.friends.length?d.friends.map(x=>`<div class="item row"><span><b>${safe(x.name)}</b><small>Level ${x.level}</small></span><button class="alt" data-remove="${safe(x.id)}">Entfernen</button></div>`).join(''):'<p class="muted">Noch keine Freunde.</p>'}
async function refreshAnnouncement(){let x=(await api('announcements')).message;$('announcement').innerHTML=x?`<b>${safe(x.title)}</b><p>${safe(x.message).replace(/\n/g,'<br>')}</p>`:'Aktuell keine Mitteilung.'}
$('login').onclick=()=>doIt(async()=>{await api('login','POST',{name:$('name').value,password:$('password').value});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('register').onclick=()=>doIt(async()=>{await api('register','POST',{name:$('name').value,password:$('password').value});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('logout').onclick=()=>doIt(async()=>{await api('logout','POST',{});await refresh();parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('copy').onclick=()=>doIt(async()=>{await navigator.clipboard.writeText(me.friendCode)});
$('addFriendByName').onclick=()=>doIt(async()=>{await api('friends/add','POST',{name:$('friendName').value.trim()});$('friendName').value='';await refreshFriends()});
$('friends').onclick=e=>{let b=e.target.closest('[data-remove]');if(b&&confirm('Freund entfernen?'))doIt(async()=>{await api('friends/remove','POST',{userId:b.dataset.remove});await refreshFriends()})};
refresh();
