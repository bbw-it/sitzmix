# SitzMix — Umbau auf clientseitige Architektur

**Datum:** 2026-05-30
**Status:** Design freigegeben, bereit für Implementierungsplan

## Ziel & Motivation

SitzMix wird von einer klassischen 3-Schichten-Anwendung (React → Express → MariaDB)
zu einer **rein clientseitigen Single-Page-App** umgebaut. Treiber:

1. **Datenschutz (Vorgabe):** Personenbezogene Daten — Klassenbezeichnungen,
   Schülernamen, Sitz-Regeln — dürfen **nicht auf dem Server verarbeitet oder
   gespeichert** werden.
2. **Schlankheit:** Kein SQL, kein Backend-Dienst, keine DB-Container mehr. Die
   Datenlast ist winzig (pro Lehrperson eine Handvoll Klassen/Zimmer).
3. **Hosting:** Bereitstellung auf sitzmix.ch, sodass der Betreiber stets die
   neueste Version ausliefert, **aber Nutzerdaten nie sieht**.

Entscheidende Erkenntnis aus der Ist-Analyse: Der einzige inhaltlich schwere
Serverteil — der Backtracking-Sitzplan-Algorithmus (`seatingAlgorithm.js`,
~355 LOC) — ist bereits eine reine, seiteneffektfreie Funktion und läuft
unverändert im Browser. Der Server macht ansonsten nur Datenhaltung. Diese lässt
sich vollständig in den Browser verlagern.

## Datenschutz-Scope

| Datum | Sensibel? | Ablageort |
|---|---|---|
| Klassenbezeichnung | ja | nur Browser |
| Schülernamen | ja | nur Browser |
| Sitz-Regeln (verbotene Paare) | ja | nur Browser |
| Zimmer, Tischgruppen, Sitzpositionen | nein | Browser (aus Architekturgründen) |
| Grundriss-Bilder | nein | Browser (Variante A, siehe unten) |

Da die App öffentlich und ohne Login läuft (viele unabhängige Lehrpersonen), sind
Zimmer faktisch pro Nutzer. Es gibt keine serverseitige Nutzer-Identität, also
liegen **alle** Daten im Browser. Der Server bleibt vollständig zustandslos.

## Gesamtarchitektur

```
Browser (sitzmix.ch)
┌─────────────────────────────────────────────┐
│  React SPA                                    │
│   UI ── Store (In-Memory) ── seatingAlgorithm │
│              │                                │
│              ▼                                │
│        IndexedDB  (Snapshot + Bild-Blobs)     │
│              ▲                                │
│         JSON Import/Export (Datei)            │
└─────────────────────────────────────────────┘
        ▲ lädt nur statische Dateien
┌───────┴───────┐
│ Nginx (Docker)│  ← liefert HTML/JS/CSS, speichert NICHTS
└───────────────┘
```

Der Server liefert ausschliesslich die statischen App-Dateien aus. Keine API,
keine Datenbank, keine Uploads. Aller State und der gesamte Generator-Lauf
passieren im Browser. Die Datenschutz-Vorgabe ist damit **baulich** erfüllt: Es
existiert kein Pfad, über den personenbezogene Daten den Server erreichen können.

## Datenmodell im Browser

Ein einziges Snapshot-Objekt, persistiert in IndexedDB. **Feldnamen bleiben in
`snake_case`** — identisch zu dem, was die bestehenden Komponenten, der Algorithmus
und das Export-Format heute schon verwenden. Das minimiert den Umbau (Komponenten
behalten ihre Feldzugriffe; nur die Datenquelle wechselt) und folgt dem
bestehenden Muster.

```js
{
  schemaVersion: 2,
  classes: [
    {
      id,            // crypto.randomUUID()
      name,
      students: [{ id, name, color }],
      rules:    [{ id, student_a_id, student_b_id }]
    }
  ],
  rooms: [
    {
      id, name, image_width, image_height,
      floorplan_image_path,  // = imageId des Blobs im images-Store, oder null
      areas: [{ id, name, color, sort_order, x_pos, y_pos, width_pct, height_pct }],
      seats: [{ id, seat_number, x_position, y_position, area_id /* | null */ }]
    }
  ]
}
```

- **IDs:** `crypto.randomUUID()` statt DB-Autoincrement — kollisionsfrei, auch beim Import.
- `floorplan_image_path` heisst aus Kompatibilitätsgründen weiterhin so, enthält
  aber neu die `imageId` des Blobs (keine Server-URL mehr). Komponenten beziehen
  die Anzeige-URL über einen Helper `getImageUrl(imageId)` (Object-URL).
- **IndexedDB:** Datenbank `sitzmix` mit zwei Object-Stores:
  - `app` — Key `"snapshot"` → das gesamte Objekt oben.
  - `images` — Key `imageId` → `Blob` (Grundriss-Bild).
- **Cascade-Logik** in den Store-Funktionen:
  - Klasse löschen → zugehörige Students + Rules entfernen.
  - Zimmer löschen → zugehörige Seats + Areas entfernen, Bild-Blob aus `images` löschen.
  - Schüler löschen → Rules entfernen, die ihn referenzieren.
  - Area löschen → `areaId` der betroffenen Seats auf `null`.
- **Feldnamen:** Der Store hält die Geometriefelder so, wie der Algorithmus sie
  konsumiert (`xPosition`, `yPosition`, `areaId`, `seatNumber` etc.). Der
  Algorithmus wird einmalig an die finale Namenskonvention angepasst (contained change).

## Code-Umbau

### Entfällt vollständig
- Verzeichnisse `backend/` und `database/`.
- MariaDB-Container und zugehörige Volumes.
- Dependencies: `sequelize`, `mariadb`, `mysql2`, `multer`, `image-size`, `cors`,
  `dotenv`, `express` (Backend) und `axios` (Frontend).
