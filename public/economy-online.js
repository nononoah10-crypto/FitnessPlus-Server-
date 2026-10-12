// Online economy uses existing authenticated api(), doIt(), refresh() from online.js.
'use strict';
async function economyRefresh(){try{
 const {events:e}=await api('game/events'),c=e.config||{};
 $('eventStatus').textContent=`Saison: ${c.season?'aktiv':'aus'} · ${e.progress} Online-Übungen · Glücksrad: ${c.wheel?'aktiv':'aus'}`;
 $('seasonTiers').innerHTML=c.season?e.tiers.map(t=>`<div class="item row"><span>${t.at} Übungen: ${t.diamonds} 💎</span><button data-tier="${t.at}" ${t.claimed||e.progress<t.at?'disabled':''}>${t.claimed?'✓ Abgeholt':'Abholen'}</button></div>`).join(''):'';
 $('wheelSpin').disabled=!c.wheel||e.wheelUsed;
 $('wheelSpin').textContent=e.wheelUsed?'🎡 Heute schon gedreht':'🎡 Glücksrad drehen';
 $('eventGift').disabled=!(Number(c.giftDiamonds)>0)||e.giftClaimed;
 $('eventGift').textContent=e.giftClaimed?'🎁 Geschenk schon abgeholt':`🎁 ${Number(c.giftDiamonds)||0} Diamanten abholen`;
 }catch(e){$('eventStatus').textContent=e.message}}
const economyAction=fn=>doIt(async()=>{await fn();await Promise.all([economyRefresh(),refresh()]);window.parent.postMessage({type:'fitnessplus-session-changed'},location.origin)});
$('seasonTiers').addEventListener('click',e=>{let b=e.target.closest('[data-tier]');if(b)economyAction(async()=>{let x=await api('game/season/claim','POST',{tier:Number(b.dataset.tier)});notify('🏆 +'+x.diamonds+' Diamanten!')})});
$('wheelSpin').onclick=()=>economyAction(async()=>{let x=await api('game/wheel','POST',{});alert('🎡 Du hast '+x.diamonds+' 💎 gewonnen!')});
$('eventGift').onclick=()=>economyAction(async()=>{let x=await api('game/event/gift','POST',{});alert('🎁 '+x.diamonds+' 💎 erhalten!')});
$('createGift').onclick=()=>economyAction(async()=>{let x=await api('game/gift/create','POST',{friendCode:$('giftFriend').value.trim(),item:$('giftItem').value});$('createdCode').textContent=x.code;alert('Geschenkcode für '+x.recipient+': '+x.code)});
$('redeemGift').onclick=()=>economyAction(async()=>{await api('game/gift/redeem','POST',{code:$('redeemCode').value.trim()});$('redeemCode').value='';alert('🎁 Booster aktiviert!')});
// Refresh on login events and after admin config changes.
const oldRefresh=refresh;refresh=async function(){await oldRefresh();if(me)await economyRefresh()};
const oldSaveEvents=$('saveEvents').onclick;$('saveEvents').onclick=async()=>{await oldSaveEvents();await economyRefresh()};
