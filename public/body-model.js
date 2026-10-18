/* FitnessPlus - interactive three-dimensional human body, front/back rotation */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
const shell=document.getElementById('page');
let renderer,scene,camera,person,raf=0,container=null,pointer=null,angle=0.18,dragged=false,parts=[],muscles={},selected='';
const skin=new THREE.MeshStandardMaterial({color:'#d7b49a',roughness:.83});
const outfit=new THREE.MeshStandardMaterial({color:'#a8beb8',roughness:.82});
const shorts=new THREE.MeshStandardMaterial({color:'#68867f',roughness:.89});
const dark=new THREE.MeshStandardMaterial({color:'#365a56',roughness:.92});
const white=new THREE.MeshStandardMaterial({color:'#f3faf7',roughness:.77});
const edge=new THREE.MeshStandardMaterial({color:'#829c94',roughness:.9});
const activeMat=new THREE.MeshStandardMaterial({color:'#05bb94',emissive:'#007b62',emissiveIntensity:.20,roughness:.43,metalness:.05});
const selectMat=new THREE.MeshStandardMaterial({color:'#ffae48',emissive:'#b45b02',emissiveIntensity:.22,roughness:.51});
const globe=new THREE.SphereGeometry(1,18,14);
function ell(parent,x,y,z,sx,sy,sz,material,group){
 const m=new THREE.Mesh(globe,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);
 if(group)parts.push({mesh:m,group,base:material});return m;
}
function limb(parent,a,b,r1,r2,mat,group){
 const vec=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,vec.length(),15,1),mat);
 mesh.position.copy(new THREE.Vector3(...a).addScaledVector(vec,.5));
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
 parent.add(mesh);
 if(group)parts.push({mesh,group,base:mat});return mesh;
}
function makeHuman(){
 person=new THREE.Group();scene.add(person);person.position.y=-.03;
 // Anthropomorphic athletic proportions; styled as a neutral clothed figure.
 ell(person,0,2.64,0,.124,.15,.115,skin); // neck
 ell(person,0,2.92,0,.254,.317,.229,skin);
 ell(person,0,2.74,.205,.14,.115,.07,skin); // chin
 ell(person,-.237,2.92,-.01,.045,.09,.075,skin);
 ell(person,.237,2.92,-.01,.045,.09,.075,skin);
 ell(person,0,2.955,.221,.055,.105,.083,skin); // nose
 for(const side of [-1,1]){
  ell(person,side*.105,2.977,.205,.036,.019,.018,white);
  ell(person,side*.105,2.975,.225,.016,.017,.008,dark);
  ell(person,side*.105,3.039,.204,.080,.012,.016,dark);
 }
 ell(person,0,2.812,.221,.080,.010,.010,dark); // mouth
 // torso and natural shoulder slope
 ell(person,0,2.05,0,.385,.58,.223,outfit);
 ell(person,0,1.57,0,.33,.20,.205,shorts);
 // chest and abdominal contours, clickable groups
 for(const side of [-1,1]){
  ell(person,side*.195,2.32,.158,.202,.165,.095,outfit,'Brust');
 }
 ell(person,0,1.96,.168,.270,.31,.095,outfit,'Bauch');
 ell(person,0,2.25,-.16,.352,.395,.095,outfit,'Rücken');
 ell(person,0,1.92,-.16,.273,.22,.08,outfit,'Rücken');
 for(const side of [-1,1]){
  const sx=side*.43;
  ell(person,sx,2.44,0,.20,.21,.20,outfit,'Schultern');
  limb(person,[side*.49,2.35,0],[side*.59,1.83,.015],.17,.135,outfit,'Arme');
  ell(person,side*.595,1.85,.015,.137,.136,.140,outfit,'Arme');
  limb(person,[side*.59,1.78,.015],[side*.66,1.27,.13],.13,.091,skin,'Arme');
  ell(person,side*.67,1.19,.14,.102,.146,.062,skin,'Arme'); // palm
  for(let f=0;f<4;f++)ell(person,side*(.62+f*.030),1.068,.158,.022,.087,.026,skin);
  // hips, quads, hamstrings, knees and tapered shins
  ell(person,side*.205,1.48,0,.236,.25,.235,shorts);
  limb(person,[side*.205,1.35,0],[side*.23,.68,.025],.205,.138,shorts,'Beine');
  ell(person,side*.23,.68,.034,.147,.155,.15,skin,'Beine');
  limb(person,[side*.23,.60,.025],[side*.235,.04,.07],.14,.077,skin,'Beine');
  ell(person,side*.235,.035,.20,.138,.095,.277,white); // shoes
  ell(person,side*.235,.045,.43,.133,.047,.035,edge);
 }
 // style: soft line of collar and pelvis bands
 ell(person,0,2.58,.11,.22,.032,.05,edge);
 ell(person,0,1.48,.15,.35,.035,.07,dark);
}
function init(){
 if(renderer)return;
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(33,1,0.1,30);camera.position.set(0,1.64,7.7);camera.lookAt(0,1.57,0);
 scene.add(new THREE.HemisphereLight('#ffffff','#8da9a1',2.2));
 const main=new THREE.DirectionalLight('#ffffff',2.5);main.position.set(-3,6,6);scene.add(main);
 const rim=new THREE.DirectionalLight('#9fe7db',1.1);rim.position.set(3,4,-5);scene.add(rim);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setSize(340,430,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0xffffff,0);
 renderer.domElement.style.cssText='width:100%;max-width:360px;height:100%;display:block;margin:auto;touch-action:none;cursor:grab';
 makeHuman();
}
function colors(){
 const d=window.FPBodyModelData?.()||{};
 for(const item of parts){
  const v=d[item.group];
  const used=(v?.sets||0)>0||(v?.workouts||0)>0;
  item.mesh.material=selected===item.group?selectMat:used?activeMat:item.base;
 }
}
let loopStarted=false,eventsStarted=false;
function attach(){
 const host=document.getElementById('fp-body-3d');
 if(!host)return;
 try{init()}catch(e){host.textContent='3D-Grafik wird auf diesem Gerät nicht unterstützt.';return}
 if(host!==container){container=host;container.appendChild(renderer.domElement);selected=window.FPBodyModelSelected?.()||'';colors()}
 if(!eventsStarted){events();eventsStarted=true}
 if(!loopStarted){loopStarted=true;animate()}
}
function pick(x,y){
 const rect=renderer.domElement.getBoundingClientRect();
 const mouse=new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
 const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
 const hits=ray.intersectObjects(parts.map(o=>o.mesh),false);
 const hit=hits.find(h=>parts.some(p=>p.mesh===h.object&&p.group));
 if(hit){const item=parts.find(p=>p.mesh===hit.object);selected=item.group;window.FPBodyModelSelect?.(item.group);colors()}
}
function events(){
 const canvas=renderer.domElement;
 canvas.onpointerdown=e=>{pointer={x:e.clientX,y:e.clientY,angle,dragged:false};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!pointer)return;const delta=e.clientX-pointer.x;if(Math.abs(delta)>7)pointer.dragged=true;angle=pointer.angle+delta*.012};
 canvas.onpointerup=e=>{if(!pointer)return;const isTap=!pointer.dragged;pointer=null;if(isTap)pick(e.clientX,e.clientY)};
 canvas.onpointercancel=()=>{pointer=null};
}
function animate(){
 raf=requestAnimationFrame(animate);
 if(!renderer||!container||!container.isConnected||document.hidden)return;
 person.rotation.y=angle;
 colors();
 const rect=container.getBoundingClientRect();
 if(rect.width>0){const w=Math.max(220,Math.min(480,rect.width));const h=Math.round(w*1.23);if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
 renderer.render(scene,camera);
}
window.FPBodyRotate=(dir)=>{angle+=Number(dir)*Math.PI/4};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-fpbodyturn]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.FPBodyRotate(b.dataset.fpbodyturn)},true);
let scheduled=false;
const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;attach()})});
observer.observe(shell,{childList:true});
attach();
