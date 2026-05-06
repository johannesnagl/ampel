// src/state/weeks.js
import { makeStorage } from "./storage.js";

export const WEEKS_KEY = "ampel.weeks";
export const WEEKS_VERSION = 1;

export function emptyDay(slotsPerDay) {
  return {
    slots: slotsPerDay.map(({ type }) => ({
      type, dishId: null, loggedAt: null, note: "",
    })),
  };
}

export function emptyWeek(mondayISO, slotsPerDay) {
  const days = {};
  const monday = new Date(mondayISO);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days[key] = emptyDay(slotsPerDay);
  }
  return { monday: mondayISO, days };
}

export function makeWeeksStore(backend) {
  const storage = makeStorage(backend, {
    [WEEKS_KEY]: { currentVersion: WEEKS_VERSION, migrate: {} },
  });
  return {
    loadAll() {
      return storage.read(WEEKS_KEY) ?? {};
    },
    saveAll(all) {
      storage.write(WEEKS_KEY, all, WEEKS_VERSION);
    },
    getWeek(weekId, mondayISO, slotsPerDay) {
      const all = this.loadAll();
      if (!all[weekId]) {
        all[weekId] = emptyWeek(mondayISO, slotsPerDay);
      }
      return all[weekId];
    },
    saveWeek(weekId, week) {
      const all = this.loadAll();
      all[weekId] = week;
      this.saveAll(all);
    },
  };
}
