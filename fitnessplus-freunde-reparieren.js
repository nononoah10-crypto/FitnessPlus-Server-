'use strict';
// FitnessPlus friend-request database schema repair.
// Patches only server initialization and retains existing accounts, diamonds and routes.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = __dirname;
const server = path.join(root, 'server.js');
if (!fs.existsSync(server)) throw Error('server.js im gleichen Ordner nicht gefunden.');
const before = fs.readFileSync(server, 'utf8');
const marker = '// FitnessPlus Freundschaftsanfragen: automatische, nicht-destruktive Migration';
const startup = "const db=new DatabaseSync(DBPATH);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');";
if (!before.includes("'/api/friends/requests'")) throw Error('Die Freundschaftsanfragen-API fehlt in dieser server.js. Keine Änderung vorgenommen.');
if (before.includes(marker)) {
  console.log('Freundes-Migration ist bereits eingebaut. Keine Änderung nötig.');
  process.exit(0);
}
if (!before.includes(startup)) throw Error('Datenbank-Initialisierung nicht gefunden. Keine Änderung vorgenommen.');
const addition = `
${marker}
db.exec(\`CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(sender_id, recipient_id),
  CHECK(sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient_id, created_at);\`);
`;
const next = before.replace(startup, startup + addition);
const tmp = server + '.friends-new.tmp';
const backup = server + '.bak-vor-freunde-migration';
if (!fs.existsSync(backup)) fs.copyFileSync(server, backup, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(tmp, next);
try {
  cp.execFileSync(process.execPath, ['--check', tmp], {stdio:'pipe'});
  fs.renameSync(tmp, server);
  console.log('OK: server.js ergänzt und Syntax geprüft.');
  console.log('Backup: ' + backup);
  console.log('Nächster Schritt: sudo systemctl restart fitnessplus.service');
} catch (err) {
  try { fs.unlinkSync(tmp); } catch (_) {}
  console.error('Syntaxprüfung fehlgeschlagen, server.js blieb unverändert.');
  throw err;
}
