'use strict';
// FitnessPlus online backend. Node.js 22.13+ (node:sqlite), no npm modules.
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse}=require('@simplewebauthn/server');
const PORT=Number(process.env.PORT||3000),HOST=process.env.HOST||'0.0.0.0';
const ROOT=__dirname, WEB=path.join(ROOT,'public'), DBPATH=process.env.DB_PATH||path.join(ROOT,'fitnessplus.sqlite');
fs.mkdirSync(path.dirname(DBPATH),{recursive:true});
const db=new DatabaseSync(DBPATH);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, passhash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', friend_code TEXT UNIQUE NOT NULL, diamonds INTEGER NOT NULL DEFAULT 0 CHECK(diamonds>=0), xp INTEGER NOT NULL DEFAULT 0 CHECK(xp>=0), created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS friendship (a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, PRIMARY KEY(a,b), CHECK(a<>b));
CREATE TABLE IF NOT EXISTS gifts (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, recipient_id TEXT NOT NULL REFERENCES users(id), diamonds INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, subject TEXT NOT NULL, action TEXT NOT NULL, detail TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
db.exec(`CREATE TABLE IF NOT EXISTS cloud_state (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, revision INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);`);
// Online game economy, authoritative per account.
db.exec(`CREATE TABLE IF NOT EXISTS game_runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), started_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS game_exercises (run_id TEXT NOT NULL REFERENCES game_runs(id), exercise_index INTEGER NOT NULL, awarded_at INTEGER NOT NULL, xp INTEGER NOT NULL, PRIMARY KEY(run_id,exercise_index));
CREATE TABLE IF NOT EXISTS game_chests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), run_id TEXT NOT NULL, exercise_index INTEGER NOT NULL, created_at INTEGER NOT NULL, opened_at INTEGER, rarity TEXT, diamonds INTEGER);
CREATE TABLE IF NOT EXISTS game_boosters (user_id TEXT PRIMARY KEY REFERENCES users(id), multiplier INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS game_purchases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), item TEXT NOT NULL, price INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS game_daily (user_id TEXT NOT NULL REFERENCES users(id), award_day TEXT NOT NULL, PRIMARY KEY(user_id, award_day));`);
db.exec(`CREATE TABLE IF NOT EXISTS game_wheel (user_id TEXT NOT NULL REFERENCES users(id), event_id TEXT NOT NULL, award_day TEXT NOT NULL, diamonds INTEGER NOT NULL, PRIMARY KEY(user_id,event_id,award_day));
CREATE TABLE IF NOT EXISTS game_season_claims (user_id TEXT NOT NULL REFERENCES users(id), season_id TEXT NOT NULL, tier INTEGER NOT NULL, diamonds INTEGER NOT NULL, PRIMARY KEY(user_id,season_id,tier));
CREATE TABLE IF NOT EXISTS game_event_claims (user_id TEXT NOT NULL REFERENCES users(id), event_id TEXT NOT NULL, diamonds INTEGER NOT NULL, PRIMARY KEY(user_id,event_id));
CREATE TABLE IF NOT EXISTS game_gift_codes (id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, sender_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT REFERENCES users(id), item TEXT NOT NULL, created_at INTEGER NOT NULL, redeemed_at INTEGER, redeemed_by TEXT REFERENCES users(id));`);
db.exec(`CREATE TABLE IF NOT EXISTS direct_gifts (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT NOT NULL REFERENCES users(id), item TEXT NOT NULL, created_at INTEGER NOT NULL, claimed_at INTEGER);`);
db.exec(`CREATE TABLE IF NOT EXISTS direct_diamond_gifts (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL CHECK(amount>0), created_at INTEGER NOT NULL);`);

// Individuelle Geschenk-Aktionen fuer alle bereits registrierten Spieler.
// Einmalig pro Benutzer/Kampagne, serverseitig und atomar gebucht.
db.exec(`CREATE TABLE IF NOT EXISTS broadcast_gifts (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL,
 diamonds INTEGER NOT NULL CHECK(diamonds BETWEEN 1 AND 10000),
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS broadcast_gift_claims (
 gift_id TEXT NOT NULL REFERENCES broadcast_gifts(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 claimed_at INTEGER NOT NULL, PRIMARY KEY(gift_id,user_id)
);`);
function broadcastSummary(g,userId){
 const now=Date.now();
 const eligible=!userId||!!q("SELECT 1 FROM users WHERE id=? AND role='user' AND created_at<=?",userId,g.created_at);
 const claimed=!!(userId&&q('SELECT 1 FROM broadcast_gift_claims WHERE gift_id=? AND user_id=?',g.id,userId));
 return {id:g.id,title:g.title,message:g.message,diamonds:g.diamonds,
  createdAt:g.created_at,expiresAt:g.expires_at,active:!!g.active&&g.expires_at>now,
  eligible,claimed};
}

// Wheel editor: all prize draws happen on the server, not in the browser.
db.exec(`CREATE TABLE IF NOT EXISTS game_wheel_spins (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_id TEXT NOT NULL, award_day TEXT NOT NULL, diamonds INTEGER NOT NULL CHECK(diamonds>0), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_wheel_spins_daily ON game_wheel_spins(user_id,event_id,award_day);`);

// Admin live statistics: recent authenticated API activity, no tracking of page content.
db.exec(`CREATE TABLE IF NOT EXISTS user_activity (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 last_seen INTEGER NOT NULL
);`);

const WHEEL_KEY='wheel_config_v1';
const WHEEL_DEFAULT={version:0,maxSpinsPerDay:1,prizes:[
 {diamonds:5,weight:40},{diamonds:10,weight:25},{diamonds:15,weight:18},
 {diamonds:20,weight:12},{diamonds:30,weight:5}
]};
function wheelSettings(){
 try{
  const v=JSON.parse(q('SELECT value FROM settings WHERE key=?',WHEEL_KEY)?.value||'null');
  if(v&&Number.isSafeInteger(v.version)&&Number.isSafeInteger(v.maxSpinsPerDay)&&v.maxSpinsPerDay>=1&&v.maxSpinsPerDay<=5&&Array.isArray(v.prizes)&&v.prizes.length>=2&&v.prizes.length<=8&&v.prizes.every(x=>Number.isSafeInteger(x.diamonds)&&x.diamonds>=1&&x.diamonds<=10000&&Number.isSafeInteger(x.weight)&&x.weight>=1&&x.weight<=100))return v;
 }catch(_e){}
 return WHEEL_DEFAULT;
}
function wheelCycle(e){return String(e.wheelCycleId||e.updatedAt||0)}
function wheelSpinCount(u,id,day){
 // game_wheel contains pre-editor draws; count those as well so old users cannot spin twice.
 const old=q('SELECT COUNT(*) n FROM game_wheel WHERE user_id=? AND event_id=? AND award_day=?',u,id,day).n;
 const newer=q('SELECT COUNT(*) n FROM game_wheel_spins WHERE user_id=? AND event_id=? AND award_day=?',u,id,day).n;
 return old+newer;
}
function wheelPrize(cfg){
 const total=cfg.prizes.reduce((a,x)=>a+x.weight,0);
 let r=crypto.randomInt(total);
 for(const prize of cfg.prizes){r-=prize.weight;if(r<0)return prize.diamonds}
 return cfg.prizes[cfg.prizes.length-1].diamonds;
}
function currentEvent(){return JSON.parse(q('SELECT value FROM settings WHERE key=?','events')?.value||'{}')}
function eventId(e){return String(e.updatedAt||0)}
function seasonTiers(){return [{at:3,diamonds:10},{at:10,diamonds:25},{at:25,diamonds:60},{at:50,diamonds:120}]}
function gameEvents(u){
 const e=currentEvent(),id=eventId(e),day=new Date().toISOString().slice(0,10),cfg=wheelSettings();
 const progress=q('SELECT COUNT(*) n FROM game_exercises WHERE run_id IN (SELECT id FROM game_runs WHERE user_id=?) AND awarded_at>=?',u.id,Number(e.updatedAt)||0).n;
 const wheelSpinsUsed=wheelSpinCount(u.id,wheelCycle(e),day);
 const wheelSpinsRemaining=Math.max(0,cfg.maxSpinsPerDay-wheelSpinsUsed);
 return {config:e,id,progress,tiers:seasonTiers().map(t=>({...t,claimed:!!q('SELECT 1 FROM game_season_claims WHERE user_id=? AND season_id=? AND tier=?',u.id,id,t.at)})),wheelUsed:wheelSpinsRemaining===0,wheelSpinsUsed,wheelSpinsRemaining,wheelMaxSpins:cfg.maxSpinsPerDay,giftClaimed:!!q('SELECT 1 FROM game_event_claims WHERE user_id=? AND event_id=?',u.id,id)}
}
// Editor-backed booster catalog: server-side authority for prices and products.
const SHOP_KEY='booster_catalog_v1';
const SHOP_DEFAULTS=[
 {id:'boost2small',emoji:'\u26a1',name:'Doppel-Power',desc:'2x Level-Fortschritt fuer 3 abgeschlossene Uebungen.',basePrice:300,discountPercent:0,multiplier:2,uses:3,active:true},
 {id:'boost2long',emoji:'\ud83d\ude80',name:'Trainings-Turbo',desc:'2x Level-Fortschritt fuer 8 abgeschlossene Uebungen.',basePrice:650,discountPercent:0,multiplier:2,uses:8,active:true},
 {id:'boost3mega',emoji:'\ud83d\udd25',name:'Mega-XP',desc:'3x Level-Fortschritt fuer 5 abgeschlossene Uebungen.',basePrice:1000,discountPercent:0,multiplier:3,uses:5,active:true}
];
function storedShop(){
 try{const raw=JSON.parse(q('SELECT value FROM settings WHERE key=?',SHOP_KEY)?.value||'{}');
  return raw&&Array.isArray(raw.items)?raw:{version:0,items:[]};}
 catch(_){return {version:0,items:[]}}
}
function shopCatalog(){
 const saved=storedShop(),map=new Map(saved.items.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
 const standard=SHOP_DEFAULTS.map(d=>({...d,...map.get(d.id),id:d.id,multiplier:d.multiplier,uses:d.uses}));
 const custom=saved.items.filter(x=>x&&typeof x.id==='string'&&/^custom_[a-f0-9]{16}$/.test(x.id));
 return [...standard,...custom].map(x=>({...x,price:Math.max(1,Math.round(x.basePrice*(100-x.discountPercent)/100))}));
}
function shopFind(id){return shopCatalog().find(x=>x.id===id)}
function shopEditFields(data,existing){
 const name=String(data.name||'').trim(),desc=String(data.desc||'').trim(),emoji=String(data.emoji||'').trim();
 const basePrice=Number(data.basePrice),discountPercent=Number(data.discountPercent);
 const multiplier=existing&&!existing.id.startsWith('custom_')?existing.multiplier:Number(data.multiplier);
 const uses=existing&&!existing.id.startsWith('custom_')?existing.uses:Number(data.uses);
 if(!name||name.length>45||desc.length>160||!emoji||emoji.length>16)throw Error('Shop-Name, Beschreibung oder Symbol ungueltig');
 if(!Number.isSafeInteger(basePrice)||basePrice<1||basePrice>1000000)throw Error('Preis muss zwischen 1 und 1.000.000 Diamanten liegen');
 if(!Number.isSafeInteger(discountPercent)||discountPercent<0||discountPercent>90)throw Error('Rabatt muss zwischen 0 und 90 Prozent liegen');
 if(![2,3].includes(multiplier)||!Number.isSafeInteger(uses)||uses<1||uses>30)throw Error('Booster muss 2x oder 3x und 1 bis 30 Uebungen bieten');
 if(typeof data.active!=='boolean')throw Error('Aktiv-Status fehlt');
 return {name,desc,emoji,basePrice,discountPercent,multiplier,uses,active:data.active};
}

const q=(sql,...args)=>db.prepare(sql).get(...args), all=(sql,...args)=>db.prepare(sql).all(...args), run=(sql,...args)=>db.prepare(sql).run(...args);

// A visible, authenticated app periodically requests /api/state. Record recent API usage
// at most once every 30 seconds per account, without recording IP addresses or devices.
function touchActivity(user){
 if(user.role!=='user')return;
 const now=Date.now(),existing=q('SELECT last_seen FROM user_activity WHERE user_id=?',user.id);
 if(!existing||now-existing.last_seen>=30000)
  run('INSERT INTO user_activity(user_id,last_seen) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen=excluded.last_seen',user.id,now);
}
function adminLiveStatistics(){
 const now=Date.now(),since7=now-7*86400000,since24=now-86400000;
 const count=(sql,...params)=>Number(q(sql,...params)?.n||0);
 const overview={
  players:count("SELECT COUNT(*) n FROM users WHERE role='user'"),
  active5m:count("SELECT COUNT(*) n FROM user_activity a JOIN users u ON u.id=a.user_id WHERE u.role='user' AND a.last_seen>=?",now-300000),
  active24h:count("SELECT COUNT(*) n FROM user_activity a JOIN users u ON u.id=a.user_id WHERE u.role='user' AND a.last_seen>=?",since24),
  newPlayers7d:count("SELECT COUNT(*) n FROM users WHERE role='user' AND created_at>=?",since7),
  workouts7d:count("SELECT COUNT(DISTINCT e.run_id) n FROM game_exercises e JOIN game_runs r ON r.id=e.run_id JOIN users u ON u.id=r.user_id WHERE u.role='user' AND e.awarded_at>=?",since7),
  exercises7d:count("SELECT COUNT(*) n FROM game_exercises e JOIN game_runs r ON r.id=e.run_id JOIN users u ON u.id=r.user_id WHERE u.role='user' AND e.awarded_at>=?",since7),
  chests7d:count("SELECT COUNT(*) n FROM game_chests c JOIN users u ON u.id=c.user_id WHERE u.role='user' AND c.opened_at>=?",since7),
  spins7d:count("SELECT COUNT(*) n FROM game_wheel_spins w JOIN users u ON u.id=w.user_id WHERE u.role='user' AND w.created_at>=?",since7)
   +count("SELECT COUNT(*) n FROM game_wheel w JOIN users u ON u.id=w.user_id WHERE u.role='user' AND w.award_day>=?",new Date(since7).toISOString().slice(0,10)),
  diamondsHeld:count("SELECT COALESCE(SUM(diamonds),0) n FROM users WHERE role='user'")
 };
 const today=new Date(now).toISOString().slice(0,10);
 const dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+(i-6)*86400000).toISOString().slice(0,10));
 const daily=dates.map(date=>({date,newPlayers:0,workouts:0,exercises:0,spins:0}));
 const index=new Map(daily.map(d=>[d.date,d]));
 for(const x of all("SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch') date, COUNT(*) n FROM users WHERE role='user' AND created_at>=? GROUP BY date",Date.parse(dates[0]+'T00:00:00Z')))index.get(x.date)&&(index.get(x.date).newPlayers=x.n);
 for(const x of all("SELECT strftime('%Y-%m-%d',e.awarded_at/1000,'unixepoch') date, COUNT(*) exercises, COUNT(DISTINCT e.run_id) workouts FROM game_exercises e JOIN game_runs r ON r.id=e.run_id JOIN users u ON u.id=r.user_id WHERE u.role='user' AND e.awarded_at>=? GROUP BY date",Date.parse(dates[0]+'T00:00:00Z'))){const d=index.get(x.date);if(d){d.exercises=x.exercises;d.workouts=x.workouts}}
 for(const x of all("SELECT strftime('%Y-%m-%d',w.created_at/1000,'unixepoch') date, COUNT(*) n FROM game_wheel_spins w JOIN users u ON u.id=w.user_id WHERE u.role='user' AND w.created_at>=? GROUP BY date",Date.parse(dates[0]+'T00:00:00Z')))index.get(x.date)&&(index.get(x.date).spins+=x.n);
 for(const x of all("SELECT w.award_day date, COUNT(*) n FROM game_wheel w JOIN users u ON u.id=w.user_id WHERE u.role='user' AND w.award_day>=? GROUP BY date",dates[0]))index.get(x.date)&&(index.get(x.date).spins+=x.n);
 const recent=[
  ...all("SELECT u.username player, u.created_at at, 'register' kind FROM users u WHERE u.role='user' ORDER BY created_at DESC LIMIT 7"),
  ...all("SELECT u.username player, e.awarded_at at, 'exercise' kind FROM game_exercises e JOIN game_runs r ON r.id=e.run_id JOIN users u ON u.id=r.user_id WHERE u.role='user' ORDER BY e.awarded_at DESC LIMIT 7"),
  ...all("SELECT u.username player, c.opened_at at, 'chest' kind FROM game_chests c JOIN users u ON u.id=c.user_id WHERE u.role='user' AND c.opened_at IS NOT NULL ORDER BY c.opened_at DESC LIMIT 7"),
  ...all("SELECT u.username player, w.created_at at, 'wheel' kind FROM game_wheel_spins w JOIN users u ON u.id=w.user_id WHERE u.role='user' ORDER BY w.created_at DESC LIMIT 7")
 ].sort((a,b)=>b.at-a.at).slice(0,8);
 return {generatedAt:now,overview,daily,recent};
}

