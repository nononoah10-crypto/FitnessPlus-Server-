'use strict';
// FitnessPlus online backend. Node.js 22.13+ (node:sqlite), no npm modules.
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const PORT=Number(process.env.PORT||3000),HOST=process.env.HOST||'0.0.0.0';
const ROOT=__dirname, WEB=path.join(ROOT,'public'), DBPATH=process.env.DB_PATH||path.join(ROOT,'fitnessplus.sqlite');
const db=new DatabaseSync(DBPATH);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, passhash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', friend_code TEXT UNIQUE NOT NULL, diamonds INTEGER NOT NULL DEFAULT 0 CHECK(diamonds>=0), xp INTEGER NOT NULL DEFAULT 0 CHECK(xp>=0), created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS friendship (a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, PRIMARY KEY(a,b), CHECK(a<>b));
CREATE TABLE IF NOT EXISTS gifts (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, recipient_id TEXT NOT NULL REFERENCES users(id), diamonds INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, subject TEXT NOT NULL, action TEXT NOT NULL, detail TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
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
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)throw new Error('Eingabe zu groß')}try{return raw?JSON.parse(raw):{}}catch{throw new Error('Ungültiges JSON')}}
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
 if(req.method==='POST'&&req.headers['content-type']?.split(';')[0]!=='application/json')return error(res,415,'JSON erforderlich');
 const data=req.method==='POST'?await body(req):{};
 if(req.method==='POST'&&url.pathname==='/api/register'){
  if(!validName(data.name)||typeof data.password!=='string'||data.password.length<10||data.password.length>128)return error(res,400,'Name (3–24 Zeichen) und Passwort (mind. 10 Zeichen) erforderlich');
  const id=uid(),salt=random(16),code='FP-'+random(8).toUpperCase();try{run('INSERT INTO users(id,username,passhash,salt,role,friend_code,created_at) VALUES(?,?,?,?,?,?,?)',id,data.name,hashPass(data.password,salt),salt,'user',code,Date.now())}catch{return error(res,409,'Benutzername bereits vergeben')}return startSession(res,q('SELECT * FROM users WHERE id=?',id));
 }
 if(req.method==='POST'&&url.pathname==='/api/login'){
  const u=typeof data.name==='string'?q('SELECT * FROM users WHERE username=?',data.name):null;
  if(!u||typeof data.password!=='string'||!authPass(u,data.password))return error(res,401,'Login fehlgeschlagen');return startSession(res,u)
 }
 const u=session(req);if(!u)return error(res,401,'Bitte anmelden');
 if(req.method==='POST'&&url.pathname==='/api/logout'){const tok=cookies(req).fp_session;run('DELETE FROM sessions WHERE token_hash=?',crypto.createHash('sha256').update(tok).digest('hex'));cookie(res,'',true);return json(res,200,{ok:true})}
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
if(process.env.ADMIN_NAME&&process.env.ADMIN_PASSWORD){const name=process.env.ADMIN_NAME,pass=process.env.ADMIN_PASSWORD;if(!validName(name)||pass.length<12)throw Error('ADMIN_NAME (3–24 Zeichen) und ADMIN_PASSWORD (mind. 12 Zeichen) prüfen');const existing=q('SELECT * FROM users WHERE username=?',name);if(!existing){let salt=random(16);run('INSERT INTO users(id,username,passhash,salt,role,friend_code,created_at) VALUES(?,?,?,?,?,?,?)',uid(),name,hashPass(pass,salt),salt,'admin','FP-'+random(8).toUpperCase(),Date.now());console.log('Admin-Konto eingerichtet')}else if(existing.role!=='admin')throw Error('ADMIN_NAME ist bereits vergeben');}
const server=http.createServer(handler);server.listen(PORT,HOST,()=>console.log(`FitnessPlus Server: http://localhost:${PORT} (Datenbank: ${DBPATH})`));
