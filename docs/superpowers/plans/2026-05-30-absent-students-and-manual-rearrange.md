# Abwesende & manuelles Umordnen — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Auf der Ergebnis-Ansicht der GeneratorPage Lernende als abwesend markieren (Liste + Platz frei) und Plätze per Drag & Drop tauschen/verschieben.

**Architecture:** Reine Plan-Logik in `lib/seatingPlan.js` (getestet), kleine `AbsentList`-Komponente, DnD-Handler + State in `GeneratorPage`. `store.generate` erhält optionales `absentIds`. Alles ephemer.

**Tech Stack:** React 19, HTML5 Drag & Drop, Vitest.

---

## Task 1: Reine Plan-Logik `seatingPlan.js`

**Files:**
- Create: `frontend/src/lib/seatingPlan.js`
- Create: `frontend/src/lib/seatingPlan.test.js`

- [ ] **Step 1: Implementieren**

Create `frontend/src/lib/seatingPlan.js`:
```js
// Reine Helfer für die ephemere Plan-Bearbeitung. Mutieren nie in place.

export function swapOrMove(seats, fromIdx, toIdx) {
  if (fromIdx === toIdx) return seats;
  const next = seats.map(s => ({ ...s }));
  const tmp = next[toIdx].student;
  next[toIdx].student = next[fromIdx].student; // Ziel besetzt → Tausch, leer → Move
  next[fromIdx].student = tmp;
  return next;
}

export function markAbsent(seats, idx) {
  const student = seats[idx].student;
  if (!student) return { seats, student: null };
  const next = seats.map(s => ({ ...s }));
  next[idx].student = null;
  return { seats: next, student };
}

export function placeStudent(seats, student, toIdx) {
  if (seats[toIdx].student) return { seats, placed: false };
  const next = seats.map(s => ({ ...s }));
  next[toIdx].student = student;
  return { seats: next, placed: true };
}

export function nextFreeSeatIndex(seats) {
  let bestIdx = -1, bestNum = Infinity;
  seats.forEach((s, i) => {
    if (!s.student && s.seatNumber < bestNum) { bestNum = s.seatNumber; bestIdx = i; }
  });
  return bestIdx;
}
```

- [ ] **Step 2: Tests**

Create `frontend/src/lib/seatingPlan.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { swapOrMove, markAbsent, placeStudent, nextFreeSeatIndex } from './seatingPlan';

const A = { id: 'a', name: 'Anna' };
const B = { id: 'b', name: 'Ben' };
const make = () => [
  { seatNumber: 1, student: A },
  { seatNumber: 2, student: null },
  { seatNumber: 3, student: B },
];

describe('seatingPlan', () => {
  it('moves a student to an empty seat', () => {
    const r = swapOrMove(make(), 0, 1);
    expect(r[0].student).toBeNull();
    expect(r[1].student).toBe(A);
  });

  it('swaps two occupied seats', () => {
    const r = swapOrMove(make(), 0, 2);
    expect(r[0].student).toBe(B);
    expect(r[2].student).toBe(A);
  });

  it('does not mutate the input', () => {
    const seats = make();
    swapOrMove(seats, 0, 1);
    expect(seats[0].student).toBe(A);
  });

  it('marks a seat absent and returns the student', () => {
    const { seats, student } = markAbsent(make(), 0);
    expect(student).toBe(A);
    expect(seats[0].student).toBeNull();
  });

  it('places a student on a free seat only', () => {
    const free = placeStudent(make(), B, 1);
    expect(free.placed).toBe(true);
    expect(free.seats[1].student).toBe(B);
    const occupied = placeStudent(make(), B, 0);
    expect(occupied.placed).toBe(false);
  });

  it('finds the next free seat by seatNumber', () => {
    expect(nextFreeSeatIndex(make())).toBe(1);
    const full = [{ seatNumber: 1, student: A }];
    expect(nextFreeSeatIndex(full)).toBe(-1);
  });
});
```

- [ ] **Step 3: Test laufen lassen**

