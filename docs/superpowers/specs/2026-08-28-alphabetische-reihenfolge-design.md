# Alphabetische Reihenfolge im Sitzplan

**Datum:** 2026-08-28
**Status:** Entwurf, freigegeben

## Ziel

Lehrpersonen sollen den Sitzplan wahlweise **zufällig** (heutiges Verhalten) oder
**alphabetisch** erzeugen können. Alphabetisch heisst: Platz 1 bekommt die erste
Person der nach Namen sortierten Klasse, Platz 2 die zweite und so weiter.

Nutzen: Bei der ersten Lektion, bei Prüfungen oder beim Namenlernen ist eine
vorhersehbare Reihenfolge hilfreich.

## Entscheidungen

| Frage | Entscheid |
|---|---|
| Was bestimmt die Reihenfolge? | Die **Platznummer** (`seat_number`), aufsteigend |
| Verhältnis zu den Regeln | **Regeln gewinnen.** Verbotene Paare bleiben garantiert getrennt; das Alphabet bricht nur dort, wo es nötig ist |
| Platzierung in der UI | Eigene Zeile **Reihenfolge**: `Zufällig` \| `Alphabetisch`, kombinierbar mit beiden Belegungsregeln |
| Sichtbarkeit der Abweichung | Dezentes Badge am Plan, wenn eine Regel die Reihenfolge verschoben hat |

## Architektur

### `frontend/src/lib/seatingAlgorithm.js`

Neue Funktion `generateAlphabeticalPlan(students, seats, rules, options)`, parallel
zu `generateSequentialPlan` und `generatePerAreaPlan`. Sie nutzt dieselben Helfer
(`buildAdjacencyMap`, `buildForbiddenData`, `computeDistribution`, `formatSeat`),
ersetzt aber jedes `shuffle` durch eine feste Ordnung.

**Sortierung**

- Lernende: `name.localeCompare(other, 'de')` — Umlaute korrekt (Ärni vor Berger).
  Die Sortierung geschieht **innerhalb** des Algorithmus, damit die Funktion nicht
  von einer Vorsortierung durch den Aufrufer abhängt.
- Plätze: `seat_number` aufsteigend.

**Modus „Alle Plätze auffüllen"**

Deterministisches Backtracking: Die erste Person bekommt die kleinste Platznummer,
die regelkonform ist (nicht am selben Tisch und nicht physisch neben einem
verbotenen Partner), die zweite Person die nächste und so weiter. Ist ein Platz
blockiert, rutscht **nur diese Person** weiter — das Ergebnis ist die
lexikografisch erste gültige Belegung.

**Modus „Pro Bereich"**

Die Verteilung (wie viele Bereiche, wie viele pro Bereich) wird unverändert von
`computeDistribution` berechnet; die Bereiche werden in `sort_order` verwendet.
Die alphabetisch sortierte Liste wird in Blöcke geschnitten: Bereich 1 erhält den
ersten Block, Bereich 2 den zweiten usw. Muss ein verbotenes Paar getrennt werden,
verschiebt sich eine Person in den nächsten Bereich mit freiem Platz. Innerhalb
eines Bereichs werden die Plätze wieder nach `seat_number` vergeben, wobei die
Nachbarschaft **über Bereichsgrenzen hinweg** geprüft wird (wie heute).

**Budget und Fallback**

Dasselbe `MAX_STEPS`-Budget wie die bestehenden Modi. Wird es erschöpft, greift
die rein alphabetische Belegung ohne Regelgarantie, zusammen mit der bestehenden
Warnung `success: false` / `warning`.

**Einstieg**

`generateSeatingPlan` erhält die Option `order` (`'random'` — Vorgabe — oder
`'alphabetical'`) und leitet bei `'alphabetical'` an `generateAlphabeticalPlan`
weiter. Ohne die Option verhält sich alles exakt wie bisher.

### `frontend/src/lib/store.js`

`generate({ …, order })` reicht `order` an `generateSeatingPlan` durch. Der
bestehende Vorsortier-Aufruf bleibt unverändert.

### `frontend/src/components/generator/GeneratorPage.jsx`

- Neuer Zustand `order` (Vorgabe `'random'`).
- Neue Zeile **Reihenfolge** unter dem Klasse/Zimmer-Block, im gleichen Radio-Stil
  wie „Belegungsregel", jedoch **immer sichtbar** (auch bei Zimmern ohne Bereiche).
- `handleGenerate` schickt `order` mit.
- Der Knopf **„Neu mischen"** heisst bei `'alphabetical'` **„Neu berechnen"**, da
  das Ergebnis deterministisch ist. Er bleibt sichtbar, damit nach dem
  Abwesend-Markieren neu gerechnet werden kann.
- Badge **„Reihenfolge wegen Regeln angepasst"** neben dem Plantitel, wenn im
  Ergebnis mindestens eine Person nicht auf ihrem rein alphabetischen Platz sitzt.
  Der Algorithmus liefert dazu ein Feld `alphabeticalShifts` (Anzahl abweichender
  Personen, `0` bei perfekter Reihenfolge).

## Tests

Ergänzungen in `frontend/src/lib/seatingAlgorithm.test.js`:

1. Ohne Regeln, Modus „Alle Plätze auffüllen": Platz 1..n tragen exakt die
   alphabetisch sortierten Namen.
2. Determinismus: zwei Läufe mit gleicher Eingabe liefern identische Belegungen.
3. Umlaute: `Ärni` steht vor `Berger` und `Zöllig` vor `Zwahlen` (`de`-Locale sortiert
   `ö` wie `o`, nicht ans Alphabet-Ende).
4. Eine Regel auf zwei Nachbarplätzen: Regel eingehalten **und** höchstens die
   betroffenen Personen weichen von der reinen Reihenfolge ab.
5. Modus „Pro Bereich": Bereich 1 enthält den ersten alphabetischen Block,
   Bereich 2 den zweiten.
6. `alphabeticalShifts` ist `0` ohne Regeln und `> 0`, wenn eine Regel greift.
7. Regression: `order: 'random'` (bzw. keine Option) verhält sich unverändert.

## Nicht Teil dieser Arbeit

- Sortierung nach Nachname bei mehrteiligen Namen (die App speichert einen
  einzigen Namensstring).
- Persistenz der Auswahl über Reloads hinweg; `fillMode` wird heute ebenfalls
  nicht gespeichert.
- Änderungen am Drag-&-Drop oder am Abwesenden-Verhalten.
