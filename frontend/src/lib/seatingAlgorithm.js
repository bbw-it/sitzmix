/**
 * SitzMix – Sitzplan-Algorithmus
 *
 * Modi:
 *   "sequential" – Plätze von Nr. 1 her auffüllen, Schüler zufällig verteilen
 *   "per_area"   – Schüler gleichmässig auf Bereiche verteilen
 *
 * Regeln:
 *   - Verbotene Paare dürfen NICHT im gleichen Bereich (Tisch) sitzen
 *   - Verbotene Paare dürfen NICHT physisch nebeneinander sitzen
 *   - Kein Schüler soll alleine in einem Bereich sitzen (min. 2 pro genutztem Bereich)
 *   - Darüber hinaus ist die Verteilung gleichverteilt zufällig (keine
 *     Abstands-Maximierung — die erzeugte messbares Ecktisch-Clustering)
 */

// Obergrenze für Backtracking-Versuche. Bei stark widersprüchlichen Regeln
// könnte die Suche sonst exponentiell viele Kombinationen prüfen und den Browser-
// Tab einfrieren. Wird das Budget erschöpft, greift der faire Fallback (Verteilung
// ohne Regelgarantie). Normale Klassen (~24 Lernende) brauchen nur wenige hundert
// Schritte, liegen also weit darunter.
const MAX_STEPS = 200000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAdjacencyMap(seats, thresholdPercent = 15) {
  const adjacency = new Map();
  for (const seat of seats) adjacency.set(seat.id, new Set());
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const dx = seats[i].x_position - seats[j].x_position;
      const dy = seats[i].y_position - seats[j].y_position;
      if (Math.sqrt(dx * dx + dy * dy) <= thresholdPercent) {
        adjacency.get(seats[i].id).add(seats[j].id);
        adjacency.get(seats[j].id).add(seats[i].id);
      }
    }
  }
  return adjacency;
}

function buildForbiddenData(rules) {
  const forbiddenSet = new Set();
  const forbiddenGraph = new Map();
  for (const rule of rules) {
    forbiddenSet.add(`${rule.student_a_id}-${rule.student_b_id}`);
    forbiddenSet.add(`${rule.student_b_id}-${rule.student_a_id}`);
    if (!forbiddenGraph.has(rule.student_a_id)) forbiddenGraph.set(rule.student_a_id, new Set());
    if (!forbiddenGraph.has(rule.student_b_id)) forbiddenGraph.set(rule.student_b_id, new Set());
    forbiddenGraph.get(rule.student_a_id).add(rule.student_b_id);
    forbiddenGraph.get(rule.student_b_id).add(rule.student_a_id);
  }
  return { forbiddenSet, forbiddenGraph };
}

function formatSeat(seat, student = null) {
  return {
    seatId: seat.id,
    seatNumber: seat.seat_number,
    xPosition: seat.x_position,
    yPosition: seat.y_position,
    areaId: seat.area_id || null,
    student,
  };
}

/**
 * Compute how many students go into each area.
 * Avoids lone students (minimum 2 per used area).
 *
 * Examples with personsPerArea=3:
 *   18 students, 6 areas → [3,3,3,3,3,3]
 *   12 students, 6 areas → [3,3,3,3] (4 areas used, 2 empty)
 *   10 students, 6 areas → [3,3,2,2] (no one alone)
 *    7 students, 6 areas → [3,2,2]   (no one alone)
 *    4 students, 6 areas → [2,2]     (no one alone)
 */
function computeDistribution(studentCount, personsPerArea, maxAreas) {
  if (studentCount === 0) return [];
  if (studentCount === 1) return [1]; // unvermeidbar

  let areasNeeded = Math.ceil(studentCount / personsPerArea);
  areasNeeded = Math.min(areasNeeded, maxAreas);
  if (areasNeeded === 0) return [studentCount];

  // Sicherstellen, dass jeder Bereich mind. 2 Personen hat
  let base = Math.floor(studentCount / areasNeeded);
  while (base < 2 && areasNeeded > 1) {
    areasNeeded--;
    base = Math.floor(studentCount / areasNeeded);
  }

  const extra = studentCount % areasNeeded;
  const result = [];
  for (let i = 0; i < areasNeeded; i++) {
    result.push(i < extra ? base + 1 : base);
  }
  return result;
}