const uid=()=>crypto.randomUUID(), random=(n=24)=>crypto.randomBytes(n).toString('base64url');
function hashPass(password,salt){return crypto.scryptSync(password,salt,64).toString('hex')}
function authPass(u,password){const cand=Buffer.from(hashPass(password,u.salt),'hex');return crypto.timingSafeEqual(cand,Buffer.from(u.passhash,'hex'))}
function publicUser(u){return {id:u.id,name:u.username,role:u.role,friendCode:u.friend_code,diamonds:u.diamonds,level:1+Math.floor(u.xp/3),xp:u.xp,progress:u.xp%3}}
function json(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(body)}
function error(res,status,msg){json(res,status,{error:msg})}
function cookies(req){const result={};for(const c of (req.headers.cookie||'').split(';')){const ix=c.indexOf('=');if(ix>-1)result[c.slice(0,ix).trim()]=c.slice(ix+1).trim()}return result}
function session(req){const token=cookies(req).fp_session;if(!token)return null;const th=crypto.createHash('sha256').update(token).digest('hex');return q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',th,Date.now())||null}
function cookie(res,token,expire=false){const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`fp_session=${token||''}; HttpOnly; SameSite=Lax; Path=/; ${expire?'Max-Age=0':'Max-Age=604800'}${secure}`)}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1600000)throw new Error('Eingabe zu groß')}try{return raw?JSON.parse(raw):{}}catch{throw new Error('Ungültiges JSON')}}
function validName(s){return typeof s==='string'&&/^[\p{L}\p{N}_-]{3,24}$/u.test(s)}
function startSession(res,u){const token=random(32),th=crypto.createHash('sha256').update(token).digest('hex');run('INSERT INTO sessions VALUES(?,?,?)',th,u.id,Date.now()+604800000);cookie(res,token);json(res,200,{user:publicUser(u)})}
// Admin passkey: one credential in Supabase, independent of volatile SQLite.
const PASSKEY_ORIGIN=process.env.PASSKEY_ORIGIN||'https://fitnessplus-server.onrender.com';
const PASSKEY_RPID=new URL(PASSKEY_ORIGIN).hostname;
const PASSKEY_ROW='admin-primary';
// One-time bootstrap capability, held only in server memory. A restart invalidates its link.
const SETUP_LINK_SECRET=crypto.randomBytes(32).toString('base64url');
let setupLinkClaimed=false;
const setupLinkValid=token=>!setupLinkClaimed&&equalSecret(token,SETUP_LINK_SECRET);

