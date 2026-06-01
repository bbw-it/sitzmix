# Grundriss-Skizzen-Editor

**Datum:** 2026-05-30
**Status:** Design freigegeben, bereit für Implementierungsplan

## Ziel

Lehrpersonen ohne Grundriss-Bild sollen einen einfachen Grundriss **skizzieren**
können: Wände als Rechtecke/Kreise einzeichnen, Rechtecke per Punkt-Editing zu
beliebigen Polygon-Formen (z.B. L-Form) umbauen. Bild-Upload bleibt parallel möglich
(entweder/oder). Skizzen sind als JSON speicher- und wieder ladbar; ungültiges JSON
wird sauber abgefangen.

## Entscheidungen (aus Brainstorming)

- **Editor-Umfang:** mehrere Formen (Rechteck, Kreis). Rechtecke sind Polygone →
  Punkte hinzufügen/verschieben/löschen. Kreise verschieben/grössern. Formen löschbar.
- **Bild vs. Skizze:** entweder/oder pro Zimmer (gegenseitig ausschliessend).
- **Backup:** Skizze reist im app-weiten Export mit (wie Bilder).
- **Editor:** Modal (fokussiertes Zeichnen), danach Sitze im normalen SeatPlacer.
- **Default-Canvas:** 1000×700 (Seitenverhältnis).
- Die Skizze ist **rein visuell** und beeinflusst den Sitzplan-Algorithmus nicht.

## Datenmodell

Zimmer (im Store), neues Feld `floorplan_sketch` (oder `null`), **exklusiv** zu
`floorplan_image_path`:
```js
floorplan_sketch: {
  version: 1,
  width: 1000, height: 700,           // logische Canvas-Masse = Seitenverhältnis
  shapes: [
    { id, type: 'polygon', points: [{x,y}, …] },   // Rechteck = 4-Punkt-Polygon
    { id, type: 'circle', cx, cy, r },
  ]
}
```
- Koordinaten in logischen Canvas-Einheiten (0…width / 0…height).
- `setSketch` löscht ein evtl. vorhandenes Bild (Blob) und setzt
  `image_width`/`image_height` = `width`/`height`, damit das bestehende
  %-basierte Sitz-Overlay unverändert funktioniert.
- `setFloorplan` (Bild) löscht künftig auch `floorplan_sketch`.
- `removeFloorplan` löscht beides (Bild-Blob + Skizze) und leert Sitze/Bereiche.

## Standalone-Dateiformat

Download/Upload der Skizze als Datei:
```js
{ type: 'sitzmix-floorplan', version: 1, width, height, shapes }
```
`validateSketchFile(json)` prüft: `type === 'sitzmix-floorplan'`, `version <= 1`,
`width`/`height` positive Zahlen, `shapes` ein Array gültiger Formen (Polygon mit
≥3 Punkten {x,y}; Kreis mit cx/cy/r). Liefert bei Fehler eine verständliche Meldung
(String), sonst `null`.

## Module

### `frontend/src/lib/sketch.js` (reine, getestete Funktionen)
- `defaultSketch()` → `{ version:1, width:1000, height:700, shapes:[] }`.
- `createRectangle(width, height)` → Polygon-Shape (4 Punkte, mittig, ~40% Grösse) mit `id`.
- `createCircle(width, height)` → Circle-Shape (mittig, r ~ 20% der Breite) mit `id`.
- `insertVertex(points, edgeIndex)` → neues Punkte-Array mit eingefügtem Mittelpunkt
  zwischen `edgeIndex` und `edgeIndex+1` (modulo Länge).
- `removeVertex(points, index)` → neues Array ohne den Punkt; gibt das **unveränderte**
  Array zurück, wenn dadurch < 3 Punkte blieben.
- `moveVertex(points, index, x, y)` → neues Array mit verschobenem Punkt.
- `validateSketchFile(json)` → `string | null` (siehe oben).
- `toFileFormat(sketch)` → `{ type:'sitzmix-floorplan', version, width, height, shapes }`.
- IDs via `crypto.randomUUID()`. Funktionen mutieren nicht in place.

### `frontend/src/components/rooms/FloorplanSketch.jsx` (read-only Renderer)
Props: `sketch`. Rendert ein `<svg viewBox="0 0 width height">` mit
`preserveAspectRatio="none"`-freiem Standard (Formen skalieren mit der Box).
Wände: dunkle Linie (`#475569`, ~2–3px relativ), helle Füllung (`#e5e7eb`).
Wird vom SeatPlacer (Hintergrund) und der Generator-Ergebnis-Ansicht benutzt.
Bekommt optional `className` (für `floorplan-img`-Klick-Target im SeatPlacer).