Run: `cd frontend && npm test -- seatingPlan`
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/seatingPlan.js frontend/src/lib/seatingPlan.test.js
git commit -m "feat: add pure seating-plan edit helpers (swap/move/absent)"
```

---

## Task 2: `store.generate` mit `absentIds`

**Files:**
- Modify: `frontend/src/lib/store.js`
- Modify: `frontend/src/lib/store.test.js`

- [ ] **Step 1: generate anpassen**

In `frontend/src/lib/store.js`, `generate`-Signatur und Schüler-Auswahl ändern:
```js
export function generate({ classId, roomId, fillMode, personsPerArea, absentIds }) {
  const c = state.classes.find(x => x.id === classId);
  const r = state.rooms.find(x => x.id === roomId);
  if (!c) throw new Error('Klasse nicht gefunden');
  if (!r) throw new Error('Zimmer nicht gefunden');
  if (r.seats.length === 0) throw new Error('Das Zimmer hat noch keine Sitzplätze');
  const absent = new Set(absentIds || []);
  const present = c.students.filter(s => !absent.has(s.id));
  if (present.length > r.seats.length) {
    throw new Error(`Zu wenig Plätze: ${present.length} Lernende, aber nur ${r.seats.length} Plätze`);
  }
  const result = generateSeatingPlan(
    [...present].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [...r.seats].sort((a, b) => a.seat_number - b.seat_number),
    c.rules,
    { areas: [...r.areas].sort((a, b) => a.sort_order - b.sort_order), fillMode: fillMode || 'sequential', personsPerArea: parseInt(personsPerArea) || 0 }
  );
  return {
    ...result,
    room: { id: r.id, name: r.name, floorplan_image_path: r.floorplan_image_path, image_width: r.image_width, image_height: r.image_height },
    areas: [...r.areas].sort((a, b) => a.sort_order - b.sort_order),
  };
}
```
(Nur die Zeilen rund um `present`/`absent` sind neu; Rest unverändert. Die Regeln
bleiben unverändert übergeben — verbotene Paare, bei denen eine Person abwesend ist,
greifen schlicht nicht, da die Person nicht platziert wird.)

- [ ] **Step 2: Test ergänzen**

Im `describe('room store', ...)`-Block von `frontend/src/lib/store.test.js` ergänzen:
```js
  it('excludes absent students from generation', async () => {
    const c = await store.createClass({ name: '3a' });
    const a = await store.addStudent(c.id, { name: 'Anna' });
    await store.addStudent(c.id, { name: 'Ben' });
    const r = await store.createRoom({ name: 'Zi 1' });
    await store.saveSeats(r.id, [
      { seat_number: 1, x_position: 5, y_position: 5, area_id: null },
      { seat_number: 2, x_position: 9, y_position: 9, area_id: null },
    ]);
    const res = store.generate({ classId: c.id, roomId: r.id, absentIds: [a.id] });
    const placed = res.assignments.filter(x => x.student);
    expect(placed).toHaveLength(1);
    expect(placed[0].student.name).toBe('Ben');
  });
```

- [ ] **Step 3: Test laufen lassen**

Run: `cd frontend && npm test -- store`
Expected: 9 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/store.js frontend/src/lib/store.test.js
git commit -m "feat: support absentIds in store.generate"
```

---

## Task 3: `AbsentList`-Komponente

**Files:**
- Create: `frontend/src/components/generator/AbsentList.jsx`

- [ ] **Step 1: Komponente**

Create `frontend/src/components/generator/AbsentList.jsx`:
```js
export default function AbsentList({ absent, onReturn }) {
  if (absent.length === 0) return null;
  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-bold text-gray-900 mb-1">Abwesend ({absent.length})</h3>
      <p className="text-xs text-gray-500 mb-3">
        Klick holt die Person auf den nächsten freien Platz — oder ziehe sie per Drag auf einen freien Platz.
      </p>
      <div className="flex flex-wrap gap-2">
        {absent.map(s => (
          <button
            key={s.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/absent-id', s.id)}
            onClick={() => onReturn(s.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition-colors text-sm cursor-pointer"
            title="Wieder anwesend (klicken) oder auf freien Platz ziehen"
          >
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-medium text-gray-800">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/AbsentList.jsx
git commit -m "feat: add AbsentList component"
```

---

## Task 4: GeneratorPage — State, DnD, Badges, Buttons, Export-Filter

