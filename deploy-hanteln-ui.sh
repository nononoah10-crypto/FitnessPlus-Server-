#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/fitnessplus
test -s public/app.js
test -s public/admin-app.js
test -s public/index.html
test -s public/admin.html
backup="backup-hanteln-ui-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$backup"
cp -p public/index.html public/admin.html "$backup/"
echo "BACKUP: /opt/fitnessplus/$backup"
temp="$(mktemp)"
trap 'rm -f "$temp"' EXIT
curl -fsSL 'https://raw.githubusercontent.com/nononoah10-crypto/FitnessPlus-Server-/47601e845cefe9d13cadd95d8145c8686079f42f/public/fitnessplus-hanteln-ui.js' -o "$temp"
test "$(wc -c < "$temp")" -gt 1000
node --check "$temp"
cp "$temp" public/fitnessplus-hanteln-ui.js
if ! python3 - <<'PY'
from pathlib import Path
for name in ('index.html','admin.html'):
 p=Path('public')/name
 s=p.read_text(encoding='utf-8')
 if s.count('</body>')!=1:
  raise SystemExit('STOP: unexpected HTML structure: '+name)
 if 'fitnessplus-hanteln-ui.js' not in s:
  s=s.replace('</body>','<script src="fitnessplus-hanteln-ui.js?v=1" defer></script></body>')
  p.write_text(s,encoding='utf-8')
PY
then
 cp -p "$backup/index.html" public/index.html
 cp -p "$backup/admin.html" public/admin.html
 echo 'FEHLER: HTML wiederhergestellt'
 exit 1
fi
grep -q 'fitnessplus-hanteln-ui.js' public/index.html
grep -q 'fitnessplus-hanteln-ui.js' public/admin.html
echo 'HANTELN_AKTIV'
echo "RUECKGAENGIG: cp -p $backup/index.html public/index.html && cp -p $backup/admin.html public/admin.html"
