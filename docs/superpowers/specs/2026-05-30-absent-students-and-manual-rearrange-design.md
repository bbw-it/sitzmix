# Abwesende markieren & Plätze manuell tauschen

**Datum:** 2026-05-30
**Status:** Design freigegeben, bereit für Implementierungsplan

## Ziel

Nach dem Generieren eines Sitzplans soll die Lehrperson auf der Ergebnis-Ansicht:

1. einzelne Lernende als **abwesend** markieren (Platz wird frei, Person erscheint in
   einer sichtbaren Liste), und
2. die verbleibenden Lernenden **manuell per Drag & Drop** zwischen Plätzen
   umordnen (z.B. jemanden, der nun allein am Tisch sitzt, an einen anderen Tisch).

Alles ist **ephemer** — wie der generierte Plan heute schon. Ein Reload oder ein
„Neu mischen" verwirft den Zustand; nichts wird in IndexedDB persistiert.

## Geltungsbereich

- Nur die Ergebnis-Ansicht der `GeneratorPage`. Klassen-/Zimmerdaten bleiben
  unverändert.
- Die Vollbild-Lightbox bleibt **reine Ansicht** und spiegelt den aktuellen Stand.

## Zustand (lokal in GeneratorPage)

- `seats` — bearbeitbare Kopie von `result.assignments`
  (`[{ seatId, seatNumber, xPosition, yPosition, areaId, student|null }]`).
  Wird bei jedem Generieren frisch aus `result.assignments` gesetzt.
- `absent` — Array der aktuell abwesenden Lernenden (`{ id, name, color }`).

Klassen- oder Zimmerwechsel (`handleClassChange`/`handleRoomChange`) setzt `result`,
`seats` und `absent` zurück.

## Abwesend markieren

- Beim Hovern über einen besetzten Marker erscheint ein kleines „abwesend"-Icon
  (×-Badge, oben rechts am Marker). Klick darauf:
  - entfernt die/den Lernende:n vom Platz (`student` → `null`),
  - fügt sie/ihn der `absent`-Liste hinzu.
- Die **Abwesenden-Liste** (`AbsentList`) sitzt sichtbar unter dem Plan, ausserhalb
  des Export-Bereichs (`planRef`). Zeigt Farbpunkt + Name je Eintrag.
- Button **„Neu mischen (nur Anwesende)"** erscheint, sobald ≥1 Person abwesend ist.
  Er generiert neu und lässt die Abwesenden aus (Plätze bleiben ggf. leer); die
  `absent`-Liste bleibt erhalten.
- Der reguläre Button („Sitzplan generieren" / „Neu mischen") verteilt wieder **alle**
  Lernenden und leert die `absent`-Liste.

## Verschieben (Drag & Drop)

Umsetzung mit der HTML5-Drag-&-Drop-API (Plätze sind fixe Positionen).

- **Besetzter Marker → anderer Platz:**
  - Zielplatz besetzt → die beiden Lernenden **tauschen**.
  - Zielplatz leer → Lernende:r wird **verschoben** (Quellplatz wird leer).
- **Abwesende-Liste → Plan:**
  - Eintrag per Drag auf einen **freien** Platz ziehen → wird dort platziert, aus
    `absent` entfernt. Drop auf besetzten Platz wird ignoriert.
  - Alternativ **Klick** auf einen Abwesenden-Eintrag („wieder anwesend") → springt
    auf den nächsten freien Platz (nach `seatNumber`). Kein freier Platz → Toast-Hinweis.

## Code-Schnitt

### Neu: `frontend/src/lib/seatingPlan.js` (reine, getestete Funktionen)

- `swapOrMove(seats, fromIdx, toIdx)` → neues `seats`-Array; tauscht bei besetztem
  Ziel, verschiebt bei leerem Ziel.
- `markAbsent(seats, idx)` → `{ seats, student }`; leert den Platz und gibt die
  entfernte Person zurück.
- `placeStudent(seats, student, toIdx)` → platziert `student` auf `toIdx`, sofern leer;
  sonst unverändert (gibt Flag `placed` zurück).
- `nextFreeSeatIndex(seats)` → Index des nächsten freien Platzes (nach `seatNumber`
  sortiert) oder `-1`.

Diese Funktionen mutieren nicht in place, sondern liefern neue Arrays/Objekte.

### Neu: `frontend/src/components/generator/AbsentList.jsx`

Kleine Komponente: rendert die Abwesenden mit Farbpunkt/Name, Klick-Handler
(„wieder anwesend") und Drag-Quelle (`dataTransfer` mit Student-Id). Bekommt
`absent` und Callbacks als Props.

### Geändert: `frontend/src/components/generator/GeneratorPage.jsx`

- Hält `seats`/`absent`-State + DnD-Handler, nutzt `seatingPlan`-Helfer.
- `renderSeatingPlan('normal')` rendert Marker mit `draggable`, `onDragStart`,
  `onDragOver`, `onDrop` sowie dem ×-Badge (Klasse `export-hide`). Empty-Marker sind
  ebenfalls Drop-Ziele.
- `renderSeatingPlan('large')` (Lightbox) bleibt statisch ohne Handler/Badges.
- `downloadPng` erhält die Option `filter: (node) => !(node.classList?.contains?.('export-hide'))`,
  damit Bearbeitungs-Steuerungen nicht im PNG landen.

### Geändert: `frontend/src/lib/store.js`

- `generate({ classId, roomId, fillMode, personsPerArea, absentIds })` — optionaler
  `absentIds` (Array/Set von Student-Ids). Anwesende = Schüler ohne Id in `absentIds`.
  Ohne `absentIds` unverändertes Verhalten.

## Fehlerbehandlung

- „Wieder anwesend" ohne freien Platz → Toast „Kein freier Platz vorhanden".
- Drop einer Abwesenden auf besetzten Platz → ignoriert (kein Fehler).
- „Neu mischen (nur Anwesende)", wenn alle abwesend → wie leere Klasse: alle Plätze leer.

## Tests

- **Unit (Vitest):** `seatingPlan.js` — `swapOrMove` (Tausch + Verschieben),
  `markAbsent`, `placeStudent` (leer/besetzt), `nextFreeSeatIndex`.
- **Unit (Vitest):** `store.generate` mit `absentIds` lässt die richtigen Schüler aus.
- **Manuell im Browser:** abwesend markieren → Liste; Drag-Tausch; zurückholen per
  Klick und per Drag; „Neu mischen (nur Anwesende)"; PNG-Export ohne Badges.

## Bewusst nicht im Scope (YAGNI)

- Keine Persistenz des bearbeiteten Plans / der Abwesenheiten über Reload hinaus.
- Kein Editieren in der Lightbox.
- Keine Touch-spezifische Tipp-Tipp-Interaktion (nur Drag & Drop + Klick-Zurückholen).
