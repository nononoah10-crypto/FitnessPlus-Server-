#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/fitnessplus
test -s public/index.html && test -s public/admin.html && test -s public/fitnessplus-hanteln-ui.js
b="backup-hantel-svg-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$b"
cp -p public/index.html public/admin.html "$b/"
t="$(mktemp --suffix=.js)"
trap 'rm -f "$t"' EXIT
curl -fsSL 'https://raw.githubusercontent.com/nononoah10-crypto/FitnessPlus-Server-/02f70554e5d8d26fd5cd6050ff234c9636de009a/public/fitnessplus-hantel-icon.js' -o "$t"
node --check "$t"
cp "$t" public/fitnessplus-hantel-icon.js
python3 - <<'PY'
from pathlib import Path
for name in ['index.html','admin.html']:
 p=Path('public')/name
 s=p.read_text()
 assert s.count('</body>')==1,name
 if 'fitnessplus-hantel-icon.js' not in s:
  s=s.replace('</body>','<script src="fitnessplus-hantel-icon.js?v=20261019b" defer></script></body>')
  p.write_text(s)
PY
echo HANTEL_ICON_AKTIV
echo "BACKUP: $b"