// ─── Sequential Mode ─────────────────────────────────────────
// Plätze von Nr. 1 her auffüllen, Schüler zufällig verteilen.
// Verbotene Paare dürfen nicht im gleichen Bereich UND nicht
// physisch nebeneinander sitzen.

function generateSequentialPlan(students, seats, rules, maxSteps = MAX_STEPS) {
  const { forbiddenSet } = buildForbiddenData(rules);

  const sortedSeats = [...seats].sort((a, b) => a.seat_number - b.seat_number);
  const activeSeats = sortedSeats.slice(0, students.length);
  const inactiveSeats = sortedSeats.slice(students.length);

  const adjacency = buildAdjacencyMap(activeSeats);
  const shuffledStudents = shuffle(students);
  const assignment = new Array(activeSeats.length).fill(null);
  let steps = 0;   // zählt Platzierungsversuche; siehe MAX_STEPS

  function isSafe(studentId, seatIdx) {
    const seat = activeSeats[seatIdx];

    // Verbotene Paare: nicht im gleichen Bereich
    if (seat.area_id) {
      for (let i = 0; i < activeSeats.length; i++) {
        if (assignment[i] && activeSeats[i].area_id === seat.area_id) {
          if (forbiddenSet.has(`${studentId}-${assignment[i].id}`)) return false;
        }
      }
    }

    // Verbotene Paare: nicht physisch nebeneinander
    const neighbors = adjacency.get(seat.id) || new Set();
    for (let i = 0; i < activeSeats.length; i++) {
      if (assignment[i] && neighbors.has(activeSeats[i].id)) {
        if (forbiddenSet.has(`${studentId}-${assignment[i].id}`)) return false;
      }
    }

    return true;
  }

  function backtrack(studentIndex) {
    if (studentIndex >= shuffledStudents.length) return true;
    const order = shuffle([...Array(activeSeats.length).keys()]);
    for (const seatIdx of order) {
      if (++steps > maxSteps) return false;   // Budget erschöpft → Fallback
      if (assignment[seatIdx]) continue;
      if (isSafe(shuffledStudents[studentIndex].id, seatIdx)) {
        assignment[seatIdx] = shuffledStudents[studentIndex];
        if (backtrack(studentIndex + 1)) return true;
        assignment[seatIdx] = null;
      }
    }
    return false;
  }

  if (!backtrack(0)) {
    // Fallback: zufällige Verteilung ohne Regelprüfung
    const fb = shuffle(students);
    return {
      success: false,
      warning: 'Nicht alle Regeln konnten eingehalten werden.',
      assignments: sortedSeats.map((seat, idx) =>
        formatSeat(seat, idx < fb.length ? fb[idx] : null)
      ),
    };
  }

  return {
    success: true,
    assignments: [
      ...activeSeats.map((seat, idx) => formatSeat(seat, assignment[idx])),
      ...inactiveSeats.map(seat => formatSeat(seat)),
    ],
  };
}

// ─── Per-Area Mode ───────────────────────────────────────────
// Schüler gleichmässig auf Bereiche verteilen.
// Phase 1: Verteilung berechnen (wie viele Bereiche, wie viele pro Bereich)
// Phase 2: Schüler den Bereichen zuweisen (Backtracking, verbotene Paare trennen)
// Phase 3: Innerhalb jedes Bereichs zufällig auf Sitze verteilen
// Multi-Versuch: GLEICHVERTEILTE Wahl unter allen gültigen Konfigurationen.
//
// Bewusst KEINE Abstands-Maximierung mehr: Die frühere Auswahl "maximaler
// Abstand zwischen Regel-Paaren" drängte alle regelbeteiligten Lernenden an
// die Ecktische. Messbare Folge (20'000 Läufe): Lernende aus VERSCHIEDENEN
// Regeln sassen mit P=0.156 statt 3/23=0.130 am selben Tisch (+19%, z=36.8),
// und ein Regel-Kind sass zu 92% an einem Ecktisch. Garantiert bleibt: nie am
// selben Tisch, nie direkt nebeneinander — darüber hinaus ist die Wahl zufällig.

