import { describe, it, expect } from 'vitest';
import { generateSeatingPlan } from './seatingAlgorithm';

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
