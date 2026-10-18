/* FitnessPlus anatomische 3D-Muskelkarte. Asset: Ecorche CC BY-SA 4.0
   https://github.com/Charleeh/ecorche — BodyParts3D / Z-Anatomy. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const page=document.getElementById('page');
const neutral=new THREE.MeshStandardMaterial({color:0xb9c4c1,roughness:.68,metalness:.02});
const trained=new THREE.MeshStandardMaterial({color:0x0ac9a0,roughness:.45,metalness:.04,emissive:0x007c65,emissiveIntensity:.24});
const chosen=new THREE.MeshStandardMaterial({color:0xffae52,roughness:.46,emissive:0xb67412,emissiveIntensity:.20});
let scene,camera,renderer,figure,host=null,meshes=[],pending=false,loaded=false,error='',angle=0.18,drag=null,selected='',watching=false;
function group(name){
 const n=(name||'').toLowerCase();
 if(/pectoralis|serratus anterior/.test(n))return 'Brust';
 if(/rectus abdominis|oblique|transversus abdominis/.test(n))return 'Bauch';
 if(/deltoid|supraspinatus|infraspinatus|teres minor|teres major/.test(n))return 'Schultern';
 if(/biceps brachii|triceps brachii|brachialis|brachioradialis|pronator|supinator|flexor|extensor/.test(n))return 'Arme';
 if(/latissimus|trapezius|rhomboid|erector spinae|multifidus|longissimus|spinalis|iliocostalis|levator scapulae/.test(n))return 'Rücken';
 if(/gluteus|biceps femoris|quadriceps|vastus|rectus femoris|gastrocnemius|soleus|tibialis|adductor|sartorius|gracilis|semitendinosus|semimembranosus|peroneus|fibularis|popliteus/.test(n))return 'Beine';
 return '';
}
function mark(){
 const current=window.FPBodyModelData?.()||{};
 for(const obj of meshes){
  const g=obj.userData.fpGroup;
  obj.material=selected===g&&g?chosen:(g&&(current[g]?.sets>0||current[g]?.workouts>0))?trained:neutral;
 }
}
function init(){
 if(renderer)return;
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(30,340/430,.04,25);
 camera.position.set(0,1,3.75);camera.lookAt(0,.89,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x6c958b,2.0));
 const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(-2,5,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc9ffee,1.15);fill.position.set(2,3,-4);scene.add(fill);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.45;
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;max-width:360px;margin:auto;touch-action:none;cursor:grab';
}
function display(msg){
 const n=host?.querySelector('.fp-model-status');if(n)n.textContent=msg;
}
function fetchModel(){
 if(pending||loaded)return;pending=true;display('Anatomiemodell wird geladen …');
 new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('https://cdn.jsdelivr.net/gh/Charleeh/ecorche@main/model/ecorche.meshopt.glb',gltf=>{
  figure=gltf.scene;
  figure.rotation.y=angle;
  const bounds=new THREE.Box3().setFromObject(figure);
  const size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  // Asset is metres, Y up, front +Z. Center horizontally while keeping soles on ground.
  figure.position.x-=center.x;
  figure.position.z-=center.z;
  if(size.y>0)figure.scale.multiplyScalar(1.75/size.y);
  figure.position.y-=bounds.min.y*(1.75/size.y);
  figure.traverse(o=>{
   if(!o.isMesh)return;
   if(o.userData.layer!=='superficial muscles'){o.visible=false;return}
   const g=group(o.name||'');
   o.userData.fpGroup=g;
   o.material=neutral;
   o.frustumCulled=false;
   meshes.push(o);
  });
  scene.add(figure);loaded=true;pending=false;
  selected=window.FPBodyModelSelected?.()||'';
  mark();display('');
 },e=>{if(e.total)display('Anatomiemodell: '+Math.round(e.loaded/e.total*100)+' %')},e=>{
  pending=false;error='3D-Modell konnte nicht geladen werden. Prüfe die Modelldatei auf dem Server.';
  display(error);console.warn('FitnessPlus 3D',e);
 });
}
function attach(){
 const target=document.getElementById('fp-body-3d');
 if(!target)return;
 try{init()}catch(e){target.textContent='3D wird auf diesem Gerät nicht unterstützt.';return}
 if(host!==target){
  host=target;
  host.style.position='relative';
  host.textContent='';
  const msg=document.createElement('div');msg.className='fp-model-status';
  msg.style.cssText='position:absolute;inset:45% 6px auto;font:600 12px system-ui;color:#64857d;text-align:center;pointer-events:none';
  host.append(renderer.domElement,msg);
  const credit=document.createElement('div');credit.style.cssText='font:10px system-ui;color:#607b77;text-align:center;padding:5px 10px';
  credit.innerHTML='Anatomie: <a href="https://github.com/Charleeh/ecorche" target="_blank" rel="noopener noreferrer">Écorché</a> · CC BY-SA 4.0 · BodyParts3D / Z-Anatomy';
  host.append(credit);
  const canvas=renderer.domElement;
  canvas.onpointerdown=e=>{drag={x:e.clientX,a:angle,moved:false};canvas.setPointerCapture?.(e.pointerId)};
  canvas.onpointermove=e=>{if(!drag)return;const delta=e.clientX-drag.x;if(Math.abs(delta)>7)drag.moved=true;angle=drag.a+delta*.012;};
  canvas.onpointerup=e=>{if(drag&&!drag.moved)pick(e);drag=null};
  canvas.onpointercancel=()=>{drag=null};
 }
 if(!loaded)fetchModel();
 else{selected=window.FPBodyModelSelected?.()||'';mark();display('')}
}
function pick(e){
 if(!loaded)return;
 const rect=renderer.domElement.getBoundingClientRect();
 const mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
 const hit=ray.intersectObjects(meshes.filter(m=>m.visible),false).find(h=>h.object.userData.fpGroup);
 if(hit){selected=hit.object.userData.fpGroup;window.FPBodyModelSelect?.(selected);mark()}
}
function loop(){
 requestAnimationFrame(loop);
 if(!host?.isConnected||!renderer||document.hidden)return;
 const bounds=host.getBoundingClientRect();
 const width=Math.round(Math.max(220,Math.min(360,bounds.width)));
 const height=Math.round(width*1.17);
 if(renderer.domElement.width!==Math.round(width*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(height*renderer.getPixelRatio())){
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
 }
 if(figure)figure.rotation.y=angle;
 if(loaded)mark();
 renderer.render(scene,camera);
}
window.FPBodyRotate=dir=>{angle+=Number(dir)*Math.PI/4};
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-fpbodyturn]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();window.FPBodyRotate(b.dataset.fpbodyturn);
},true);
let queued=false;
const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;attach()})});
observer.observe(page,{childList:true,subtree:false});
attach();loop();
