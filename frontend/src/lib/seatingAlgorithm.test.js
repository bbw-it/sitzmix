import { describe, it, expect } from 'vitest';
import { generateSeatingPlan, buildAdjacencyMap } from './seatingAlgorithm';

const seats = [
  { id: 's1', seat_number: 1, x_position: 10, y_position: 10, area_id: 'a1' },
  { id: 's2', seat_number: 2, x_position: 90, y_position: 10, area_id: 'a2' },
];
const students = [
  { id: 'st1', name: 'A', color: '#fff' },
  { id: 'st2', name: 'B', color: '#000' },
];

describe('generateSeatingPlan', () => {
  it('assigns every student to a seat (sequential)', () => {
    const res = generateSeatingPlan(students, seats, [], { fillMode: 'sequential' });
    expect(res.success).toBe(true);
    const assigned = res.assignments.filter(a => a.student);
    expect(assigned).toHaveLength(2);
  });

  it('keeps a forbidden pair in different areas (per_area)', () => {
    const areas = [
      { id: 'a1', x_pos: 0, y_pos: 0, width_pct: 20, height_pct: 20, sort_order: 0 },
      { id: 'a2', x_pos: 80, y_pos: 0, width_pct: 20, height_pct: 20, sort_order: 1 },
    ];
    const rules = [{ student_a_id: 'st1', student_b_id: 'st2' }];
    const res = generateSeatingPlan(students, seats, rules, { areas, fillMode: 'per_area', personsPerArea: 1 });
    const seatOf = (name) => res.assignments.find(a => a.student?.name === name);
    expect(seatOf('A').areaId).not.toBe(seatOf('B').areaId);
  });

  it('returns all seats empty when there are no students', () => {
    const res = generateSeatingPlan([], seats, []);
    expect(res.success).toBe(true);
    expect(res.assignments.every(a => !a.student)).toBe(true);
  });
});

