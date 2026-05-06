// src/util/dates.js
//
// All times are treated as UTC for week math. ISO weeks: Monday is the
// first day; the week containing the year's first Thursday is week 1.

const DAY_MS = 86400000;

export function addDays(date, n) {
  return new Date(date.getTime() + n * DAY_MS);
}

export function mondayOf(date) {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay: Sun=0, Mon=1, ..., Sat=6 → distance back to Monday
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}

export function isoWeekId(date) {
  // Algorithm: clone date, set to Thursday of its ISO week, then year of that
  // Thursday is the ISO year. Week number = floor((dayOfYear of Thursday - 1) / 7) + 1.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dow + 3); // Thursday
  const isoYear = d.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.floor((d.getTime() - yearStart) / DAY_MS / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function dateKey(date) {
  return new Date(date.getTime()).toISOString().slice(0, 10);
}

export function isoWeekIdFromKey(key) {
  return isoWeekId(new Date(`${key}T12:00:00Z`));
}

const SHORT_DAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]; // getUTCDay index

export function fmtDayShort(date) {
  return SHORT_DAY[date.getUTCDay()];
}

export function fmtDateGerman(date) {
  return `${date.getUTCDate()}.${date.getUTCMonth() + 1}.`;
}
