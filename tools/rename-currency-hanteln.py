#!/usr/bin/env python3
"""FitnessPlus: visible diamond currency -> dumbbell currency, preserving server/data logic."""
from pathlib import Path
import re, shutil, subprocess, sys, datetime
root=Path('/opt/fitnessplus/public')
targets=[root/n for n in ('app.js','admin-app.js','index.html','admin.html')]
for path in targets:
    if not path.is_file():
        sys.exit('STOP: Datei fehlt: '+str(path))
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backupdir=Path('/opt/fitnessplus')/('backup-hanteln-'+stamp)
backupdir.mkdir(mode=0o700)
for path in targets:
    shutil.copy2(path, backupdir/path.name)
print('BACKUP:', backupdir, flush=True)
dictionary=[
    ('Diamantenboxen','Hantelboxen'),('Diamantboxen','Hantelboxen'),
    ('Diamanten-Shop','Hantel-Shop'),('Diamanten Store','Hantel-Shop'),
    ('Diamantenstore','Hantel-Shop'),('Diamantenshop','Hantel-Shop'),
    ('Diamanten','Hanteln'),('Diamanten','Hanteln'),
    ('Diamant','Hantel'),('diamanten','hanteln'),('diamant','hantel')
]
# German replacements apply to app UI copy; technical English identifiers
# (diamonds, diamondGift, APIs, database fields) remain untouched.
def convert(s):
    for before,after in dictionary:
        s=s.replace(before,after)
    return s.replace('💎','🏋️')
changes={}
try:
    for path in targets:
        old=path.read_text(encoding='utf-8')
        new=convert(old)
        changes[path.name]={
            'icons':old.count('💎'),
            'names':old.count('Diamant')+old.count('diamant'),
        }
        if new!=old:
            path.write_text(new,encoding='utf-8')
    for name in ('app.js','admin-app.js'):
        subprocess.run(['node','--check',str(root/name)],check=True)
    for name in ('index.html','admin.html'):
        html=(root/name).read_text(encoding='utf-8')
        if '<html' not in html or '</html>' not in html:
            raise RuntimeError('HTML unvollstaendig: '+name)
    print('HANTELN_OK',changes)
    print('ZURUECK: cp -p '+str(backupdir/'app.js')+' '+str(root/'app.js')+' ; cp -p '+str(backupdir/'admin-app.js')+' '+str(root/'admin-app.js'))
except Exception as e:
    for path in targets:
        shutil.copy2(backupdir/path.name,path)
    sys.exit('FEHLER_ZURUECKGESETZT: '+str(e))