const challenges=new Map();
const passkeyReady=()=>!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);
function equalSecret(a,b){const x=crypto.createHash('sha256').update(String(a||'')).digest(),y=crypto.createHash('sha256').update(String(b||'')).digest();return crypto.timingSafeEqual(x,y)}
async function passkeyStore(method,bodyData){
 const base=process.env.SUPABASE_URL?.replace(/\/$/,'');
 if(!base||!process.env.SUPABASE_SECRET_KEY)throw Error('Supabase ist nicht konfiguriert');
 const url=base+'/rest/v1/fitnessplus_admin_passkeys'+(method==='GET'?'?credential_id=eq.'+PASSKEY_ROW+'&select=credential_id,public_key,counter':'');
 const response=await fetch(url,{method,headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+process.env.SUPABASE_SECRET_KEY,'content-type':'application/json',Prefer:'return=representation'},body:bodyData?JSON.stringify(bodyData):undefined,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Supabase-Anfrage fehlgeschlagen ('+response.status+')');
 return response.json();
}
async function storedPasskey(){const rows=await passkeyStore('GET');return rows.find(x=>x.credential_id===PASSKEY_ROW)||null}
function putChallenge(kind,challenge){const id=random(24);challenges.set(id,{kind,challenge,expires:Date.now()+180000});return id}
function takeChallenge(id,kind){const v=challenges.get(String(id));challenges.delete(String(id));return v&&v.kind===kind&&v.expires>Date.now()?v:null}
function adminCookie(res,value,clear=false){res.setHeader('Set-Cookie',`fp_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api; ${clear?'Max-Age=0':'Max-Age=43200'}`)}
function adminToken(){const payload=Buffer.from(JSON.stringify({exp:Date.now()+43200000,nonce:random(12)})).toString('base64url');const mac=crypto.createHmac('sha256',process.env.SUPABASE_SECRET_KEY).update(payload).digest('base64url');return payload+'.'+mac}
function passkeySession(req){if(!process.env.SUPABASE_SECRET_KEY)return false;const value=cookies(req).fp_admin||'',parts=value.split('.');if(parts.length!==2)return false;const mac=crypto.createHmac('sha256',process.env.SUPABASE_SECRET_KEY).update(parts[0]).digest('base64url');if(!equalSecret(mac,parts[1]))return false;try{return JSON.parse(Buffer.from(parts[0],'base64url')).exp>Date.now()}catch{return false}}
async function passkeyRoute(req,res,url,data){
 if(!passkeyReady())return error(res,503,'Passkey-Konfiguration unvollständig');
 if(req.method==='GET'&&url.pathname==='/api/passkey/status')return json(res,200,{registered:!!(await storedPasskey()),authorized:passkeySession(req)});
 if(req.method==='POST'&&url.pathname==='/api/passkey/register/options'){
  if(!setupLinkValid(data.setupToken))return error(res,403,'Einrichtungscode ungültig');
  if(await storedPasskey())return error(res,409,'Admin-Passkey bereits eingerichtet');
  const options=await generateRegistrationOptions({rpName:'FitnessPlus Admin',rpID:PASSKEY_RPID,userName:'FitnessPlus Admin',userID:new Uint8Array(crypto.randomBytes(32)),attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'},supportedAlgorithmIDs:[-7,-257]});
  return json(res,200,{options,challengeId:putChallenge('register',options.challenge)});
 }
 if(req.method==='POST'&&url.pathname==='/api/passkey/register/verify'){
  if(!setupLinkValid(data.setupToken))return error(res,403,'Einrichtungscode ungültig');
  const challenge=takeChallenge(data.challengeId,'register');if(!challenge)return error(res,400,'Einrichtung abgelaufen');
  if(await storedPasskey())return error(res,409,'Admin-Passkey bereits eingerichtet');
  const result=await verifyRegistrationResponse({response:data.credential,expectedChallenge:challenge.challenge,expectedOrigin:PASSKEY_ORIGIN,expectedRPID:PASSKEY_RPID,requireUserVerification:true});
  if(!result.verified||!result.registrationInfo)return error(res,403,'Passkey konnte nicht geprüft werden');
  const c=result.registrationInfo.credential;
  const record={id:c.id,publicKey:Buffer.from(c.publicKey).toString('base64url'),counter:c.counter,transports:c.transports||[]};
  // PRIMARY KEY insert ensures that simultaneous registrations cannot overwrite the first passkey.
  await passkeyStore('POST',{credential_id:PASSKEY_ROW,public_key:JSON.stringify(record),counter:c.counter});
  setupLinkClaimed=true;
  adminCookie(res,adminToken());return json(res,200,{ok:true});
 }
 if(req.method==='POST'&&url.pathname==='/api/passkey/login/options'){
  const row=await storedPasskey();if(!row)return error(res,404,'Noch kein Admin-Passkey eingerichtet');
  const c=JSON.parse(row.public_key);
  const options=await generateAuthenticationOptions({rpID:PASSKEY_RPID,userVerification:'required',allowCredentials:[{id:c.id,transports:c.transports}]});
  return json(res,200,{options,challengeId:putChallenge('login',options.challenge)});
 }
 if(req.method==='POST'&&url.pathname==='/api/passkey/login/verify'){
  const challenge=takeChallenge(data.challengeId,'login');if(!challenge)return error(res,400,'Anmeldung abgelaufen');
  const row=await storedPasskey();if(!row)return error(res,404,'Kein Passkey vorhanden');
  const c=JSON.parse(row.public_key);
  const result=await verifyAuthenticationResponse({response:data.credential,expectedChallenge:challenge.challenge,expectedOrigin:PASSKEY_ORIGIN,expectedRPID:PASSKEY_RPID,requireUserVerification:true,credential:{id:c.id,publicKey:Buffer.from(c.publicKey,'base64url'),counter:Number(row.counter),transports:c.transports}});
  if(!result.verified)return error(res,403,'Anmeldung fehlgeschlagen');
  // Counter updates are best effort: zero counters are common with synced passkeys.
  if(result.authenticationInfo.newCounter>Number(row.counter)){
   const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/fitnessplus_admin_passkeys?credential_id=eq.'+PASSKEY_ROW,{method:'PATCH',headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+process.env.SUPABASE_SECRET_KEY,'content-type':'application/json'},body:JSON.stringify({counter:result.authenticationInfo.newCounter})});
   if(!response.ok)throw Error('Passkey-Zähler konnte nicht gespeichert werden');
  }
  adminCookie(res,adminToken());return json(res,200,{ok:true});
 }
 if(req.method==='POST'&&url.pathname==='/api/passkey/logout'){adminCookie(res,'',true);return json(res,200,{ok:true})}
 return error(res,404,'Passkey-Endpunkt nicht gefunden');
}
const bucket=new Map();function rate(req){const ip=req.socket.remoteAddress||'unknown',now=Date.now(),k=ip+':'+req.url.split('?')[0],b=bucket.get(k)||{count:0,until:now+60000};if(now>b.until){b.count=0;b.until=now+60000}b.count++;bucket.set(k,b);return b.count<=40}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{const o=new URL(origin);return o.host===req.headers.host&&['https:','http:'].includes(o.protocol)}catch{return false}}
function audit(actor,subject,action,detail=''){run('INSERT INTO audit VALUES(?,?,?,?,?,?)',uid(),actor,subject,action,String(detail),Date.now())}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
function staticFile(req,res,url){let file=decodeURIComponent(url.pathname);if(file==='/' )file='/index.html';let abs=path.resolve(WEB,'.'+file);if(!abs.startsWith(WEB+path.sep))return error(res,403,'Unzulässiger Pfad');let ext=path.extname(abs);if(!mime[ext]||path.basename(abs).startsWith('.'))return error(res,404,'Nicht gefunden');fs.readFile(abs,(err,data)=>{if(err)return error(res,404,'Nicht gefunden');res.writeHead(200,{'content-type':mime[ext],'x-content-type-options':'nosniff','cache-control':ext==='.html'||ext==='.js'||ext==='.json'?'no-cache':'public, max-age=3600'});res.end(data)})}
async function handler(req,res){try{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/api/')){if(!['GET','HEAD'].includes(req.method))return error(res,405,'Nur GET');return staticFile(req,res,url)}
 if(!rate(req))return error(res,429,'Zu viele Anfragen');
 if(req.method!=='GET'&&!sameOrigin(req))return error(res,403,'Herkunft nicht erlaubt');
 if(['POST','PUT'].includes(req.method)&&req.headers['content-type']?.split(';')[0]!=='application/json')return error(res,415,'JSON erforderlich');
 const data=['POST','PUT'].includes(req.method)?await body(req):{};
 if(url.pathname.startsWith('/api/passkey/'))return passkeyRoute(req,res,url,data);
 if(req.method==='POST'&&url.pathname==='/api/register'){
  if(!validName(data.name)||typeof data.password!=='string'||data.password.length<10||data.password.length>128)return error(res,400,'Name (3–24 Zeichen) und Passwort (mind. 10 Zeichen) erforderlich');
  const id=uid(),salt=random(16),code='FP-'+random(8).toUpperCase();try{run('INSERT INTO users(id,username,passhash,salt,role,friend_code,created_at) VALUES(?,?,?,?,?,?,?)',id,data.name,hashPass(data.password,salt),salt,'user',code,Date.now())}catch{return error(res,409,'Benutzername bereits vergeben')}return startSession(res,q('SELECT * FROM users WHERE id=?',id));
 }
 if(req.method==='POST'&&url.pathname==='/api/login'){
  const u=typeof data.name==='string'?q('SELECT * FROM users WHERE username=?',data.name):null;
  if(!u||typeof data.password!=='string'||!authPass(u,data.password))return error(res,401,'Login fehlgeschlagen');return startSession(res,u)
 }
  if(req.method==='GET'&&url.pathname==='/api/shop'){const cfg=storedShop();return json(res,200,{items:shopCatalog().filter(x=>x.active),version:cfg.version||0})}
 if(req.method==='GET'&&url.pathname==='/api/events')return json(res,200,{events:currentEvent(),wheelConfig:wheelSettings()});
 const passkeyAdmin=passkeySession(req);
 const u=session(req)||(passkeyAdmin&&(url.pathname.startsWith('/api/admin/')||url.pathname==='/api/events')?{id:'passkey-admin',role:'admin'}:null);
 if(!u)return error(res,401,'Bitte anmelden');
  touchActivity(u);
 if(req.method==='POST'&&url.pathname==='/api/logout'){const tok=cookies(req).fp_session;run('DELETE FROM sessions WHERE token_hash=?',crypto.createHash('sha256').update(tok).digest('hex'));cookie(res,'',true);return json(res,200,{ok:true})}
 if(req.method==='GET'&&url.pathname==='/api/state'){
  const row=q('SELECT revision,payload,updated_at FROM cloud_state WHERE user_id=?',u.id);
  const state=row?JSON.parse(row.payload):null;
  if(state){state.diamonds=u.diamonds;state.levelExercises=u.xp;const b=q('SELECT multiplier,uses FROM game_boosters WHERE user_id=?',u.id);state.levelBoostMultiplier=b?.multiplier||1;state.levelBoostUses=b?.uses||0;state.rewardBoxes=all("SELECT id, 'Online-Truhe' AS name FROM game_chests WHERE user_id=? AND opened_at IS NULL ORDER BY created_at",u.id);}
  return json(res,200,{revision:row?.revision||0,state,updatedAt:row?.updated_at||null,user:publicUser(u)});
 }
 if(req.method==='PUT'&&url.pathname==='/api/state'){
  // Optimistic concurrency: conflicting device edits must not overwrite each other.
  const rev=Number(data.revision),state=data.state;
  if(!Number.isSafeInteger(rev)||rev<0||!state||typeof state!=='object'||Array.isArray(state))return error(res,400,'Ungültiger Spielstand');
  // The user table is the authoritative source for diamonds and XP.
  // Snapshot cannot change protected balances; app-specific rewards require separate verified transactions.
  for(const k of ['diamonds','levelExercises','levelBoostMultiplier','levelBoostUses','rewardBoxes','rewardHistory','rewardClaims','levelExerciseClaims','dailyReward','eventClaims','eventWheel','seasonProgress'])delete state[k];
  const payload=JSON.stringify(state);
  if(payload.length>1500000)return error(res,413,'Spielstand zu groß');
  const row=q('SELECT revision FROM cloud_state WHERE user_id=?',u.id);
  if((row?.revision||0)!==rev)return error(res,409,'Anderes Gerät hat den Spielstand verändert. Bitte neu laden.');
  const next=rev+1;
  if(row){const change=run('UPDATE cloud_state SET revision=?,payload=?,updated_at=? WHERE user_id=? AND revision=?',next,payload,Date.now(),u.id,rev);if(change.changes!==1)return error(res,409,'Konflikt');}
  else{try{run('INSERT INTO cloud_state(user_id,revision,payload,updated_at) VALUES(?,?,?,?)',u.id,next,payload,Date.now())}catch{return error(res,409,'Konflikt')}}
  return json(res,200,{ok:true,revision:next});
 }
  // Aktive Geschenkaktionen: nur fuer Spieler, die vor dem Start registriert waren.
  if(req.method==='GET'&&url.pathname==='/api/game/broadcast-gifts'){
   const list=all('SELECT * FROM broadcast_gifts WHERE active=1 AND expires_at>? AND created_at>=? ORDER BY created_at DESC LIMIT 30',Date.now(),0)
    .map(g=>broadcastSummary(g,u.id)).filter(g=>g.eligible);
   return json(res,200,{gifts:list});
  }
  if(req.method==='POST'&&url.pathname==='/api/game/broadcast-gifts/claim'){
   const id=String(data.giftId||'');
   if(!/^[a-f0-9-]{36}$/i.test(id))return error(res,400,'Ungueltige Geschenk-ID');
   db.exec('BEGIN IMMEDIATE');try{
    const gift=q('SELECT * FROM broadcast_gifts WHERE id=?',id);
    const receiver=q('SELECT id,created_at,role FROM users WHERE id=?',u.id);
    if(!gift||!gift.active||gift.expires_at<=Date.now()||!receiver||receiver.role!=='user'||receiver.created_at>gift.created_at){
     db.exec('ROLLBACK');return error(res,403,'Geschenk nicht verfuegbar');
    }
    const claimed=run('INSERT OR IGNORE INTO broadcast_gift_claims(gift_id,user_id,claimed_at) VALUES(?,?,?)',gift.id,u.id,Date.now());
    if(!claimed.changes){db.exec('ROLLBACK');return error(res,409,'Geschenk bereits abgeholt');}
    run('UPDATE users SET diamonds=diamonds+? WHERE id=?',gift.diamonds,u.id);
    db.exec('COMMIT');
    return json(res,200,{ok:true,diamonds:gift.diamonds,title:gift.title,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
   }catch(err){db.exec('ROLLBACK');throw err;}
  }
 if(req.method==='GET'&&url.pathname==='/api/game'){
  const b=q('SELECT multiplier,uses FROM game_boosters WHERE user_id=?',u.id);
  return json(res,200,{user:publicUser(q('SELECT * FROM users WHERE id=?',u.id)),booster:b||{multiplier:1,uses:0},chests:all('SELECT id,created_at FROM game_chests WHERE user_id=? AND opened_at IS NULL ORDER BY created_at',u.id),history:all('SELECT rarity,diamonds,opened_at FROM game_chests WHERE user_id=? AND opened_at IS NOT NULL ORDER BY opened_at DESC LIMIT 50',u.id)});
 }
 if(req.method==='POST'&&url.pathname==='/api/game/start'){
  const id=uid();run('INSERT INTO game_runs VALUES(?,?,?)',id,u.id,Date.now());return json(res,200,{runId:id});
 }
 if(req.method==='POST'&&url.pathname==='/api/game/exercise'){
  const runId=String(data.runId||''),ix=Number(data.exerciseIndex);
  if(!Number.isInteger(ix)||ix<0||ix>100)return error(res,400,'Ungültige Übung');
  const runRow=q('SELECT * FROM game_runs WHERE id=? AND user_id=?',runId,u.id),now=Date.now();
  if(!runRow||now-runRow.started_at<20000||now-runRow.started_at>4*3600000)return error(res,400,'Training muss mindestens 20 Sekunden laufen und darf höchstens 4 Stunden alt sein');
  if(q('SELECT 1 FROM game_exercises WHERE run_id=? AND exercise_index=?',runId,ix))return error(res,409,'Übung schon belohnt');
  if(q('SELECT COUNT(*) AS n FROM game_exercises WHERE run_id=?',runId).n>=40)return error(res,429,'Maximal 40 Übungen pro Training');
  if(q('SELECT COUNT(*) AS n FROM game_exercises e JOIN game_runs r ON r.id=e.run_id WHERE r.user_id=? AND e.awarded_at>?',u.id,now-86400000).n>=100)return error(res,429,'Tageslimit erreicht');
  const last=q('SELECT MAX(e.awarded_at) AS at FROM game_exercises e JOIN game_runs r ON r.id=e.run_id WHERE r.user_id=?',u.id);
  if(last?.at&&now-last.at<10000)return error(res,429,'Nächste Übung frühestens nach 10 Sekunden');
  db.exec('BEGIN IMMEDIATE');try{
   const b=q('SELECT * FROM game_boosters WHERE user_id=?',u.id),events=JSON.parse(q('SELECT value FROM settings WHERE key=?','events')?.value||'{}');
   const gain=b?.uses>0?b.multiplier:(events.doubleXp?2:1);
   run('INSERT INTO game_exercises VALUES(?,?,?,?)',runId,ix,now,gain);
   run('UPDATE users SET xp=xp+? WHERE id=?',gain,u.id);
   if(b?.uses>0)run('UPDATE game_boosters SET uses=uses-1,multiplier=CASE WHEN uses<=1 THEN 1 ELSE multiplier END WHERE user_id=?',u.id);
   const chestId=uid();run('INSERT INTO game_chests(id,user_id,run_id,exercise_index,created_at) VALUES(?,?,?,?,?)',chestId,u.id,runId,ix,now);
   db.exec('COMMIT');return json(res,200,{ok:true,xpGain:gain,chestId,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/chest/open'){
  const row=q('SELECT * FROM game_chests WHERE id=? AND user_id=?',String(data.chestId||''),u.id);
  if(!row)return error(res,404,'Truhe nicht gefunden');if(row.opened_at)return error(res,409,'Truhe bereits geöffnet');
  const r=crypto.randomInt(10000),rarity=r<7000?'Episch':r<9400?'Mythisch':'Legendär';
  const diamonds=rarity==='Episch'?crypto.randomInt(10,21):rarity==='Mythisch'?crypto.randomInt(25,41):crypto.randomInt(60,101);
  db.exec('BEGIN IMMEDIATE');try{
   const change=run('UPDATE game_chests SET opened_at=?,rarity=?,diamonds=? WHERE id=? AND user_id=? AND opened_at IS NULL',Date.now(),rarity,diamonds,row.id,u.id);
   if(change.changes!==1){db.exec('ROLLBACK');return error(res,409,'Bereits eingelöst')}
   run('UPDATE users SET diamonds=diamonds+? WHERE id=?',diamonds,u.id);db.exec('COMMIT');
   return json(res,200,{ok:true,rarity,diamonds,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/shop/buy'){
  const item=String(data.item||''),b=shopFind(item);if(!b||!b.active)return error(res,400,'Produkt nicht verfuegbar');
   if(!Number.isSafeInteger(data.expectedPrice)||data.expectedPrice!==b.price)return error(res,409,'Shop-Preis geaendert. Bitte Shop aktualisieren.');
  db.exec('BEGIN IMMEDIATE');try{
   const active=q('SELECT uses FROM game_boosters WHERE user_id=?',u.id);if(active?.uses>0){db.exec('ROLLBACK');return error(res,409,'Booster bereits aktiv')}
   const debit=run('UPDATE users SET diamonds=diamonds-? WHERE id=? AND diamonds>=?',b.price,u.id,b.price);
   if(debit.changes!==1){db.exec('ROLLBACK');return error(res,400,'Nicht genug Diamanten')}
   run('INSERT INTO game_boosters(user_id,multiplier,uses) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET multiplier=excluded.multiplier,uses=excluded.uses',u.id,b.multiplier,b.uses);
   run('INSERT INTO game_purchases VALUES(?,?,?,?,?)',uid(),u.id,item,b.price,Date.now());db.exec('COMMIT');
   return json(res,200,{ok:true,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id)),booster:{multiplier:b.multiplier,uses:b.uses}});
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/daily'){
  const d=new Date().toISOString().slice(0,10);
  db.exec('BEGIN IMMEDIATE');try{
   const insert=run('INSERT OR IGNORE INTO game_daily VALUES(?,?)',u.id,d);
   if(!insert.changes){db.exec('ROLLBACK');return error(res,409,'Tagesbonus bereits abgeholt')}
   run('UPDATE users SET diamonds=diamonds+? WHERE id=?',5,u.id);db.exec('COMMIT');
   return json(res,200,{ok:true,diamonds:5,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(req.method==='GET'&&url.pathname==='/api/game/events')return json(res,200,{events:gameEvents(u),user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
 if(req.method==='POST'&&url.pathname==='/api/game/wheel'){
  const e=currentEvent(),id=wheelCycle(e),day=new Date().toISOString().slice(0,10);
  if(!e.wheel)return error(res,403,'Glücksrad ist nicht aktiv');
  db.exec('BEGIN IMMEDIATE');try{
   const cfg=wheelSettings(),used=wheelSpinCount(u.id,id,day);
   if(used>=cfg.maxSpinsPerDay){db.exec('ROLLBACK');return error(res,409,'Für heute sind alle Glücksrad-Drehungen verbraucht')}
   const award=wheelPrize(cfg),now=Date.now();
   run('INSERT INTO game_wheel_spins VALUES(?,?,?,?,?,?)',uid(),u.id,id,day,award,now);
   run('UPDATE users SET diamonds=diamonds+? WHERE id=?',award,u.id);
   db.exec('COMMIT');return json(res,200,{ok:true,diamonds:award,spinsUsed:used+1,spinsRemaining:cfg.maxSpinsPerDay-used-1,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/season/claim'){
  const e=currentEvent(),id=eventId(e),tier=seasonTiers().find(x=>x.at===Number(data.tier));
  if(!e.season||!tier)return error(res,403,'Saison oder Stufe ist nicht aktiv');
  const count=q('SELECT COUNT(*) n FROM game_exercises WHERE run_id IN (SELECT id FROM game_runs WHERE user_id=?) AND awarded_at>=?',u.id,Number(e.updatedAt)||0).n;
  if(count<tier.at)return error(res,403,'Noch nicht genügend Online-Übungen');
  db.exec('BEGIN IMMEDIATE');try{
   if(q('SELECT 1 FROM game_season_claims WHERE user_id=? AND season_id=? AND tier=?',u.id,id,tier.at)){db.exec('ROLLBACK');return error(res,409,'Stufe bereits eingelöst')}
   run('INSERT INTO game_season_claims VALUES(?,?,?,?)',u.id,id,tier.at,tier.diamonds);
   run('UPDATE users SET diamonds=diamonds+? WHERE id=?',tier.diamonds,u.id);db.exec('COMMIT');return json(res,200,{ok:true,diamonds:tier.diamonds,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/event/gift'){
  const e=currentEvent(),id=eventId(e),amount=Number(e.giftDiamonds)||0;
  if(!Number.isSafeInteger(amount)||amount<1||amount>10000)return error(res,403,'Kein Event-Geschenk aktiv');
  db.exec('BEGIN IMMEDIATE');try{
   if(q('SELECT 1 FROM game_event_claims WHERE user_id=? AND event_id=?',u.id,id)){db.exec('ROLLBACK');return error(res,409,'Event-Geschenk bereits abgeholt')}
   run('INSERT INTO game_event_claims VALUES(?,?,?)',u.id,id,amount);
   run('UPDATE users SET diamonds=diamonds+? WHERE id=?',amount,u.id);db.exec('COMMIT');return json(res,200,{ok:true,diamonds:amount,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/friends/add-name'){
  const name=String(data.name||'').trim();if(!validName(name))return error(res,400,'Bitte Benutzernamen eingeben');
  const friend=q('SELECT id,username FROM users WHERE username=?',name);
  if(!friend||friend.id===u.id)return error(res,404,'Benutzer nicht gefunden');
  const [a,b]=[u.id,friend.id].sort();run('INSERT OR IGNORE INTO friendship(a,b,created_at) VALUES(?,?,?)',a,b,Date.now());
  return json(res,200,{ok:true,friend:{id:friend.id,name:friend.username}});
 }
 if(req.method==='GET'&&url.pathname==='/api/gifts/inbox'){
  const items=all('SELECT g.id,g.item,g.created_at AS createdAt,g.claimed_at AS claimedAt,u.username AS sender FROM direct_gifts g JOIN users u ON u.id=g.sender_id WHERE g.recipient_id=? ORDER BY g.created_at DESC LIMIT 100',u.id).map(g=>({...g,kind:'booster'}));
  const diamonds=all('SELECT g.id,g.amount,g.created_at AS createdAt,u.username AS sender FROM direct_diamond_gifts g JOIN users u ON u.id=g.sender_id WHERE g.recipient_id=? ORDER BY g.created_at DESC LIMIT 100',u.id).map(g=>({...g,kind:'diamonds',claimedAt:g.createdAt}));
  return json(res,200,{gifts:[...items,...diamonds].sort((a,b)=>b.createdAt-a.createdAt).slice(0,100)});
 }
 if(req.method==='POST'&&url.pathname==='/api/gifts/send'){
  const item=String(data.item||''),b=shopFind(item),friendId=String(data.friendId||''),kind=String(data.kind||'');
  const amount=Number(data.amount);
  if(kind==='diamonds'){if(!Number.isSafeInteger(amount)||amount<1||amount>100000)return error(res,400,'Ungültige Diamantenanzahl');}
  else return error(res,400,'Es können nur Diamanten verschenkt werden');
  if(friendId===u.id||!q('SELECT 1 FROM friendship WHERE (a=? AND b=?) OR (a=? AND b=?)',u.id,friendId,friendId,u.id))return error(res,403,'Nur an Freunde senden');
  db.exec('BEGIN IMMEDIATE');try{
   if(kind==='diamonds'){
    if(!run('UPDATE users SET diamonds=diamonds-? WHERE id=? AND diamonds>=?',amount,u.id,amount).changes){db.exec('ROLLBACK');return error(res,400,'Nicht genug Diamanten')}
    if(!run('UPDATE users SET diamonds=diamonds+? WHERE id=?',amount,friendId).changes){db.exec('ROLLBACK');return error(res,404,'Empfänger nicht gefunden')}
    run('INSERT INTO direct_diamond_gifts(id,sender_id,recipient_id,amount,created_at) VALUES(?,?,?,?,?)',uid(),u.id,friendId,amount,Date.now());
   }else{
    if(!run('UPDATE users SET diamonds=diamonds-? WHERE id=? AND diamonds>=?',b.price,u.id,b.price).changes){db.exec('ROLLBACK');return error(res,400,'Nicht genug Diamanten')}
    run('INSERT INTO direct_gifts(id,sender_id,recipient_id,item,created_at) VALUES(?,?,?,?,?)',uid(),u.id,friendId,item,Date.now());
   }
   db.exec('COMMIT');
   return json(res,200,{ok:true,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/gifts/claim'){
  const giftId=String(data.giftId||'');db.exec('BEGIN IMMEDIATE');try{
   const gift=q('SELECT * FROM direct_gifts WHERE id=? AND recipient_id=? AND claimed_at IS NULL',giftId,u.id);
   if(!gift){db.exec('ROLLBACK');return error(res,404,'Geschenk nicht verfügbar')}
   const active=q('SELECT uses FROM game_boosters WHERE user_id=?',u.id);
   if(active?.uses>0){db.exec('ROLLBACK');return error(res,409,'Bitte zuerst deinen aktiven Booster aufbrauchen')}
   const b=shopFind(gift.item);if(!b){db.exec('ROLLBACK');return error(res,400,'Produkt nicht verfügbar')}
   run('UPDATE game_boosters SET multiplier=?,uses=? WHERE user_id=?',b.multiplier,b.uses,u.id);
   run('INSERT OR IGNORE INTO game_boosters(user_id,multiplier,uses) VALUES(?,?,?)',u.id,b.multiplier,b.uses);
   run('UPDATE direct_gifts SET claimed_at=? WHERE id=? AND claimed_at IS NULL',Date.now(),giftId);
   db.exec('COMMIT');return json(res,200,{ok:true,booster:{multiplier:b.multiplier,uses:b.uses}});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/gift/create'){
  const item=String(data.item||''),boost=shopFind(item),recipientCode=String(data.friendCode||'').trim();
  if(!boost||!boost.active)return error(res,400,'Unbekannter Geschenk-Booster');
  const receiver=q('SELECT * FROM users WHERE friend_code=?',recipientCode);
  if(!receiver||receiver.id===u.id)return error(res,404,'Empfänger nicht gefunden');
  const code='FPG-'+random(18),hashed=crypto.createHash('sha256').update(code).digest('hex');
  db.exec('BEGIN IMMEDIATE');try{
   let debit=run('UPDATE users SET diamonds=diamonds-? WHERE id=? AND diamonds>=?',boost.price,u.id,boost.price);
   if(!debit.changes){db.exec('ROLLBACK');return error(res,400,'Nicht genug Diamanten')}
   run('INSERT INTO game_gift_codes(id,code_hash,sender_id,recipient_id,item,created_at) VALUES(?,?,?,?,?,?)',uid(),hashed,u.id,receiver.id,item,Date.now());db.exec('COMMIT');
   return json(res,200,{ok:true,code,recipient:receiver.username,item,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/gift/redeem'){
  const code=String(data.code||'').trim();if(!/^FPG-[\w-]{20,40}$/.test(code))return error(res,400,'Ungültiger Online-Geschenkcode');
  const hashed=crypto.createHash('sha256').update(code).digest('hex');
  db.exec('BEGIN IMMEDIATE');try{
   const gift=q('SELECT * FROM game_gift_codes WHERE code_hash=?',hashed);
   if(!gift||gift.recipient_id!==u.id||gift.redeemed_at){db.exec('ROLLBACK');return error(res,404,'Code ungültig, bereits eingelöst oder nicht für dich')}
   const active=q('SELECT uses FROM game_boosters WHERE user_id=?',u.id);
   if(active?.uses>0){db.exec('ROLLBACK');return error(res,409,'Bitte zuerst deinen aktiven Booster aufbrauchen')}
   const b=shopFind(gift.item);if(!b){db.exec('ROLLBACK');return error(res,400,'Geschenk nicht mehr verfügbar')}
   run('UPDATE game_gift_codes SET redeemed_at=?,redeemed_by=? WHERE id=? AND redeemed_at IS NULL',Date.now(),u.id,gift.id);
   run('INSERT INTO game_boosters(user_id,multiplier,uses) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET multiplier=excluded.multiplier,uses=excluded.uses',u.id,b.multiplier,b.uses);
   db.exec('COMMIT');return json(res,200,{ok:true,booster:{multiplier:b.multiplier,uses:b.uses},user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='GET'&&url.pathname==='/api/me')return json(res,200,{user:publicUser(u)});
 if(req.method==='GET'&&url.pathname==='/api/friends')return json(res,200,{friends:all(`SELECT u.id,u.username AS name,u.xp,1+CAST(u.xp/3 AS INTEGER) AS level FROM friendship f JOIN users u ON u.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=? ORDER BY u.xp DESC`,u.id,u.id,u.id)});
 if(req.method==='POST'&&url.pathname==='/api/friends/add'){
  const code=String(data.code||'').trim();const other=q('SELECT * FROM users WHERE friend_code=?',code);
  if(!other||other.id===u.id)return error(res,404,'Freund nicht gefunden');const [a,b]=[u.id,other.id].sort();run('INSERT OR IGNORE INTO friendship VALUES(?,?,?)',a,b,Date.now());return json(res,200,{ok:true,friend:publicUser(other)})
 }
 if(req.method==='POST'&&url.pathname==='/api/friends/remove'){
  const other=String(data.userId||'');const [a,b]=[u.id,other].sort();run('DELETE FROM friendship WHERE a=? AND b=?',a,b);return json(res,200,{ok:true})
 }
 if(req.method==='GET'&&url.pathname==='/api/announcements')return json(res,200,{message:JSON.parse(q('SELECT value FROM settings WHERE key=?','announcement')?.value||'null')});
 if(req.method==='GET'&&url.pathname==='/api/events')return json(res,200,{events:JSON.parse(q('SELECT value FROM settings WHERE key=?','events')?.value||'{}')});
 if(u.role!=='admin')return error(res,403,'Nur Administrator');
  if(req.method==='GET'&&url.pathname==='/api/admin/live-stats')return json(res,200,adminLiveStatistics());
  // Nur Passkey-Admin oder ein authentifiziertes Admin-Konto darf versenden.
  if(req.method==='GET'&&url.pathname==='/api/admin/broadcast-gifts'){
   const gifts=all(`SELECT g.*, (SELECT COUNT(*) FROM broadcast_gift_claims c WHERE c.gift_id=g.id) AS claimed_count,
    (SELECT COUNT(*) FROM users p WHERE p.role='user' AND p.created_at<=g.created_at) AS eligible_count
    FROM broadcast_gifts g ORDER BY g.created_at DESC LIMIT 30`)
    .map(g=>({...broadcastSummary(g),claimedCount:g.claimed_count,eligibleCount:g.eligible_count}));
   return json(res,200,{gifts});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/broadcast-gifts'){
   const title=String(data.title||'').trim(),message=String(data.message||'').trim();
   const diamonds=Number(data.diamonds),days=Number(data.days);
   if(!title||title.length>80||message.length>300||!Number.isSafeInteger(diamonds)||diamonds<1||diamonds>10000||![1,3,7,30].includes(days))
    return error(res,400,'Titel, Diamanten (1-10000) und Laufzeit (1/3/7/30 Tage) pruefen');
   const now=Date.now();
   if(q('SELECT COUNT(*) n FROM broadcast_gifts WHERE active=1 AND expires_at>?',now).n>=10)
    return error(res,409,'Maximal zehn aktive Geschenkaktionen. Bitte zuerst eine beenden.');
   const id=uid();
   run('INSERT INTO broadcast_gifts(id,title,message,diamonds,created_at,expires_at,active,created_by) VALUES(?,?,?,?,?,?,1,?)',
    id,title,message,diamonds,now,now+days*86400000,u.id);
   audit(u.id,'all','broadcast_gift_created',id+':'+diamonds);
   return json(res,200,{ok:true,giftId:id,diamonds,title});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/broadcast-gifts/close'){
   const id=String(data.giftId||'');
   if(!/^[a-f0-9-]{36}$/i.test(id))return error(res,400,'Ungueltige Geschenk-ID');
   const update=run('UPDATE broadcast_gifts SET active=0 WHERE id=? AND active=1',id);
   if(!update.changes)return error(res,404,'Aktive Geschenkaktion nicht gefunden');
   audit(u.id,'all','broadcast_gift_closed',id);
   return json(res,200,{ok:true});
  }
 
 // Player details are deliberately read-only and remain behind the existing admin authorization.
 if(req.method==='GET'&&url.pathname==='/api/admin/player'){
  const id=String(url.searchParams.get('userId')||'');
  if(!/^[a-f0-9-]{36}$/i.test(id))return error(res,400,'Ungültige Spieler-ID');
  const player=q('SELECT id,username AS name,diamonds,xp,role,created_at AS createdAt,1+CAST(xp/3 AS INTEGER) AS level FROM users WHERE id=?',id);
  if(!player)return error(res,404,'Spieler nicht gefunden');
  const count=(sql,...params)=>q(sql,...params)?.n||0;
  const creditedExercises=count('SELECT COUNT(*) AS n FROM game_exercises e JOIN game_runs r ON r.id=e.run_id WHERE r.user_id=?',id);
  const rewardedTrainings=count('SELECT COUNT(DISTINCT e.run_id) AS n FROM game_exercises e JOIN game_runs r ON r.id=e.run_id WHERE r.user_id=?',id);
  const openedChests=count('SELECT COUNT(*) AS n FROM game_chests WHERE user_id=? AND opened_at IS NOT NULL',id);
  const unopenedChests=count('SELECT COUNT(*) AS n FROM game_chests WHERE user_id=? AND opened_at IS NULL',id);
  const friends=count('SELECT COUNT(*) AS n FROM friendship WHERE a=? OR b=?',id,id);
  const purchases=count('SELECT COUNT(*) AS n FROM game_purchases WHERE user_id=?',id);
  const lastExercise=q('SELECT MAX(e.awarded_at) AS at FROM game_exercises e JOIN game_runs r ON r.id=e.run_id WHERE r.user_id=?',id)?.at||null;
  return json(res,200,{player:{...player,creditedExercises,rewardedTrainings,openedChests,unopenedChests,friends,purchases,lastExercise}});
 }
if(req.method==='GET'&&url.pathname==='/api/admin/shop'){
  const cfg=storedShop();return json(res,200,{items:shopCatalog(),version:cfg.version||0});
 }
 if(req.method==='POST'&&url.pathname==='/api/admin/shop'){
  const cfg=storedShop(),version=Number(data.version);
  if(!Number.isSafeInteger(version)||version!==(cfg.version||0))return error(res,409,'Shop wurde inzwischen geaendert. Bitte neu laden.');
  const mode=String(data.mode||'update'),stored=cfg.items.map(x=>({...x}));
  let id=String(data.id||''),existing=shopCatalog().find(x=>x.id===id);
  if(mode==='create'){
   if(stored.filter(x=>String(x.id).startsWith('custom_')).length>=20)return error(res,400,'Maximal 20 eigene Booster');
   id='custom_'+crypto.randomBytes(8).toString('hex');
   existing=null;
  }else if(mode==='update'){
   if(!existing)return error(res,404,'Booster nicht gefunden');
  }else return error(res,400,'Aktion unbekannt');
  let fields;
  try{fields=shopEditFields(data,existing)}catch(err){return error(res,400,err.message)}
  const value={id,...fields};
  const at=stored.findIndex(x=>x.id===id);
  if(at>=0)stored[at]=value;else stored.push(value);
  const nextVersion=Math.max(Date.now(),(cfg.version||0)+1);
  run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',SHOP_KEY,JSON.stringify({version:nextVersion,items:stored}));
  audit(u.id,'shop',mode,id+' '+fields.name+' '+fields.basePrice+' discount '+fields.discountPercent);
  return json(res,200,{ok:true,items:shopCatalog(),version:nextVersion});
 }
 if(req.method==='GET'&&url.pathname==='/api/admin/users')return json(res,200,{total:q('SELECT COUNT(*) AS n FROM users').n,users:all('SELECT id,username AS name,diamonds,xp,role,created_at AS createdAt,1+CAST(xp/3 AS INTEGER) AS level FROM users ORDER BY username LIMIT 500')});
 if(req.method==='POST'&&url.pathname==='/api/admin/diamonds'){
  const v=Number(data.amount),target=q('SELECT * FROM users WHERE id=?',String(data.userId||''));if(!target||!Number.isSafeInteger(v)||v<1||v>100000)return error(res,400,'Ungültiger Empfänger/Betrag');
  run('UPDATE users SET diamonds=diamonds+? WHERE id=?',v,target.id);run('INSERT INTO gifts VALUES(?,?,?,?,?)',uid(),u.id,target.id,v,Date.now());audit(u.id,target.id,'diamonds',v);return json(res,200,{ok:true})
 }
 if(req.method==='POST'&&url.pathname==='/api/admin/level'){
  const level=Number(data.level),target=q('SELECT * FROM users WHERE id=?',String(data.userId||''));if(!target||!Number.isSafeInteger(level)||level<1||level>10000)return error(res,400,'Ungültiges Level');
  run('UPDATE users SET xp=? WHERE id=?',(level-1)*3,target.id);audit(u.id,target.id,'set_level',level);return json(res,200,{ok:true})
 }
 if(req.method==='POST'&&url.pathname==='/api/admin/reset-player'){
  const target=q('SELECT * FROM users WHERE id=?',String(data.userId||''));
  if(!target)return error(res,404,'Spieler nicht gefunden');
  if(target.role==='admin')return error(res,403,'Administratorkonten können nicht zurückgesetzt werden');
  if(data.confirmName!==target.username)return error(res,400,'Bestätigung stimmt nicht mit dem Spielernamen überein');
  // Reset progress and economy, preserving login, friend code and friendships.
  // Run atomically so partial resets cannot occur.
  db.exec('BEGIN IMMEDIATE');try{
   run('DELETE FROM game_gift_codes WHERE sender_id=? OR recipient_id=?',target.id,target.id);
   run('DELETE FROM game_season_claims WHERE user_id=?',target.id);
   run('DELETE FROM game_event_claims WHERE user_id=?',target.id);
   run('DELETE FROM game_wheel WHERE user_id=?',target.id);
   run('DELETE FROM game_wheel_spins WHERE user_id=?',target.id);
   run('DELETE FROM game_daily WHERE user_id=?',target.id);
   run('DELETE FROM game_purchases WHERE user_id=?',target.id);
   run('DELETE FROM game_boosters WHERE user_id=?',target.id);
   run('DELETE FROM game_chests WHERE user_id=?',target.id);
   run('DELETE FROM game_exercises WHERE run_id IN (SELECT id FROM game_runs WHERE user_id=?)',target.id);
   run('DELETE FROM game_runs WHERE user_id=?',target.id);
   run('DELETE FROM cloud_state WHERE user_id=?',target.id);
   run('UPDATE users SET xp=0,diamonds=0 WHERE id=?',target.id);
   audit(u.id,target.id,'reset_player','Spielstand und Guthaben zurückgesetzt');
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err}
  return json(res,200,{ok:true});
 }
 if(req.method==='POST'&&url.pathname==='/api/admin/announcement'){
  const title=String(data.title||'').trim(),message=String(data.message||'').trim();if(title.length>80||message.length>1000)return error(res,400,'Text zu lang');
  const x=message?{id:uid(),title:title||'Mitteilung',message,createdAt:Date.now()}:null;
  run('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','announcement',JSON.stringify(x));audit(u.id,'all','announcement');return json(res,200,{ok:true})
 }
 if(req.method==='GET'&&url.pathname==='/api/admin/wheel')return json(res,200,{config:wheelSettings(),active:!!currentEvent().wheel});
 if(req.method==='POST'&&url.pathname==='/api/admin/wheel'){
  const current=wheelSettings(),version=Number(data.version),daily=Number(data.maxSpinsPerDay),prizes=data.prizes;
  if(!Number.isSafeInteger(version)||version!==current.version)return error(res,409,'Glücksrad wurde auf einem anderen Gerät geändert. Bitte neu laden.');
  if(!Number.isSafeInteger(daily)||daily<1||daily>5)return error(res,400,'Bitte 1 bis 5 Drehungen pro Tag wählen');
  if(!Array.isArray(prizes)||prizes.length<2||prizes.length>8||prizes.some(x=>!x||!Number.isSafeInteger(x.diamonds)||x.diamonds<1||x.diamonds>10000||!Number.isSafeInteger(x.weight)||x.weight<1||x.weight>100))return error(res,400,'Bitte 2 bis 8 gültige Gewinne mit 1 bis 100 Gewichtspunkten angeben');
  const saved={version:current.version+1,maxSpinsPerDay:daily,prizes:prizes.map(x=>({diamonds:x.diamonds,weight:x.weight}))};
  run('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',WHEEL_KEY,JSON.stringify(saved));
  audit(u.id,'all','wheel_editor',JSON.stringify({version:saved.version,maxSpinsPerDay:daily,prizes:saved.prizes}));
  return json(res,200,{ok:true,config:saved});
 }
 if(req.method==='POST'&&url.pathname==='/api/admin/events'){
  const previous=currentEvent(),now=Date.now(),enabled=!!data.wheel;
  // Editing other events must not reset a player's remaining wheel spins.
  const wheelCycleId=enabled?(previous.wheel?wheelCycle(previous):String(now)):'';
  const x={giftDiamonds:Math.max(0,Math.min(10000,Math.trunc(Number(data.giftDiamonds)||0))),doubleXp:!!data.doubleXp,season:!!data.season,wheel:enabled,wheelCycleId,updatedAt:now};
  run('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','events',JSON.stringify(x));audit(u.id,'all','events');return json(res,200,{ok:true,events:x})
 }
 error(res,404,'Endpunkt nicht gefunden');
 }catch(e){console.error(e);error(res,e.message==='Eingabe zu groß'||e.message==='Ungültiges JSON'?400:500,e.message==='Eingabe zu groß'||e.message==='Ungültiges JSON'?e.message:'Serverfehler')}}
// Initial admin is created only when explicitly configured via environment variables.
if(process.env.ADMIN_NAME&&process.env.ADMIN_PASSWORD){const name=process.env.ADMIN_NAME,pass=process.env.ADMIN_PASSWORD;if(!validName(name)||pass.length<12)throw Error('ADMIN_NAME (3–24 Zeichen) und ADMIN_PASSWORD (mind. 12 Zeichen) prüfen');const existing=q('SELECT * FROM users WHERE username=?',name);if(!existing){let salt=random(16);run('INSERT INTO users(id,username,passhash,salt,role,friend_code,created_at) VALUES(?,?,?,?,?,?,?)',uid(),name,hashPass(pass,salt),salt,'admin','FP-'+random(8).toUpperCase(),Date.now());console.log('Admin-Konto eingerichtet')}else if(existing.role!=='admin')throw Error('ADMIN_NAME ist bereits vergeben');}
const server=http.createServer(handler);server.listen(PORT,HOST,async()=>{
 console.log(`FitnessPlus Server: http://localhost:${PORT} (Datenbank: ${DBPATH})`);
 if(!passkeyReady()){console.log('FACE ID: Supabase-Zugang fehlt. Kein Einrichtungslink erstellt.');return;}
 try{
  if(await storedPasskey()){console.log('FACE ID: Bereits eingerichtet. Neuer Einrichtungslink gesperrt.');return;}
  console.log('FACE ID EINMALLINK (privat; nur in Render Logs öffnen): '+PASSKEY_ORIGIN+'/admin-passkey-setup.html#token='+SETUP_LINK_SECRET);
  console.log('FACE ID: Der Link gilt nur bis zum nächsten Serverneustart und nur bis zur ersten erfolgreichen Registrierung.');
 }catch(e){console.error('FACE ID: Einrichtungslink konnte wegen Supabase-Verbindungsfehler nicht bereitgestellt werden:',e.message)}
});
