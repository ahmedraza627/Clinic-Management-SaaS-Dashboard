/** Pure slot helpers — no DB access, fully unit-testable. */

/** "2026-10-02" (YYYY-MM-DD) → Date at UTC midnight. */
export function toUTCMidnight(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw Object.assign(new Error(`Invalid date string: ${dateStr}`), { status: 400 });
  }
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Shift window → array of "HH:mm" slot labels. */
export function generateSlots(shiftStart, shiftEnd, slotMinutes) {
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const toHHMM = (mins) =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  const slots = [];
  for (let t = toMin(shiftStart); t + slotMinutes <= toMin(shiftEnd); t += slotMinutes) {
    slots.push(toHHMM(t));
  }
  return slots;
}

/** Next UTC-midnight boundary after a given date (range-end helper). */
export function endOfUTCDay(date) {
  const d = new Date(date);
  d.setUTCHours(24, 0, 0, 0);
  return d;
}
