'use strict';
// FitnessPlus online backend. Node.js 22.13+ (node:sqlite), no npm modules.
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
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
function currentEvent(){return JSON.parse(q('SELECT value FROM settings WHERE key=?','events')?.value||'{}')}
function eventId(e){return String(e.updatedAt||0)}
function seasonTiers(){return [{at:3,diamonds:10},{at:10,diamonds:25},{at:25,diamonds:60},{at:50,diamonds:120}]}
function gameEvents(u){const e=currentEvent(),id=eventId(e),day=new Date().toISOString().slice(0,10),progress=q('SELECT COUNT(*) n FROM game_exercises WHERE run_id IN (SELECT id FROM game_runs WHERE user_id=?) AND awarded_at>=?',u.id,Number(e.updatedAt)||0).n;return {config:e,id,progress,tiers:seasonTiers().map(t=>({...t,claimed:!!q('SELECT 1 FROM game_season_claims WHERE user_id=? AND season_id=? AND tier=?',u.id,id,t.at)})),wheelUsed:!!q('SELECT 1 FROM game_wheel WHERE user_id=? AND event_id=? AND award_day=?',u.id,id,day),giftClaimed:!!q('SELECT 1 FROM game_event_claims WHERE user_id=? AND event_id=?',u.id,id)}}
const boostCatalog={boost2small:{price:60,multiplier:2,uses:3},boost2long:{price:130,multiplier:2,uses:8},boost3mega:{price:200,multiplier:3,uses:5}};
const q=(sql,...args)=>db.prepare(sql).get(...args), all=(sql,...args)=>db.prepare(sql).all(...args), run=(sql,...args)=>db.prepare(sql).run(...args);
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
 if(req.method==='POST'&&url.pathname==='/api/register'){
  if(!validName(data.name)||typeof data.password!=='string'||data.password.length<10||data.password.length>128)return error(res,400,'Name (3–24 Zeichen) und Passwort (mind. 10 Zeichen) erforderlich');
  const id=uid(),salt=random(16),code='FP-'+random(8).toUpperCase();try{run('INSERT INTO users(id,username,passhash,salt,role,friend_code,created_at) VALUES(?,?,?,?,?,?,?)',id,data.name,hashPass(data.password,salt),salt,'user',code,Date.now())}catch{return error(res,409,'Benutzername bereits vergeben')}return startSession(res,q('SELECT * FROM users WHERE id=?',id));
 }
 if(req.method==='POST'&&url.pathname==='/api/login'){
  const u=typeof data.name==='string'?q('SELECT * FROM users WHERE username=?',data.name):null;
  if(!u||typeof data.password!=='string'||!authPass(u,data.password))return error(res,401,'Login fehlgeschlagen');return startSession(res,u)
 }
  // Separate Admin-App: initial PIN setup requires the Render bootstrap secret.
  const adminAccount=()=>process.env.ADMIN_NAME?q('SELECT * FROM users WHERE username=? AND role=?',process.env.ADMIN_NAME,'admin'):null;
  const pinRow=()=>q('SELECT value FROM settings WHERE key=?','admin_pin_v1');
  const validPin=p=>typeof p==='string'&&/^[0-9]{6,12}$/.test(p);
  const pinDigest=(p,salt)=>crypto.scryptSync(p,salt,64).toString('hex');
  if(req.method==='GET'&&url.pathname==='/api/admin/pin-status')return json(res,200,{configured:!!pinRow()});
  if(req.method==='POST'&&url.pathname==='/api/admin/pin-setup'){
   const admin=adminAccount();
   if(pinRow())return error(res,409,'Admin-Code bereits eingerichtet');
   if(!admin||!process.env.ADMIN_PASSWORD||typeof data.bootstrapPassword!=='string'||data.bootstrapPassword!==process.env.ADMIN_PASSWORD)return error(res,403,'Einrichtung nicht autorisiert');
   if(!validPin(data.pin))return error(res,400,'Code muss aus 6 bis 12 Ziffern bestehen');
   const salt=random(24),value=JSON.stringify({salt,hash:pinDigest(data.pin,salt)});
   run('INSERT INTO settings(key,value) VALUES(?,?)','admin_pin_v1',value);
   audit(admin.id,admin.id,'admin_pin_setup');return startSession(res,admin);
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/pin-login'){
   const admin=adminAccount(),entry=pinRow();
   if(!admin||!entry||!validPin(data.pin))return error(res,401,'Code ungültig');
   const {salt,hash}=JSON.parse(entry.value);
   if(!crypto.timingSafeEqual(Buffer.from(pinDigest(data.pin,salt),'hex'),Buffer.from(hash,'hex')))return error(res,401,'Code ungültig');
   return startSession(res,admin);
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/pin-change'){
   const actor=session(req),entry=pinRow();
   if(!actor||actor.role!=='admin'||!entry)return error(res,403,'Nicht autorisiert');
   const {salt,hash}=JSON.parse(entry.value);
   if(!validPin(data.oldPin)||!crypto.timingSafeEqual(Buffer.from(pinDigest(data.oldPin,salt),'hex'),Buffer.from(hash,'hex')))return error(res,403,'Bisheriger Code falsch');
   if(!validPin(data.newPin))return error(res,400,'Neuer Code muss aus 6 bis 12 Ziffern bestehen');
   const nextSalt=random(24);
   run('UPDATE settings SET value=? WHERE key=?',JSON.stringify({salt:nextSalt,hash:pinDigest(data.newPin,nextSalt)}),'admin_pin_v1');
   audit(actor.id,actor.id,'admin_pin_change');return json(res,200,{ok:true});
  }
 const u=session(req);if(!u)return error(res,401,'Bitte anmelden');
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
  const item=String(data.item||''),b=boostCatalog[item];if(!b)return error(res,400,'Unbekanntes Produkt');
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
  const e=currentEvent(),id=eventId(e),day=new Date().toISOString().slice(0,10);
  if(!e.wheel)return error(res,403,'Glücksrad ist nicht aktiv');
  db.exec('BEGIN IMMEDIATE');try{
   if(q('SELECT 1 FROM game_wheel WHERE user_id=? AND event_id=? AND award_day=?',u.id,id,day)){db.exec('ROLLBACK');return error(res,409,'Heute bereits gedreht')}
   const award=[5,10,15,20,30][crypto.randomInt(5)];run('INSERT INTO game_wheel VALUES(?,?,?,?)',u.id,id,day,award);
   run('UPDATE users SET diamonds=diamonds+? WHERE id=?',award,u.id);db.exec('COMMIT');return json(res,200,{ok:true,diamonds:award,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
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
  return json(res,200,{gifts:all('SELECT g.id,g.item,g.created_at AS createdAt,u.username AS sender FROM direct_gifts g JOIN users u ON u.id=g.sender_id WHERE g.recipient_id=? AND g.claimed_at IS NULL ORDER BY g.created_at DESC LIMIT 50',u.id)});
 }
 if(req.method==='POST'&&url.pathname==='/api/gifts/send'){
  const item=String(data.item||''),b=boostCatalog[item],friendId=String(data.friendId||'');
  if(!b)return error(res,400,'Unbekannter Booster');
  if(friendId===u.id||!q('SELECT 1 FROM friendship WHERE (a=? AND b=?) OR (a=? AND b=?)',u.id,friendId,friendId,u.id))return error(res,403,'Nur an Freunde senden');
  db.exec('BEGIN IMMEDIATE');try{
   if(!run('UPDATE users SET diamonds=diamonds-? WHERE id=? AND diamonds>=?',b.price,u.id,b.price).changes){db.exec('ROLLBACK');return error(res,400,'Nicht genug Diamanten')}
   run('INSERT INTO direct_gifts(id,sender_id,recipient_id,item,created_at) VALUES(?,?,?,?,?)',uid(),u.id,friendId,item,Date.now());db.exec('COMMIT');
   return json(res,200,{ok:true,user:publicUser(q('SELECT * FROM users WHERE id=?',u.id))});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/gifts/claim'){
  const giftId=String(data.giftId||'');db.exec('BEGIN IMMEDIATE');try{
   const gift=q('SELECT * FROM direct_gifts WHERE id=? AND recipient_id=? AND claimed_at IS NULL',giftId,u.id);
   if(!gift){db.exec('ROLLBACK');return error(res,404,'Geschenk nicht verfügbar')}
   const active=q('SELECT uses FROM game_boosters WHERE user_id=?',u.id);
   if(active?.uses>0){db.exec('ROLLBACK');return error(res,409,'Bitte zuerst deinen aktiven Booster aufbrauchen')}
   const b=boostCatalog[gift.item];if(!b){db.exec('ROLLBACK');return error(res,400,'Produkt nicht verfügbar')}
   run('UPDATE game_boosters SET multiplier=?,uses=? WHERE user_id=?',b.multiplier,b.uses,u.id);
   run('INSERT OR IGNORE INTO game_boosters(user_id,multiplier,uses) VALUES(?,?,?)',u.id,b.multiplier,b.uses);
   run('UPDATE direct_gifts SET claimed_at=? WHERE id=? AND claimed_at IS NULL',Date.now(),giftId);
   db.exec('COMMIT');return json(res,200,{ok:true,booster:{multiplier:b.multiplier,uses:b.uses}});
  }catch(err){db.exec('ROLLBACK');throw err}
 }
 if(req.method==='POST'&&url.pathname==='/api/game/gift/create'){
  const item=String(data.item||''),boost=boostCatalog[item],recipientCode=String(data.friendCode||'').trim();
  if(!boost)return error(res,400,'Unbekannter Geschenk-Booster');
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
   const b=boostCatalog[gift.item];if(!b){db.exec('ROLLBACK');return error(res,400,'Geschenk nicht mehr verfügbar')}
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
 if(req.method==='GET'&&url.pathname==='/api/admin/users')return json(res,200,{users:all('SELECT id,username AS name,diamonds,xp,role,1+CAST(xp/3 AS INTEGER) AS level FROM users ORDER BY username LIMIT 500')});
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
 if(req.method==='POST'&&url.pathname==='/api/admin/events'){
  const x={giftDiamonds:Math.max(0,Math.min(10000,Math.trunc(Number(data.giftDiamonds)||0))),doubleXp:!!data.doubleXp,season:!!data.season,wheel:!!data.wheel,updatedAt:Date.now()};run('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','events',JSON.stringify(x));audit(u.id,'all','events');return json(res,200,{ok:true,events:x})
 }
 error(res,404,'Endpunkt nicht gefunden');
 }catch(e){console.error(e);error(res,e.message==='Eingabe zu groß'||e.message==='Ungültiges JSON'?400:500,e.message==='Eingabe zu groß'||e.message==='Ungültiges JSON'?e.message:'Serverfehler')}}
// Initial admin is created only when explicitly configured via environment variables.
if(process.env.ADMIN_NAME&&process.env.ADMIN_PASSWORD){const name=process.env.ADMIN_NAME,pass=process.env.ADMIN_PASSWORD;if(!validName(name)||pass.length<12)throw Error('ADMIN_NAME (3–24 Zeichen) und ADMIN_PASSWORD (mind. 12 Zeichen) prüfen');const existing=q('SELECT * FROM users WHERE username=?',name);if(!existing){let salt=random(16);run('INSERT INTO users(id,username,passhash,salt,role,friend_code,created_at) VALUES(?,?,?,?,?,?,?)',uid(),name,hashPass(pass,salt),salt,'admin','FP-'+random(8).toUpperCase(),Date.now());console.log('Admin-Konto eingerichtet')}else if(existing.role!=='admin')throw Error('ADMIN_NAME ist bereits vergeben');else if(!authPass(existing,pass)){const salt=random(16);run('UPDATE users SET passhash=?,salt=? WHERE id=?',hashPass(pass,salt),salt,existing.id);}}
const server=http.createServer(handler);server.listen(PORT,HOST,()=>console.log(`FitnessPlus Server: http://localhost:${PORT} (Datenbank: ${DBPATH})`));