**Files:**
- Modify: `frontend/src/components/generator/GeneratorPage.jsx`

- [ ] **Step 1: Imports + State**

Oben ergänzen:
```js
import AbsentList from './AbsentList';
import { swapOrMove, markAbsent, placeStudent, nextFreeSeatIndex } from '../../lib/seatingPlan';
```
Neue States neben den bestehenden:
```js
const [seats, setSeats] = useState([]);     // bearbeitbare Kopie von result.assignments
const [absent, setAbsent] = useState([]);
```

- [ ] **Step 2: seats/absent synchron zu result halten**

Direkt nach `setResult(res)` in `handleGenerate` (regulärer Pfad) — also den Generate-
Block so erweitern, dass nach erfolgreichem `generate` gilt:
```js
const res = generate(payload);
setResult(res);
setSeats(res.assignments.map(a => ({ ...a })));
// absent NUR beim regulären Mischen leeren (siehe Step 4)
```
Und in `handleClassChange`/`handleRoomChange` zusätzlich zu `setResult(null)`:
```js
setSeats([]); setAbsent([]);
```

- [ ] **Step 3: Bearbeitungs-Operationen**

Funktionen in der Komponente ergänzen:
```js
const dragIndexRef = useRef(null);

const handleMarkAbsent = (idx) => {
  const { seats: next, student } = markAbsent(seats, idx);
  if (!student) return;
  setSeats(next);
  setAbsent(prev => [...prev, student]);
};

const handleSeatDrop = (toIdx) => {
  const fromIdx = dragIndexRef.current;
  dragIndexRef.current = null;
  if (fromIdx == null || fromIdx === toIdx) return;
  setSeats(prev => swapOrMove(prev, fromIdx, toIdx));
};

const handleAbsentDropOnSeat = (toIdx, studentId) => {
  const student = absent.find(s => s.id === studentId);
  if (!student) return;
  const { seats: next, placed } = placeStudent(seats, student, toIdx);
  if (!placed) return; // besetzter Platz → ignorieren
  setSeats(next);
  setAbsent(prev => prev.filter(s => s.id !== studentId));
};

const handleReturnAbsent = (studentId) => {
  const idx = nextFreeSeatIndex(seats);
  if (idx === -1) { showToast('Kein freier Platz vorhanden', 'warning'); return; }
  handleAbsentDropOnSeat(idx, studentId);
};

const reshuffleWithoutAbsent = () => {
  try {
    const payload = { classId: selectedClass, roomId: selectedRoom, absentIds: absent.map(s => s.id) };
    if (selectedRoomHasAreas && fillMode === 'per_area') { payload.fillMode = 'per_area'; payload.personsPerArea = personsPerArea; }
    const res = generate(payload);
    setResult(res);
    setSeats(res.assignments.map(a => ({ ...a })));
    // absent bleibt erhalten
    if (res.warning) showToast(res.warning, 'warning');
  } catch (e) { showToast(e.message || 'Fehler beim Generieren', 'error'); }
};
```

- [ ] **Step 4: Regulären Generate-Button absent leeren lassen**

In `handleGenerate` nach `setSeats(...)` ergänzen: `setAbsent([]);` (regulär = alle wieder anwesend).

- [ ] **Step 5: Rendering auf `seats` umstellen + DnD/Badge**

