# Headquarter RWS2 🍻

Die digitale Getränkekasse und Teamverwaltung für RW Sutthausen.

## 🔄 Änderungen synchronisieren (Git-Workflow)

### 1. Neuesten Stand laden (Pull)
Bevor du startest oder wenn andere Änderungen gemacht haben, solltest du immer den neuesten Stand vom Server holen:
1. Drücke **`F1`** (oder `Strg` + `Shift` + `P`).
2. Tippe **"Terminal"** ein und wähle **"Terminal: Create New Terminal"**.
3. Kopiere diesen Befehl und drücke Enter:
   `git pull`

### 2. Eigene Änderungen live schalten (Push)
Damit deine neuen Features auf der Webseite erscheinen, musst du sie zu GitHub "pushen":
1. Führe den obigen Schritt zum Öffnen des Terminals aus.
2. Kopiere diesen Befehl und drücke Enter:
   `git add . && git commit -m "Update" && git push`

## 🔑 Erstmalige Einrichtung (falls Fehler "Authentication failed")

GitHub verlangt ein **Token** statt deines Passworts.

1. Erstelle ein Token unter [GitHub Settings > Tokens (classic)](https://github.com/settings/tokens).
2. Setze das Häkchen bei **`repo`**.
3. Nutze diesen Befehl im Terminal (ersetze `DEIN_TOKEN`):
   `git remote set-url origin https://DEIN_TOKEN@github.com/theRiggers/Bierliste-RWS2.git`
4. Danach klappt `git push` ohne Passwortabfrage.

## 🌍 Hosting
Gehostet via **Firebase App Hosting** in Frankfurt (europe-west3).
Automatische Deployments bei jedem Push auf den `main` Branch.