### `frontend/src/components/rooms/SketchEditor.jsx` (Modal)
State: lokale `shapes`-Liste (Kopie der Zimmer-Skizze oder leer), `selectedId`,
`selectedVertex`, aktuelles Tool/Interaktion. Toolbar:
**„Rechteck"**, **„Kreis"** (fügt Default-Form ein), **„Als JSON speichern"** (Download),
**„Abbrechen"**, **„Fertig"** (→ `onSave(sketch)`).
Interaktion (HTML5-Pointer, analog SeatPlacer, Snap-to-Grid):
- Form am Körper ziehen = verschieben.
- Polygon: Eckpunkte als Griffe ziehen; an jeder Kantenmitte ein hohler „+"-Griff →
  Klick fügt dort einen Eckpunkt ein; ausgewählter Punkt + Delete entfernt ihn (min. 3).
- Kreis: Mitte ziehen = verschieben, Radius-Griff = grössern.
- Ausgewählte Form + Delete = Form löschen (auch Lösch-Button).

## Integration

### RoomEditPage
Grundriss-Bereich, Buttons:
- **„Bild auswählen…"** — Datei-Picker akzeptiert `image/png,image/jpeg,application/json,.json`.
  - JSON erkannt (Typ/Endung) → Text lesen → `validateSketchFile` → gültig:
    `store.setSketch(roomId, {version,width,height,shapes})`; ungültig: Toast
    „Ungültige Grundriss-Datei: <Meldung>".
  - Bild → `store.setFloorplan` wie bisher.
- **„Grundriss skizzieren"** — öffnet SketchEditor mit leerer/Default-Skizze.
- Wenn Skizze vorhanden: **„Skizze bearbeiten"** (Modal mit aktueller Skizze),
  **„Als JSON speichern"** (Download via `toFileFormat`), **„Entfernen"**.
- SeatPlacer bekommt neu optional `sketch` und rendert dann `FloorplanSketch` als
  Hintergrund statt `<img>`; Sitz-/Bereichs-Overlay unverändert.

### GeneratorPage
`renderSeatingPlan`: wenn `result.room.floorplan_sketch` vorhanden → `FloorplanSketch`
statt `<img>` rendern (für normale Ansicht, Lightbox und PNG-Export). Object-URL-Logik
nur noch fürs Bild.

### Store
- `setSketch(roomId, sketch)` — löscht Bild-Blob, setzt `floorplan_sketch`,
  `image_width/height`; gibt `getRoom` zurück.
- `setFloorplan` — zusätzlich `floorplan_sketch = null`.
- `removeFloorplan` — löscht beide Quellen + Sitze/Bereiche.
- `getRoom`, `listRooms`, `generate` geben `floorplan_sketch` mit aus.
- `createRoom` initialisiert `floorplan_sketch: null`.

### Export / Import
- `buildExport`: pro Zimmer `floorplan_sketch` (oder null) ergänzen.
- `applyImport`: nach `createRoom`/`saveAreas`/`saveSeats` — falls
  `room.floorplan_sketch` vorhanden → `store.setSketch(...)`; sonst falls `room.image`
  → `setFloorplan` (wie bisher). Export-Version bleibt 2 (additives Feld).

## Fehlerbehandlung

- Ungültiges/uninterpretierbares JSON → Toast mit Grund, keine Änderung am Zimmer.
- JSON ohne erkennbaren Typ → „Ungültige Grundriss-Datei".
- Editor: Polygon nie unter 3 Punkte; Default-Formen bleiben im Canvas (Clamping 0…width/height).

## Tests

- **Unit (Vitest):** `lib/sketch.js` — `insertVertex`/`removeVertex`/`moveVertex`
  (inkl. Min-3-Punkte), `createRectangle`/`createCircle`, `validateSketchFile`
  (gültig, falscher Typ, zu hohe Version, kaputte Shapes), `toFileFormat`.
- **Unit (Vitest):** `store.setSketch` (löscht Bildreferenz, setzt Masse, exklusiv),
  Export/Import einer Skizze (Round-Trip).
- **Manuell im Browser:** Rechteck → Punkt einfügen → L-Form; Kreis; „Als JSON
  speichern" und wieder laden; ungültiges JSON → Fehlermeldung; Sitze über Skizze
  platzieren; Generator zeigt Skizze; Wechsel Bild↔Skizze ersetzt sauber.

## Bewusst nicht im Scope (YAGNI)

- Keine freien Linien/offenen Pfade, keine Bézierkurven, keine Texte/Möbel-Icons.
- Keine Skizze gleichzeitig mit Bild (nur entweder/oder).
- Keine per-Form-Farbwahl (einheitlicher Wand-Stil).
- Skizze hat keinen Einfluss auf den Sitzplan-Algorithmus.
