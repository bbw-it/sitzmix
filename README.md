# SitzMix

Modernes Sitzplan-Tool für Lehrpersonen — generiert faire, regelbasierte Sitzordnungen per Klick. **Rein clientseitig: alle Daten bleiben im Browser, der Server speichert nichts.**

![Version](https://img.shields.io/badge/version-2.0-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![React](https://img.shields.io/badge/react-19-61DAFB)

---

## Übersicht

SitzMix unterstützt Lehrpersonen beim wöchentlichen Mischen von Sitzordnungen. Klassen und Zimmer werden einmalig erfasst, danach genügt ein Klick, um eine neue, zufällige Sitzordnung zu erzeugen — unter Berücksichtigung definierter Regeln (z.B. welche Lernende nicht nebeneinander sitzen dürfen).

Die App läuft **vollständig im Browser**. Es gibt kein Backend, keine Datenbank und keine API — der Server liefert ausschliesslich statische Dateien aus.

## Datenschutz

SitzMix verarbeitet **keine** personenbezogenen Daten auf dem Server. Klassenbezeichnungen, Schülernamen und Sitz-Regeln — sowie alle übrigen Daten, Grundriss-Bilder und Skizzen — werden ausschliesslich **lokal im Browser** der Lehrperson gespeichert (IndexedDB). Es gibt keinen Upload an einen Server; dieser sieht die Daten der Nutzer nie. Damit ist die datenschutzrechtliche Vorgabe baulich erfüllt.

- Beim ersten Start fordert die App **Persistent Storage** an, um den Browser-Speicher vor automatischer Verdrängung zu schützen.
- Ein dezenter Hinweis-Banner erinnert daran, regelmässig zu sichern.
- Über **Einstellungen → Daten exportieren** lässt sich jederzeit eine JSON-Sicherung erstellen (inkl. Grundriss-Bildern und Skizzen). Diese kann auf einem anderen Gerät oder nach dem Leeren des Browser-Speichers wieder importiert werden.

---

## Funktionen

### Sitzplan-Generator

- Klasse und Zimmer auswählen, Sitzplan per Klick generieren (Berechnung läuft im Browser)
- Zwei Verteilmodi:
  - **Sequenziell** — Plätze werden der Reihe nach befüllt
  - **Pro Tischgruppe** — Lernende gleichmässig auf Tischgruppen verteilen, mit Abstandsoptimierung
- Berücksichtigung von Regeln (wer **nicht** nebeneinander sitzen darf)
- **Abwesende markieren:** Lernende per `×`-Klick als abwesend setzen — der Platz wird frei, die Person landet in einer sichtbaren Abwesenden-Liste. Zurückholen per Klick (nächster freier Platz) oder per Drag auf einen freien Platz.
- **Manuell umordnen:** Lernende per **Drag & Drop** verschieben oder tauschen — mit visuellem Feedback (Quelle wird transparent, Zielplatz hervorgehoben).
- **Neu mischen (nur Anwesende):** neu generieren und dabei die Abwesenden auslassen.
- **Perspektive umschalten:** Wechsel zwischen **Lehrpersonen-Sicht** (Standard) und **Lernenden-Sicht** (180° gedreht, wie von der gegenüberliegenden Seite). Die Sitzordnung (wer neben wem sitzt) bleibt erhalten, Namen bleiben aufrecht und lesbar.
- Sitzplan als **PNG exportieren** oder in der **Vollbild-Lightbox** betrachten (zeigt immer den aktuell bearbeiteten Stand inkl. Spiegelung)
- Jederzeit neu mischen mit einem Klick

### Klassenverwaltung

- Klassen erstellen und benennen
- Lernende einzeln oder im Bulk (Textfeld, getrennt durch Zeilenumbruch/Komma/Semikolon) hinzufügen
- Individuelle Farben pro Lernende (Pastell-Palette) für visuelle Unterscheidung
- Regeln definieren: Paare festlegen, die nicht nebeneinander sitzen sollen
- Klassen bearbeiten und löschen

### Zimmerverwaltung

Ein Zimmer hat **entweder** einen hochgeladenen Grundriss **oder** eine selbst gezeichnete Skizze:

- **Bild hochladen** — fertige Grundrisse als PNG/JPEG (wird lokal im Browser gespeichert)
- **Grundriss skizzieren** — ein integrierter Mini-Editor:
  - Wände als **Rechtecke** und **Kreise** einzeichnen
  - Rechtecke sind editierbare **Polygone**: Eckpunkte verschieben, an Kantenmitten neue Punkte hinzufügen (z.B. für L-Formen), Punkte löschen
  - Kreise verschieben und grössern, Formen löschen
  - Skizze als **JSON speichern** und später über denselben Datei-Dialog wieder laden (ungültige Dateien werden sauber abgefangen)
- Tischgruppen (Areas) mit Position, Grösse und Farbe definieren
- Sitzplätze per **Drag & Drop** auf dem Grundriss platzieren, **Snap-to-Grid** (2%-Raster)
- Sitzplätze verschieben, Tischgruppen automatisch zuweisen oder per Tastatur (Delete/Backspace) entfernen

### Datenmanagement

- Gesamten Datenbestand als **JSON exportieren** (Backup, inkl. Grundriss-Bilder als Base64 und Skizzen)
- JSON-Backup wieder **importieren** (Restore) — liest auch ältere v1-Exporte

---

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 19, Vite 7, TailwindCSS 4, React Router 7 |
| Datenhaltung | IndexedDB (im Browser) |
| Grafik | SVG (Skizzen), html-to-image (PNG-Export) |
| Tests | Vitest, fake-indexeddb |
| Deployment | Docker + Nginx (statisch) |

---

## Schnellstart

### Voraussetzungen

- [Docker](https://docs.docker.com/engine/install/) mit Compose v2 (für Deployment)
- alternativ Node.js 22+ (für lokale Entwicklung)

### Repository klonen

```bash
git clone <REPO-URL> sitzmix
cd sitzmix
```

### Mit Docker starten

```bash
./setup.sh
```

Das Skript prüft Docker/Compose, baut das Image und startet den Container. SitzMix ist danach erreichbar unter **http://localhost:3001**.

Alternativ manuell:

```bash
docker compose up -d --build   # bauen & starten
docker compose down            # stoppen
```

Der Port lässt sich über die Umgebungsvariable `SITZMIX_PORT` ändern (Standard: `3001`):

```bash
SITZMIX_PORT=8090 ./setup.sh
```

`setup.sh` ist **idempotent** — ein erneuter Aufruf baut neu und aktualisiert die laufende Instanz. So lässt sich nach einem `git pull` einfach die neueste Version ausrollen.

### Öffentliche Domain (z.B. sitzmix.ch)

Einen Reverse-Proxy (nginx/Caddy/Traefik) auf den SitzMix-Port richten und dort TLS terminieren. Der Container selbst liefert nur HTTP auf Port 80 (intern) bzw. den gemappten Host-Port.

---

## Lokale Entwicklung

```bash
cd frontend
npm install
npm run dev      # Vite-Dev-Server auf http://localhost:5173
npm test         # Unit-/Integrationstests (Vitest)
npm run build    # Produktions-Build nach dist/
```

Kein Backend, keine Datenbank — die App läuft vollständig im Browser.

---

## Projektstruktur

```
sitzmix/
├── docker-compose.yml          # Ein Service (Nginx, statisch)
├── Dockerfile                  # Multi-Stage: Vite-Build → Nginx
├── nginx.conf                  # Statisches Hosting + SPA-Fallback
├── setup.sh                    # Deployment-Skript (idempotent)
├── docs/                       # Design-Specs & Implementierungspläne
└── frontend/
    ├── vite.config.js
    ├── vitest.config.js
    ├── public/
    │   └── default-floorplan.png   # Beispiel-Grundriss (Seed)
    └── src/
        ├── main.jsx                # Entry Point (mountet StoreProvider)
        ├── App.jsx                 # Routing & Toast-Context
        ├── lib/
        │   ├── db.js               # IndexedDB-Wrapper (Snapshot + Bild-Blobs)
        │   ├── store.js            # In-Memory-Store, CRUD, Generate, Persistenz
        │   ├── exportImport.js     # JSON Export/Import (v1 + v2)
        │   ├── seatingAlgorithm.js # Sitzplan-Algorithmus (Backtracking)
        │   ├── seatingPlan.js      # Reine Helfer fürs Umordnen/Abwesend
        │   ├── sketch.js           # Skizzen-Geometrie + Datei-Validierung
        │   └── seedData.js         # Beispieldaten beim ersten Start
        ├── store/
        │   └── StoreProvider.jsx   # React-Context + useStore()-Hook
        └── components/
            ├── layout/             # Navbar + Datenschutz-Banner
            ├── generator/          # GeneratorPage, AbsentList
            ├── classes/            # Klassen-Liste & -Editor
            ├── rooms/              # Zimmer-Editor, SeatPlacer,
            │                       #   FloorplanSketch, SketchEditor
            ├── settings/           # Import/Export-Modals
            └── common/             # Toast, SearchableSelect
```

---

## Datenmodell (im Browser)

Ein Snapshot-Objekt in IndexedDB (Object-Store `app`, Key `snapshot`); Grundriss-Bilder als separate Blobs (Object-Store `images`):

```js
{
  schemaVersion: 2,
  classes: [
    { id, name,
      students: [{ id, name, color }],
      rules:    [{ id, student_a_id, student_b_id }] }
  ],
  rooms: [
    { id, name, image_width, image_height,
      floorplan_image_path,   // = imageId des Blobs, oder null
      floorplan_sketch,       // { version, width, height, shapes } oder null (exklusiv zum Bild)
      areas: [{ id, name, color, sort_order, x_pos, y_pos, width_pct, height_pct }],
      seats: [{ id, seat_number, x_position, y_position, area_id }] }
  ]
}
```

- IDs sind UUIDs (`crypto.randomUUID()`). Nach jeder Änderung wird der vollständige Snapshot persistiert.
- `floorplan_image_path` und `floorplan_sketch` schliessen sich gegenseitig aus (entweder Bild oder Skizze).
- Eine Skizze ist rein visuell und beeinflusst den Algorithmus nicht.

### Datei-Formate

- **App-Backup:** `{ type: "sitzmix-export", version: 2, classes, rooms }` (Bilder als Base64, Skizzen inline).
- **Einzelne Skizze:** `{ type: "sitzmix-floorplan", version: 1, width, height, shapes }`.

---

## Sitzplan-Algorithmus

Der Algorithmus verwendet **Backtracking mit Constraint Solving** und läuft vollständig im Browser:

1. **Sequenzieller Modus**: Lernende werden zufällig auf Plätze verteilt. Per Backtracking wird sichergestellt, dass verbotene Paare weder im selben Bereich noch auf physisch benachbarten Plätzen landen.

2. **Tischgruppen-Modus** (empfohlen):
   - Berechnet optimale Verteilung (z.B. 24 Lernende auf 6 Tische → 4 pro Tisch)
   - Weist Lernende per Backtracking den Tischgruppen zu (verbotene Paare nie am gleichen Tisch)
   - Optimiert über bis zu 60 Durchläufe den Abstand zwischen verbotenen Paaren
   - Fallback auf sequenziellen Modus, falls keine Lösung gefunden wird

**Nachbarschaftserkennung**: Plätze gelten als benachbart, wenn ihr Abstand unter 15% der Grundrissdimensionen liegt.

---

## Beispieldaten

Beim allerersten Start (leerer Browser-Speicher) wird ein Beispieldatensatz angelegt:

- 1 Klasse mit 24 Lernenden
- 1 Zimmer mit 6 Tischgruppen à 4 Plätzen
- Grundriss-Bild mit vorplatzierten Sitzen

Über das Daten-Backup oder durch Löschen des Browser-Speichers lässt sich dieser Zustand zurücksetzen.

---

## Lizenz

Dieses Projekt ist für den schulischen Einsatz bestimmt.
