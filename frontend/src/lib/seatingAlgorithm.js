/**
 * SitzMix – Sitzplan-Algorithmus
 *
 * Modi:
 *   "sequential" – Plätze von Nr. 1 her auffüllen, Schüler zufällig verteilen
 *   "per_area"   – Schüler gleichmässig auf Bereiche verteilen
 *
 * Regeln:
 *   - Verbotene Paare dürfen NICHT im gleichen Bereich (Tisch) sitzen
 *   - Verbotene Paare sollen möglichst weit voneinander entfernt sein
 *   - Kein Schüler soll alleine in einem Bereich sitzen (min. 2 pro genutztem Bereich)
 */

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

/**
 * Euclidean distance between area centers (in %).
 */
function areaDistance(a1, a2) {
  const cx1 = a1.x_pos + a1.width_pct / 2;
  const cy1 = a1.y_pos + a1.height_pct / 2;
  const cx2 = a2.x_pos + a2.width_pct / 2;
  const cy2 = a2.y_pos + a2.height_pct / 2;
  return Math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2);
}

// ─── Sequential Mode ─────────────────────────────────────────
// Plätze von Nr. 1 her auffüllen, Schüler zufällig verteilen.
// Verbotene Paare dürfen nicht im gleichen Bereich UND nicht
// physisch nebeneinander sitzen.

function generateSequentialPlan(students, seats, rules) {
  const { forbiddenSet } = buildForbiddenData(rules);

  const sortedSeats = [...seats].sort((a, b) => a.seat_number - b.seat_number);
  const activeSeats = sortedSeats.slice(0, students.length);
  const inactiveSeats = sortedSeats.slice(students.length);

  const adjacency = buildAdjacencyMap(activeSeats);
  const shuffledStudents = shuffle(students);
  const assignment = new Array(activeSeats.length).fill(null);

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
// Multi-Versuch: Beste Konfiguration nach Distanz-Score auswählen.

function generatePerAreaPlan(students, seats, rules, areas, personsPerArea) {
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
    return generateSequentialPlan(students, seats, rules);
  }

  // Verteilung berechnen
  const distribution = computeDistribution(students.length, personsPerArea, viableAreas.length);
  const areasNeeded = distribution.length;

  if (areasNeeded === 0) {
    return generateSequentialPlan(students, seats, rules);
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
    return generateSequentialPlan(students, seats, rules);
  }

  // Area-Map für Distanzberechnung
  const areaMap = new Map(areas.map(a => [a.id, a]));

  let bestResult = null;
  let bestScore = -Infinity;
  const MAX_ATTEMPTS = 60;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Schüler mischen, aber Bereiche bleiben in Reihenfolge
    const shuffledStudents = shuffle(students);
    const areaStudents = new Map();
    for (const a of usedAreas) areaStudents.set(a.id, []);

    // Schüler der Reihe nach auf Bereiche verteilen (Backtracking)
    // Bevorzugt: Bereich 1 zuerst füllen, dann 2, dann 3...
    function assignToAreas(studentIdx) {
      if (studentIdx >= shuffledStudents.length) return true;
      const student = shuffledStudents[studentIdx];
      const forbidden = forbiddenGraph.get(student.id) || new Set();

      // Bereiche in Reihenfolge versuchen (1, 2, 3...)
      for (const area of usedAreas) {
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

    // Score: Distanz zwischen verbotenen Paaren maximieren
    let score = 0;
    const studentToArea = new Map();
    for (const [areaId, studs] of areaStudents) {
      for (const s of studs) studentToArea.set(s.id, areaId);
    }

    for (const rule of rules) {
      const aA = studentToArea.get(rule.student_a_id);
      const aB = studentToArea.get(rule.student_b_id);
      if (aA && aB && aA !== aB) {
        const a1 = areaMap.get(aA);
        const a2 = areaMap.get(aB);
        if (a1 && a2) score += areaDistance(a1, a2);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = {
        areaStudents: new Map([...areaStudents].map(([k, v]) => [k, [...v]])),
        usedAreaIds: new Set(usedAreas.map(a => a.id)),
      };
    }

    // Gut genug? Frühzeitig stoppen
    if (score > 0 && attempt > 20) break;
    // Ohne Regeln: erster gültiger Versuch reicht
    if (rules.length === 0) break;
  }

  if (!bestResult) {
    // Kein gültiges Layout gefunden → sequentieller Fallback
    return {
      ...generateSequentialPlan(students, seats, rules),
      warning: 'Bereichs-Verteilung war nicht möglich. Plätze wurden sequentiell vergeben.',
    };
  }

  // Ergebnis aufbauen
  const { areaStudents, usedAreaIds } = bestResult;
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

  return { success: true, assignments: result };
}

// ─── Entry Point ─────────────────────────────────────────────

function generateSeatingPlan(students, seats, rules, options = {}) {
  const { areas = [], fillMode = 'sequential', personsPerArea = 0 } = options;

  if (students.length === 0 || seats.length === 0) {
    return {
      success: true,
      assignments: seats.map(s => formatSeat(s)),
    };
  }

  if (fillMode === 'per_area' && areas.length > 0 && personsPerArea > 0) {
    return generatePerAreaPlan(students, seats, rules, areas, personsPerArea);
  }

  return generateSequentialPlan(students, seats, rules);
}

export { generateSeatingPlan, buildAdjacencyMap };
