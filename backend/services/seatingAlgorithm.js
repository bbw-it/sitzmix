function buildAdjacencyMap(seats, thresholdPercent = 15) {
  const adjacency = new Map();
  for (const seat of seats) {
    adjacency.set(seat.id, new Set());
  }
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const dx = seats[i].x_position - seats[j].x_position;
      const dy = seats[i].y_position - seats[j].y_position;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= thresholdPercent) {
        adjacency.get(seats[i].id).add(seats[j].id);
        adjacency.get(seats[j].id).add(seats[i].id);
      }
    }
  }
  return adjacency;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSeatingPlan(students, seats, rules) {
  if (students.length === 0 || seats.length === 0) {
    return { success: true, assignments: seats.map(s => ({ ...s, student: null })) };
  }

  const adjacency = buildAdjacencyMap(seats);

  const forbidden = new Set();
  for (const rule of rules) {
    forbidden.add(`${rule.student_a_id}-${rule.student_b_id}`);
    forbidden.add(`${rule.student_b_id}-${rule.student_a_id}`);
  }

  const shuffledStudents = shuffle(students);
  const assignment = new Array(seats.length).fill(null);

  function isSafe(studentId, seatIndex) {
    const seatId = seats[seatIndex].id;
    const adjacent = adjacency.get(seatId) || new Set();
    for (let i = 0; i < seats.length; i++) {
      if (assignment[i] !== null && adjacent.has(seats[i].id)) {
        if (forbidden.has(`${studentId}-${assignment[i].id}`)) {
          return false;
        }
      }
    }
    return true;
  }

  function backtrack(studentIndex) {
    if (studentIndex >= shuffledStudents.length) return true;

    const seatOrder = shuffle([...Array(seats.length).keys()]);
    for (const seatIdx of seatOrder) {
      if (assignment[seatIdx] !== null) continue;
      if (isSafe(shuffledStudents[studentIndex].id, seatIdx)) {
        assignment[seatIdx] = shuffledStudents[studentIndex];
        if (backtrack(studentIndex + 1)) return true;
        assignment[seatIdx] = null;
      }
    }
    return false;
  }

  const success = backtrack(0);

  if (!success) {
    // Fallback: random assignment ignoring rules
    const fallbackStudents = shuffle(students);
    const result = seats.map((seat, idx) => ({
      seatId: seat.id,
      seatNumber: seat.seat_number,
      xPosition: seat.x_position,
      yPosition: seat.y_position,
      student: idx < fallbackStudents.length ? fallbackStudents[idx] : null,
    }));
    return { success: false, warning: 'Nicht alle Regeln konnten eingehalten werden.', assignments: result };
  }

  const result = seats.map((seat, idx) => ({
    seatId: seat.id,
    seatNumber: seat.seat_number,
    xPosition: seat.x_position,
    yPosition: seat.y_position,
    student: assignment[idx] || null,
  }));

  return { success: true, assignments: result };
}

module.exports = { generateSeatingPlan, buildAdjacencyMap };