function generatePerAreaPlan(students, seats, rules, areas, personsPerArea, maxSteps = MAX_STEPS) {
  const { forbiddenGraph } = buildForbiddenData(rules);

  // Sitze nach Bereich gruppieren
  const seatsByArea = new Map();
  const unassignedSeats = [];
  for (const seat of seats) {
    if (seat.area_id) {
      if (!seatsByArea.has(seat.area_id)) seatsByArea.set(seat.area_id, []);
      seatsByArea.get(seat.area_id).push(seat);
    } else {
      unassignedSeats.push(seat);
    }
  }
  for (const [, aSeats] of seatsByArea) {
    aSeats.sort((a, b) => a.seat_number - b.seat_number);
  }

  // Nur Bereiche mit Sitzen verwenden
  const viableAreas = areas.filter(a => (seatsByArea.get(a.id) || []).length > 0);
  if (viableAreas.length === 0) {
    return generateSequentialPlan(students, seats, rules, maxSteps);
  }

  // Verteilung berechnen
  const distribution = computeDistribution(students.length, personsPerArea, viableAreas.length);
  const areasNeeded = distribution.length;

  if (areasNeeded === 0) {
    return generateSequentialPlan(students, seats, rules, maxSteps);
  }

  // Bereiche in sort_order verwenden (Bereich 1, 2, 3, ...)
  // Die ersten N Bereiche werden befüllt
  const usedAreas = viableAreas.slice(0, areasNeeded);

  // Verteilung den Bereichen zuweisen (in Reihenfolge)
  const areaSlots = new Map();
  let feasible = true;
  for (let i = 0; i < usedAreas.length; i++) {
    const seatCount = (seatsByArea.get(usedAreas[i].id) || []).length;
    if (distribution[i] > seatCount) { feasible = false; break; }
    areaSlots.set(usedAreas[i].id, distribution[i]);
  }

  if (!feasible) {
    return generateSequentialPlan(students, seats, rules, maxSteps);
  }

  // Nachbarschaft über ALLE Sitze — Regel-Paare dürfen auch über Tischgrenzen
  // hinweg nicht direkt nebeneinander sitzen (z.B. Randplätze zweier enger Tische).
  const adjacency = buildAdjacencyMap(seats);
  const usedAreaIds = new Set(usedAreas.map(a => a.id));

  // Aus einer Bereichs-Zuteilung die konkrete Sitz-Zuordnung bauen
  // (Plätze innerhalb jedes Bereichs zufällig vergeben).
  function buildAssignments(areaStudents) {
    const result = [];
    for (const area of areas) {
      const aSeats = seatsByArea.get(area.id) || [];
      if (usedAreaIds.has(area.id)) {
        const studs = shuffle(areaStudents.get(area.id) || []);
        for (let i = 0; i < aSeats.length; i++) {
          result.push(formatSeat(aSeats[i], i < studs.length ? studs[i] : null));
        }
      } else {
        for (const seat of aSeats) result.push(formatSeat(seat));
      }
    }
    for (const seat of unassignedSeats) result.push(formatSeat(seat));
    return result;
  }

  // Sitzt ein Regel-Paar physisch nebeneinander? (Gleicher Tisch ist durch
  // assignToAreas bereits ausgeschlossen.)
  function violatesAdjacency(assignments) {
    if (rules.length === 0) return false;
    const seatOf = new Map();
    for (const a of assignments) if (a.student) seatOf.set(a.student.id, a.seatId);
    for (const rule of rules) {
      const sA = seatOf.get(rule.student_a_id);
      const sB = seatOf.get(rule.student_b_id);
      if (sA && sB && adjacency.get(sA)?.has(sB)) return true;
    }
    return false;
  }

  const MAX_ATTEMPTS = 60;
  let steps = 0;   // Budget über alle Phasen hinweg; siehe MAX_STEPS

  // ── Phase A: Rejection-Sampling (exakt gleichverteilt) ──
  // Gleichverteilt austeilen (Shuffle in Gruppen schneiden) und verwerfen, sobald
  // eine Regel verletzt ist. Ein akzeptierter Versuch ist damit per Konstruktion
  // eine gleichverteilte Stichprobe aus ALLEN gültigen Konfigurationen — im
  // Gegensatz zum Backtracking, das abgewiesene Regel-Kinder systematisch in
  // benachbarte Tische lenkt (gemessen: +8% Rest-Clustering). Akzeptanzrate bei
  // 3 Regeln: ~66% → praktisch immer im ersten oder zweiten Versuch gültig.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    steps += students.length;
    if (steps > maxSteps) break;

    const shuffled = shuffle(students);
    const areaStudents = new Map();
    let offset = 0;
    let ok = true;
    for (let i = 0; i < usedAreas.length && ok; i++) {
      const group = shuffled.slice(offset, offset + distribution[i]);
      offset += distribution[i];
      for (const s of group) {
        const forbidden = forbiddenGraph.get(s.id);
        if (forbidden && group.some(o => o !== s && forbidden.has(o.id))) { ok = false; break; }
      }
      areaStudents.set(usedAreas[i].id, group);
    }
    if (!ok) continue;

    const assignments = buildAssignments(areaStudents);
    if (violatesAdjacency(assignments)) continue;
    return { success: true, assignments };
  }

  // ── Phase B: Backtracking als Notnagel für stark verregelte Klassen ──
  // Findet auch dann eine gültige Zuteilung, wenn Rejection-Sampling zu oft
  // verwirft. Die Bereichs-Reihenfolge wird pro Schritt gemischt, um die
  // Füll-Reihenfolge nicht durchschlagen zu lassen.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (steps > maxSteps) break;   // Budget erschöpft → unten sequentieller Fallback
    const shuffledStudents = shuffle(students);
    const areaStudents = new Map();
    for (const a of usedAreas) areaStudents.set(a.id, []);

    function assignToAreas(studentIdx) {
      if (studentIdx >= shuffledStudents.length) return true;
      const student = shuffledStudents[studentIdx];
      const forbidden = forbiddenGraph.get(student.id) || new Set();

      for (const area of shuffle(usedAreas)) {
        if (++steps > maxSteps) return false;   // Budget erschöpft
        const current = areaStudents.get(area.id);
        if (current.length >= areaSlots.get(area.id)) continue;

        // Verbotenes Paar im gleichen Bereich → nicht erlaubt
        if (current.some(s => forbidden.has(s.id))) continue;

        current.push(student);
        if (assignToAreas(studentIdx + 1)) return true;
        current.pop();
      }
      return false;
    }

    if (!assignToAreas(0)) continue;

    const assignments = buildAssignments(areaStudents);
    if (violatesAdjacency(assignments)) continue;
    return { success: true, assignments };
  }

  // ── Phase C: sequentieller Fallback ──
  return {
    ...generateSequentialPlan(students, seats, rules, maxSteps),
    warning: 'Bereichs-Verteilung war nicht möglich. Plätze wurden sequentiell vergeben.',
  };
}

// ─── Entry Point ─────────────────────────────────────────────

function generateSeatingPlan(students, seats, rules, options = {}) {
  const { areas = [], fillMode = 'sequential', personsPerArea = 0, maxSteps = MAX_STEPS } = options;

  if (students.length === 0 || seats.length === 0) {
    return {
      success: true,
      assignments: seats.map(s => formatSeat(s)),
    };
  }

  if (fillMode === 'per_area' && areas.length > 0 && personsPerArea > 0) {
    return generatePerAreaPlan(students, seats, rules, areas, personsPerArea, maxSteps);
  }

  return generateSequentialPlan(students, seats, rules, maxSteps);
}

export { generateSeatingPlan, buildAdjacencyMap };
