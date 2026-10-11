FITNESSPLUS – ECHTER SERVER / ERSTE ONLINE-VERSION

Voraussetzung: Node.js 22.13 oder neuer, Hosting mit dauerhaftem Speicher für SQLite.

LOKAL STARTEN
1. Terminal im Ordner öffnen.
2. Admin-Zugang in Umgebungsvariablen setzen, zum Beispiel unter Linux/macOS:
   ADMIN_NAME=MeinAdmin ADMIN_PASSWORD='HIER-EIN-LANGES-PASSWORT' node server.js
   oder Windows PowerShell:
   $env:ADMIN_NAME='MeinAdmin'; $env:ADMIN_PASSWORD='HIER-EIN-LANGES-PASSWORT'; node server.js
3. http://localhost:3000/ öffnen; die Online-Funktionen sind unter /online.html.
4. Normale Nutzer registrieren sich direkt unter /online.html.
5. Für Produktion HTTPS verwenden und NODE_ENV=production setzen.

HOSTING
Auf einem Node.js-Host (kein reines Netlify Drop) laufen lassen. Startbefehl: npm start.
Umgebungsvariablen: NODE_ENV=production, ADMIN_NAME, ADMIN_PASSWORD, PORT (wird vom Host gesetzt), DB_PATH=/persistenter-pfad/fitnessplus.sqlite.
WICHTIG: SQLite-Datei braucht persistenten Speicher. Ohne persistenten Speicher gehen Benutzer und Daten beim Neustart verloren.
SICHERHEIT: Admin-Passwort niemals in öffentliche Dateien oder Git-Repositories legen. Für größere öffentliche Nutzung später Managed PostgreSQL, Backups, Monitoring, 2FA und stärkere Rate-Limits ergänzen.

AKTUELL FUNKTIONIERT ONLINE
- Registrierung, Login per Session-Cookie und Passwort-Hash
- gemeinsamer Freundes-Code, Freundesliste und Live-Online-Levelstände
- Admin kann Diamanten vergeben und Level setzen oder auf Level 1 zurücksetzen
- Admin kann Nachrichten und Event-Konfiguration zentral speichern
- Rollenprüfung erfolgt auf dem Server; normale Accounts haben keine Admin-API-Rechte

NOCH NICHT VERBUNDEN
Die vorhandene FitnessPlus-Trainingsansicht, der bisherige lokale Diamanten-Shop, Truhen,
Tagesbelohnungen, Geschenkcodes und lokale Level laufen weiterhin lokal wie zuvor.
ONLINE-XP und Online-Diamanten sind daher NOCH NICHT mit alten lokalen Werten synchronisiert.
Die Server-Events speichern zunächst nur die Konfiguration. Es werden keine neuen Belohnungen automatisch ausgeschüttet.
Das ist bewusst so, damit alte manipulierbare Browserdaten nicht ungeprüft als echte Serverwerte gelten.

Kein Server ist bereits deployed. Dieses ZIP ist ein startbares Serverprojekt, kein öffentlich erreichbarer Dienst.
