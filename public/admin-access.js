(() => {
'use strict';
const style=document.createElement('style');
style.textContent=`
#fpAdminGate{position:fixed;inset:0;z-index:20000;background:rgba(6,24,20,.85);display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(9px)}
#fpAdminGate.open{display:flex}#fpAdminGate .fpGateCard{background:#fff;color:#123e32;width:min(100%,430px);max-height:92dvh;overflow:auto;border-radius:27px;padding:22px;box-shadow:0 22px 80px #0006}
#fpAdminGate h2{font-size:22px;margin:5px 0 8px}#fpAdminGate p{font-size:13px;line-height:1.5;color:#607e72}#fpAdminGate label{font-size:13px;font-weight:700;display:block;margin:11px 0 4px}#fpAdminGate input{display:block;width:100%;font-size:17px;padding:13px;border:1px solid #c7ded3;border-radius:13px;background:#f7fcf9;color:#143b32}#fpAdminGate button{font-size:14px;min-height:44px;border-radius:13px;border:0;padding:11px;background:#087e68;color:white;font-weight:750}#fpAdminGate .fpGateLight{background:#e5f4ee;color:#174b3d}#fpAdminGate .fpGateRow{display:flex;gap:8px;align-items:center;justify-content:space-between}#fpAdminGate .fpGateMsg{font-size:13px;color:#a32335;margin-top:8px;min-height:20px}#fpAdminGate .fpGateSubmit{width:100%;margin-top:16px}#fpAdminGate.fpPanelMode{background:#e7f3ec;padding:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;backdrop-filter:none}#fpAdminGate .fpPanelHeader{display:flex;gap:8px;align-items:center;justify-content:space-between;background:#fff;color:#17483e;width:100%;padding:calc(9px + env(safe-area-inset-top)) 12px 10px}#fpAdminGate .fpPanelHeader button{min-height:39px;font-size:12px;padding:9px 11px}#fpAdminGate iframe{border:0;width:100%;flex:1;min-height:0;background:#eaf6f1}
`;
document.head.append(style);
const gate=document.createElement('div');gate.id='fpAdminGate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-label','Geheime FitnessPlus Verwaltung');document.body.append(gate);
let configured=false,working=false,pinCount=0,pinLast=0;
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(endpoint,method='GET',data){const r=await fetch('/api/admin-code/'+endpoint,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'Serverfehler');return x}
function msg(text){const e=gate.querySelector('.fpGateMsg');if(e)e.textContent=text||''}
function renderForm(){
 gate.classList.remove('fpPanelMode');
 gate.innerHTML=`<section class="fpGateCard"><div class="fpGateRow"><h2>🔐 FitnessPlus Admin</h2><button type="button" class="fpGateLight" id="fpGateClose">Schließen</button></div><p>${configured?'Deinen persönlichen Code eingeben.':'Lege jetzt deinen persönlichen Admin-Code fest.'}</p><form id="fpGateForm"><label for="fpGateCode">${configured?'Code eingeben':'Code festlegen (6–12 Ziffern)'}</label><input id="fpGateCode" type="password" inputmode="numeric" pattern="[0-9]{6,12}" minlength="6" maxlength="12" autocomplete="off" required>${configured?'':`<label for="fpGateRepeat">Code wiederholen</label><input id="fpGateRepeat" type="password" inputmode="numeric" pattern="[0-9]{6,12}" minlength="6" maxlength="12" autocomplete="off" required>`}<div id="fpFirstVerify" style="display:none"><p>Zur sicheren Ersteinrichtung bestätige bitte einmal dein bereits vorhandenes Admin-Konto. Danach ist nur noch dein Code nötig.</p><label for="fpGateName">Admin-Benutzername</label><input id="fpGateName" autocomplete="username"><label for="fpGatePass">Admin-Passwort</label><input id="fpGatePass" type="password" autocomplete="current-password"></div><button class="fpGateSubmit" type="submit">${configured?'Verwaltung öffnen':'Code speichern und öffnen'}</button><div class="fpGateMsg" role="status"></div></form></section>`;
 gate.querySelector('#fpGateClose').onclick=close;
 gate.querySelector('#fpGateForm').onsubmit=async e=>{
  e.preventDefault();if(working)return;
  const code=gate.querySelector('#fpGateCode').value;
  if(!/^[0-9]{6,12}$/.test(code)){msg('Bitte 6 bis 12 Ziffern eingeben.');return}
  if(!configured&&code!==gate.querySelector('#fpGateRepeat').value){msg('Die Codes stimmen nicht überein.');return}
  working=true;msg('Verbindung wird geprüft …');
  try{
   if(configured){await api('login','POST',{code})}
   else{
    const verify=gate.querySelector('#fpFirstVerify');
    const payload={code};
    if(verify?.style.display!=='none'){
     payload.name=gate.querySelector('#fpGateName').value;
     payload.password=gate.querySelector('#fpGatePass').value;
    }
    await api('setup','POST',payload);configured=true;
   }
   showPanel();
  }catch(err){
   if(!configured&&err.message.includes('Admin-Konto konnte nicht bestätigt werden')){
    gate.querySelector('#fpFirstVerify').style.display='block';
    msg('Für die erste Einrichtung ist einmalig die Bestätigung deines Admin-Kontos erforderlich.');
    gate.querySelector('#fpGateName').focus();
   }else if(err.message.includes('bereits eingerichtet')){configured=true;renderForm()}
   else{msg(err.message)}
  }finally{working=false}
 };
 gate.querySelector('#fpGateCode')?.focus();
}
function showPanel(){gate.classList.add('fpPanelMode');gate.innerHTML=`<div class="fpPanelHeader"><strong>🔐 FitnessPlus Verwaltung</strong><button type="button" id="fpChangeCode" class="fpGateLight">Code ändern</button><button type="button" id="fpGateLock">Schließen</button></div><iframe src="/admin-control.html" title="FitnessPlus Serververwaltung"></iframe>`;gate.querySelector('#fpGateLock').onclick=async()=>{try{await fetch('/api/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'})}catch(_){}close()};gate.querySelector('#fpChangeCode').onclick=renderChange;}
function renderChange(){gate.classList.remove('fpPanelMode');gate.innerHTML=`<section class="fpGateCard"><div class="fpGateRow"><h2>Code ändern</h2><button id="fpChangeCancel" class="fpGateLight">Zurück</button></div><form id="fpChangeForm"><label>Alter Code</label><input id="fpOld" type="password" inputmode="numeric" required><label>Neuer Code (6–12 Ziffern)</label><input id="fpNext" type="password" inputmode="numeric" pattern="[0-9]{6,12}" required><label>Neuen Code wiederholen</label><input id="fpRepeat" type="password" inputmode="numeric" required><button type="submit" class="fpGateSubmit">Code speichern</button><div class="fpGateMsg" role="status"></div></form></section>`;gate.querySelector('#fpChangeCancel').onclick=showPanel;gate.querySelector('#fpChangeForm').onsubmit=async e=>{e.preventDefault();const oldCode=gate.querySelector('#fpOld').value,newCode=gate.querySelector('#fpNext').value;if(!/^\d{6,12}$/.test(newCode)||newCode!==gate.querySelector('#fpRepeat').value){msg('Neuen Code prüfen.');return}try{await api('change','POST',{oldCode,newCode});msg('Code geändert. Bitte mit dem neuen Code anmelden.');setTimeout(()=>{renderForm()},1300)}catch(err){msg(err.message)}};}
function close(){gate.classList.remove('open','fpPanelMode');gate.innerHTML=''}
async function open(){gate.classList.add('open');gate.classList.remove('fpPanelMode');gate.innerHTML='<section class="fpGateCard"><h2>FitnessPlus Admin</h2><p>Verbindung wird geprüft …</p></section>';try{const st=await api('status');configured=!!st.configured;renderForm()}catch(err){gate.innerHTML=`<section class="fpGateCard"><h2>Verbindung fehlgeschlagen</h2><p>${escapeHtml(err.message)}</p><button id="fpGateClose">Schließen</button></section>`;gate.querySelector('#fpGateClose').onclick=close;}}
// Capture taps before the old local developer-mode click handler gets them.
window.addEventListener('click',e=>{if(!e.target.closest?.('.top .logo'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const now=Date.now();pinCount=now-pinLast<4000?pinCount+1:1;pinLast=now;if(pinCount>=7){pinCount=0;open()}},true);
})();