// ── Zufälligkeit & Regel-Garantien ─────────────────────────────
// Hintergrund: Die frühere Abstands-MAXIMIERUNG drängte alle regelbeteiligten
// Lernenden an die Ecktische — Lernende aus VERSCHIEDENEN Regeln sassen dadurch
// +19% überzufällig oft am selben Tisch (gemessen: P=0.156 statt 3/23=0.130).
// Gewolltes Verhalten: harte Garantien (nie gleicher Tisch, nie direkt daneben),
// darüber hinaus rein zufällig.
describe('randomness with rules (per_area)', () => {
  // Seed-Zimmer: 6 Tische à 4 Plätze, 24 Lernende
  const AREAS = [
    ['a0',6,10],['a1',30,10],['a2',52,10],['a3',6,44],['a4',30,44],['a5',52,44],
  ].map(([id,x,y],i) => ({ id, sort_order: i, x_pos: x, y_pos: y, width_pct: 20, height_pct: 24 }));
  const SEATS = [
    [12,16,0],[20,16,0],[12,28,0],[20,28,0], [36,16,1],[44,16,1],[36,28,1],[44,28,1],
    [58,16,2],[66,16,2],[58,28,2],[66,28,2], [12,50,3],[20,50,3],[12,62,3],[20,62,3],
    [36,50,4],[44,50,4],[36,62,4],[44,62,4], [58,50,5],[66,50,5],[58,62,5],[66,62,5],
  ].map(([x,y,ai],i) => ({ id: `s${i}`, seat_number: i+1, x_position: x, y_position: y, area_id: `a${ai}` }));
  const STUDENTS = Array.from({ length: 24 }, (_, i) => ({ id: `st${i}`, name: `S${i}` }));
  const RULES = [
    { student_a_id: 'st0', student_b_id: 'st1' },
    { student_a_id: 'st4', student_b_id: 'st5' },
    { student_a_id: 'st8', student_b_id: 'st9' },
  ];

  it('is exactly as random as a perfect uniform sampler under the same rules', () => {
    // Wichtig: Die richtige Referenz ist NICHT die regelfreie Basis 3/23 —
    // die Bedingung selbst hebt P(gleicher Tisch) für regelbeteiligte Paare
    // zwingend auf ~3/22 an (Partner scheidet als Tischnachbar aus).
    // Deshalb wird gegen einen unabhängigen, garantiert gleichverteilten
    // Rejection-Sampler gemessen. Vor dem Fix lag die App bei +0.015 über
    // dieser Referenz (Abstands-Maximierung drängte Regel-Kinder in die Ecken).
    const ruled = ['st0', 'st1', 'st4', 'st5', 'st8', 'st9'];
    const partner = { st0:'st1', st1:'st0', st4:'st5', st5:'st4', st8:'st9', st9:'st8' };

    const measure = (drawTables, N) => {
      let same = 0, total = 0;
      for (let n = 0; n < N; n++) {
        const tableOf = drawTables();
        for (let i = 0; i < ruled.length; i++) {
          for (let j = i + 1; j < ruled.length; j++) {
            if (partner[ruled[i]] === ruled[j]) continue;   // Regel-Paare selbst: immer getrennt
            total++;
            if (tableOf.get(ruled[i]) === tableOf.get(ruled[j])) same++;
          }
        }
      }
      return same / total;
    };

    // App-Algorithmus
    const pApp = measure(() => {
      const res = generateSeatingPlan(STUDENTS, SEATS, RULES, { areas: AREAS, fillMode: 'per_area', personsPerArea: 3 });
      return new Map(res.assignments.filter(a => a.student).map(a => [a.student.id, a.areaId]));
    }, 2000);

    // Unabhängige Referenz: mischen, in 4er-Gruppen teilen, verwerfen bei Regelverstoss
    const ids = STUDENTS.map(s => s.id);
    const pRef = measure(() => {
      for (;;) {
        const s = [...ids];
        for (let i = s.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [s[i], s[j]] = [s[j], s[i]];
        }
        const tableOf = new Map(s.map((id, idx) => [id, Math.floor(idx / 4)]));
        if (RULES.some(r => tableOf.get(r.student_a_id) === tableOf.get(r.student_b_id))) continue;
        return tableOf;
      }
    }, 6000);

    // σ der Differenz ≈ 0.0026 → ±0.012 ist ~4.6σ: stabil, aber der alte
    // +0.015-Bias fällt zuverlässig durch.
    expect(Math.abs(pApp - pRef)).toBeLessThan(0.012);
  });

  it('never seats a forbidden pair physically adjacent, even across table borders', () => {
    // Enges Layout: zwei Tische, deren Randplätze sich näher als die
    // 15%-Nachbarschaftsschwelle kommen. Der Generator darf ein Regel-Paar
    // nie auf ein solches Platz-Paar setzen.
    const tightAreas = [
      { id: 'L', sort_order: 0, x_pos: 0,  y_pos: 0, width_pct: 20, height_pct: 30 },
      { id: 'R', sort_order: 1, x_pos: 20, y_pos: 0, width_pct: 20, height_pct: 30 },
    ];
    const tightSeats = [
      { id: 'q0', seat_number: 1, x_position: 10, y_position: 10, area_id: 'L' },
      { id: 'q1', seat_number: 2, x_position: 10, y_position: 20, area_id: 'L' },
      { id: 'q2', seat_number: 3, x_position: 25, y_position: 10, area_id: 'R' },   // 15% neben q0
      { id: 'q3', seat_number: 4, x_position: 25, y_position: 20, area_id: 'R' },   // 15% neben q1
    ];
    const four = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const rule = [{ student_a_id: 'p0', student_b_id: 'p1' }];
    const adjacency = buildAdjacencyMap(tightSeats);

    for (let n = 0; n < 300; n++) {
      const res = generateSeatingPlan(four, tightSeats, rule, { areas: tightAreas, fillMode: 'per_area', personsPerArea: 2 });
      const seatOf = new Map(res.assignments.filter(a => a.student).map(a => [a.student.id, a.seatId]));
      const sA = seatOf.get('p0'), sB = seatOf.get('p1');
      if (!res.success) continue;   // erklärter Fallback (mit Warnung) ist erlaubt
      expect(adjacency.get(sA).has(sB), `Regel-Paar nebeneinander: ${sA}/${sB} (Lauf ${n})`).toBe(false);
    }
  });

  it('spreads a rule pair across many table combinations, not only the corners', () => {
    // Vorher landete das Paar zu >60% auf den zwei Diagonal-Kombinationen.
    // Nachher muss eine breite Streuung über die 15 Tisch-Paare sichtbar sein.
    const combos = new Set();
    for (let n = 0; n < 400; n++) {
      const res = generateSeatingPlan(STUDENTS, SEATS, [RULES[0]], { areas: AREAS, fillMode: 'per_area', personsPerArea: 3 });
      const areaOf = new Map(res.assignments.filter(a => a.student).map(a => [a.student.id, a.areaId]));
      const a = areaOf.get('st0'), b = areaOf.get('st1');
      combos.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
    expect(combos.size).toBeGreaterThanOrEqual(12);   // von 15 möglichen
  });
});

describe('search budget', () => {
  // Winziges Budget erzwingt den Abbruch der Suche; das Ergebnis muss trotzdem
  // vollständig und gültig geformt sein (kein Hänger, kein Wurf, alle platziert).
  const rules = [{ student_a_id: 'st1', student_b_id: 'st2' }];

  it('degrades to a complete fallback plan (sequential) when exhausted', () => {
    const res = generateSeatingPlan(students, seats, rules, { fillMode: 'sequential', maxSteps: 1 });
    expect(res.assignments).toHaveLength(seats.length);
    expect(res.assignments.filter(a => a.student)).toHaveLength(students.length);
  });

  it('degrades to a complete fallback plan (per_area) when exhausted', () => {
    const areas = [
      { id: 'a1', x_pos: 0, y_pos: 0, width_pct: 20, height_pct: 20, sort_order: 0 },
      { id: 'a2', x_pos: 80, y_pos: 0, width_pct: 20, height_pct: 20, sort_order: 1 },
    ];
    const res = generateSeatingPlan(students, seats, rules, { areas, fillMode: 'per_area', personsPerArea: 1, maxSteps: 1 });
    expect(res.assignments).toHaveLength(seats.length);
    expect(res.assignments.filter(a => a.student)).toHaveLength(students.length);
  });

  it('still solves a normal constrained case within the default budget', () => {
    const res = generateSeatingPlan(students, seats, rules, { fillMode: 'sequential' });
    expect(res.success).toBe(true);
    expect(res.assignments.filter(a => a.student)).toHaveLength(students.length);
  });
});
