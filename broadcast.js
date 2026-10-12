(()=>{
 'use strict';
 let last = null;
 const style=document.createElement('style');
 style.textContent='#fpBroadcast{position:fixed;z-index:2147482000;left:12px;right:12px;top:calc(env(safe-area-inset-top, 0px) + 12px);max-width:540px;margin:0 auto;background:#fff;color:#173c33;border:2px solid #059b73;border-radius:17px;padding:14px 44px 14px 16px;box-shadow:0 10px 35px #0003;font:15px system-ui}#fpBroadcast strong{display:block;font-size:18px;margin-bottom:5px}#fpBroadcast button{position:absolute;top:8px;right:10px;background:#e6f5ee;color:#1a5f4a;border:0;border-radius:10px;padding:5px 10px;font-size:20px}';
 document.head.append(style);
 const panel=document.createElement('aside');panel.id='fpBroadcast';panel.hidden=true;panel.setAttribute('role','status');
 const heading=document.createElement('strong'),msg=document.createElement('div'),close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Mitteilung schließen');
 close.onclick=()=>{if(last)sessionStorage.setItem('fp_notice_hidden',last);panel.hidden=true};
 panel.append(heading,msg,close);document.body.append(panel);
 const poll=async()=>{
 try{const res=await fetch('/api/announcements',{credentials:'same-origin',cache:'no-store'});if(!res.ok){panel.hidden=true;return}
 const data=await res.json(),a=data.message;
 if(!a||!a.message){panel.hidden=true;return}
 last=String(a.id||a.createdAt||'');if(sessionStorage.getItem('fp_notice_hidden')===last){panel.hidden=true;return}
 heading.textContent=a.title||'Mitteilung';msg.textContent=a.message;panel.hidden=false;
 }catch{ /* Offline: do not interrupt training */ }
 };
 poll();setInterval(poll,45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
})();
