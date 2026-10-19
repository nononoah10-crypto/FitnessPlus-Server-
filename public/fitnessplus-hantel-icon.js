/* FitnessPlus dumbbell icon renderer; visual-only enhancement */
(() => {
'use strict';
const TOKEN='◉━◉';
const NS='http://www.w3.org/2000/svg';
const make=(name,attrs={})=>{const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el};
function icon(){
 const s=make('svg',{viewBox:'0 0 64 40',width:'1.55em',height:'1em',role:'img','aria-label':'Hantel',style:'display:inline-block;vertical-align:-.12em;max-width:64px;max-height:40px;overflow:visible;flex:none;color:#078d72'});
 s.append(make('rect',{x:8,y:10,width:8,height:20,rx:2,fill:'#18b894'}));
 s.append(make('rect',{x:17,y:5,width:8,height:30,rx:2,fill:'#087f69'}));
 s.append(make('rect',{x:25,y:17,width:14,height:6,rx:2,fill:'#183c34'}));
 s.append(make('rect',{x:39,y:5,width:8,height:30,rx:2,fill:'#087f69'}));
 s.append(make('rect',{x:48,y:10,width:8,height:20,rx:2,fill:'#18b894'}));
 return s;
}
let busy=false;
function update(){
 if(busy||!document.body)return;busy=true;
 try{
 const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const found=[];let n;
 while((n=walk.nextNode())){
  if(n.nodeValue.includes(TOKEN)&&!n.parentElement?.closest('script,style,textarea,noscript'))found.push(n);
 }
 for(const node of found){
  const pieces=node.nodeValue.split(TOKEN),f=document.createDocumentFragment();
  pieces.forEach((piece,i)=>{if(i)f.appendChild(icon());if(piece)f.appendChild(document.createTextNode(piece))});
  node.replaceWith(f);
 }
 }finally{busy=false}
}
let queued=false;
function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;update()})}
function start(){update();new MutationObserver(queue).observe(document.body,{childList:true,characterData:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
