#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/fitnessplus
test -f public/index.html
test -f public/app.js
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL 'https://raw.githubusercontent.com/nononoah10-crypto/FitnessPlus-Server-/743ca53873e7cdd577f9618d755814c508cb64c3/public/fitnessplus-redesign-v2.css' -o "$tmp"
test "$(wc -c < "$tmp")" -gt 8000 || { echo 'STOP: Stylesheet incomplete'; exit 1; }
if grep -q 'fitnessplus-redesign-v2.css?v=2' public/index.html; then
  echo 'DESIGN_BEREITS_AKTIV'
  exit 0
fi
stamp="$(date +%Y%m%d-%H%M%S)"
backup="public/index.html.backup-redesign-$stamp"
cp -p public/index.html "$backup"
echo "SICHERUNG: $backup"
cp "$tmp" public/fitnessplus-redesign-v2.css
python3 - <<'PY'
from pathlib import Path
import re
p=Path('public/index.html')
s=p.read_text(encoding='utf-8')
if s.count('</head>')!=1:
    raise SystemExit('STOP: HTML Struktur unerwartet')
# remove only old optional modern CSS links, never app.js, icons, or any functional scripts.
s=re.sub(r'<link\s+rel=["\']stylesheet["\']\s+href=["\']fitnessplus-modern\.css(?:\?[^"\']*)?["\']\s*/?>','',s)
s=re.sub(r'<link\s+rel=["\']stylesheet["\']\s+href=["\']fitnessplus-redesign-v2\.css(?:\?[^"\']*)?["\']\s*/?>','',s)
s=s.replace('</head>','<link rel="stylesheet" href="fitnessplus-redesign-v2.css?v=2"></head>')
p.write_text(s,encoding='utf-8')
PY
if ! grep -q 'fitnessplus-redesign-v2.css?v=2' public/index.html; then
  cp -p "$backup" public/index.html
  echo 'FEHLER: HTML wiederhergestellt'
  exit 1
fi
# static CSS only: no restart of runtime or changes to JavaScript/data.
echo 'DESIGN_V2_AKTIV'
echo "ZURUECK: cp -p $backup public/index.html"
