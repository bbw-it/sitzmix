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