- Vite `/api`-Proxy.

### Wandert ins Frontend
- `backend/services/seatingAlgorithm.js` → `frontend/src/lib/seatingAlgorithm.js`.
  Bleibt reine Funktion; nur Feldnamen an die Store-Konvention angleichen.

### Neu im Frontend (`src/lib/`)
- `db.js` — IndexedDB-Wrapper: `openDb`, `getSnapshot`, `saveSnapshot`,
  `putImage`, `getImage`, `deleteImage`, `requestPersistentStorage`.
- `store.js` — In-Memory-State + CRUD-Operationen + Auto-Persist nach jeder
  Mutation. Bereitgestellt über React-Context + Hook (`useStore`). Kein zusätzliches
  State-Management-Lib nötig.
- `exportImport.js` — Serialisierung nach JSON (v2, Bilder Base64-inline) und
  Parsing/Validierung beim Import (liest v1 und v2).

### Umzubauende Komponenten
Alle Komponenten, die heute `api.get/post/put/delete(...)` aufrufen, greifen neu
auf den Store statt aufs Netz zu:
- `components/classes/ClassListPage.jsx`, `ClassEditPage.jsx`
- `components/rooms/RoomListPage.jsx`, `RoomEditPage.jsx`, `SeatPlacer.jsx`
- `components/generator/GeneratorPage.jsx`
- `components/settings/ExportModal.jsx`, `ImportModal.jsx`
- `api/client.js` (axios-Instanz) wird entfernt.

## Bild-Handling

- **Upload** schreibt die gewählte Datei direkt als Blob in den `images`-Store;
  das Zimmer erhält die `imageId`. Kein Netzwerk-Upload.
- **Anzeige** über `URL.createObjectURL(blob)` (Object-URLs nach Gebrauch
  mit `revokeObjectURL` freigeben).
- **Bildgrösse** ermittelt der Browser über `naturalWidth`/`naturalHeight` eines
  geladenen `Image`-Objekts (ersetzt `image-size`).
- **PNG-Export** des fertigen Sitzplans bleibt unverändert (`html-to-image`).

## Import / Export

- **Export v2:** gleiches Grundformat wie heute (`type: "sitzmix-export"`),
  `version: 2`. Grundriss-Bilder werden als Base64 **inline** mitgeschrieben →
  eine Datei enthält alles und ist vollständig portabel.
- **Import** akzeptiert sowohl v1 (ohne Bilder) als auch v2 (mit Base64-Bildern)
  und validiert das Format. Beim Import werden neue UUIDs vergeben; bei
  Namenskonflikten Suffix `(Import)` wie heute.
- Dient als **Backup/Restore-Mechanismus** für die Nutzer (Datenverlust-Schutz,
  Geräte-/Browserwechsel von Hand).

## Persistenz-Schutz & UX

- Beim ersten Start `navigator.storage.persist()` anfordern (schützt vor
  automatischer Verdrängung bei Speicherdruck).
- Dezenter, dauerhaft erreichbarer Hinweis: „Deine Daten liegen nur in diesem
  Browser — exportiere sie regelmässig als Sicherung."
- **Beispieldaten** beim allerersten Start (leere IndexedDB): die heutige
  Seed-Klasse + Default-Zimmer inkl. gebündeltem Default-Grundriss-Bild
  (als statisches Asset ausgeliefert, beim Seeding in IndexedDB geschrieben).
  Plus „Alles zurücksetzen"-Funktion.

## Deployment

- **Dockerfile:** Multi-Stage — Stage 1 `vite build`, Stage 2 Nginx, das das
  `dist/`-Verzeichnis ausliefert (SPA-Fallback auf `index.html`).
- **docker-compose.yml:** ein einziger Service (Nginx). Kein DB-Container, keine
  Daten-Volumes, keine Umgebungsvariablen für DB.
- **setup.sh:** ein Skript, das nach dem Kopieren des Projekts auf den Server
  alles Nötige übernimmt — Docker/Compose-Verfügbarkeit prüfen, Image bauen und
  Container hochfahren (`docker compose up -d --build`), Port/URL-Hinweis ausgeben.
  Idempotent ausführbar (erneuter Aufruf aktualisiert die laufende Instanz).
- Deploybar auf sitzmix.ch.

## Testing

- **Unit-Tests** für reine Funktionen: `seatingAlgorithm`, `exportImport`
  (Serialisierung/Parsing, v1- und v2-Pfade), Store-Mutationen inkl. Cascade-Logik.
- **Integrationstests** für die IndexedDB-Schicht mittels `fake-indexeddb`.
- Manuelle Verifikation der Hauptflüsse (Klasse anlegen → Zimmer mit Grundriss →
  Sitzplan generieren → PNG-Export → JSON-Export/Import).

## Fehlerbehandlung

- IndexedDB nicht verfügbar (privater Modus / Quota): klare Nutzermeldung, App
  bleibt nutzbar (nur ohne Persistenz).
- Persistent-Storage verweigert: Hinweis, kein harter Fehler.
- Import ungültiger/inkompatibler Dateien: Validierung mit verständlicher Meldung,
  kein Überschreiben bestehender Daten ohne Bestätigung.

## Bewusst nicht im Scope (YAGNI)

- **Keine Migration** von Bestandsdaten — die heutige DB-Version existiert nur
  lokal beim Betreiber, es gibt keine produktiven Nutzerdaten.
- Kein Geräte-Sync, kein Login, keine serverseitige Speicherung.
- Keine File-System-Access-API-Autospeicherung (Persistent Storage genügt).
