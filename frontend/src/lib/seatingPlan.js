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