In `renderSeatingPlan(sizeVariant)`: Quelle der Marker von `result.assignments` auf
`seats` umstellen, aber nur im `'normal'`-Modus interaktiv machen. Ersetze die
`result.assignments.map(...)`-Schleife durch:
```js
{(sizeVariant === 'large' ? result.assignments : seats).map((a, i) => {
  const interactive = sizeVariant === 'normal';
  return (
  <div
    key={a.seatId ?? i}
    className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
    style={{ left: `${a.xPosition}%`, top: `${a.yPosition}%` }}
    {...(interactive ? {
      draggable: !!a.student,
      onDragStart: () => { dragIndexRef.current = i; },
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault();
        const absentId = e.dataTransfer.getData('text/absent-id');
        if (absentId) handleAbsentDropOnSeat(i, absentId);
        else handleSeatDrop(i);
      },
    } : {})}
  >
    {a.student ? (
      <>
        {interactive && (
          <button
            className="export-hide absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Als abwesend markieren"
            onClick={(e) => { e.stopPropagation(); handleMarkAbsent(i); }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <div className={`${circleClass} rounded-full flex items-center justify-center font-bold text-gray-800 shadow-md border-2 border-white`} style={{ backgroundColor: a.student.color }}>
          {a.seatNumber}
        </div>
        <span className={`mt-0.5 ${textClass} font-semibold text-gray-800 bg-white/95 px-1.5 py-0.5 rounded shadow-sm text-center leading-tight overflow-visible`}>
          {a.student.name.includes(' ')
            ? <><span className="whitespace-nowrap">{a.student.name.split(' ')[0]}</span><br /><span className="font-normal whitespace-nowrap">{a.student.name.split(' ').slice(1).join(' ')}</span></>
            : a.student.name}
        </span>
      </>
    ) : (
      <div className={`${emptyCircleClass} rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-500 border-2 border-white shadow-sm`}>
        {a.seatNumber}
      </div>
    )}
  </div>
  );
})}
```
Damit das ×-Badge nur bei Hover über den jeweiligen Marker erscheint, die Klasse
`group` an das Marker-Wrapper-`div` ergänzen (im `className` oben: `... items-center group ...`).

- [ ] **Step 6: „Neu mischen (nur Anwesende)"-Button**

Im Button-Bereich (neben „Als PNG herunterladen", innerhalb `{result && (...)}`):
```js
{absent.length > 0 && (
  <button
    onClick={reshuffleWithoutAbsent}
    className="bg-lime-100 hover:bg-lime-200 text-lime-800 font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
  >
    Neu mischen (nur Anwesende)
  </button>
)}
```

- [ ] **Step 7: AbsentList unter dem Plan rendern**

Direkt nach dem schliessenden `</div>` des Ergebnis-Containers (innerhalb `{result && result.room && (...)}`, aber AUSSERHALB von `planRef`):
```js
<AbsentList absent={absent} onReturn={handleReturnAbsent} />
```

- [ ] **Step 8: PNG-Export filtert Steuerungen**

In `downloadPng`, im `toPng(planRef.current, { ... })`-Options-Objekt ergänzen:
```js
filter: (node) => !(node.classList && node.classList.contains('export-hide')),
```

- [ ] **Step 9: Build + Tests**

Run: `cd frontend && npm run build && npm test`
Expected: Build erfolgreich, alle Tests grün.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/generator/GeneratorPage.jsx
git commit -m "feat: absent marking + drag-and-drop seat rearrange in generator"
```

---

## Task 5: Browser-Verifikation

- [ ] **Step 1:** Dev-Server starten (preview), Klasse + Zimmer wählen, generieren.
- [ ] **Step 2:** Per × eine Person abwesend markieren → Platz leer, erscheint in „Abwesend"-Liste.
- [ ] **Step 3:** Drag: besetzten Marker auf leeren Platz (Move) und auf besetzten (Swap) ziehen.
- [ ] **Step 4:** Abwesende per Klick zurückholen (nächster freier Platz) und per Drag auf freien Platz.
- [ ] **Step 5:** „Neu mischen (nur Anwesende)" → Abwesende bleiben aussen vor.
- [ ] **Step 6:** PNG-Export prüfen: keine ×-Badges im Bild.

## Self-Review (durchgeführt)

- **Spec-Abdeckung:** abwesend markieren + Liste (T3/T4), Platz frei + manuell (T1/T4),
  Drag-Swap/Move (T1/T4), zurückholen Klick+Drag (T4), „nur Anwesende" mischen (T2/T4),
  Export-Filter (T4), ephemer/Reset bei Wechsel (T4), Tests (T1/T2).
- **Platzhalter:** keine.
- **Typkonsistenz:** `seats`-Elemente haben `seatId/seatNumber/xPosition/yPosition/areaId/student`
  (= `result.assignments`-Shape aus `formatSeat`); Helfer und Rendering nutzen dieselben Felder.
  Abwesende identifiziert über `student.id`; Drag-Transfer-Key `text/absent-id`.
