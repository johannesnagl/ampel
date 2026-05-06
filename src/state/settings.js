// src/state/settings.js
import { makeStorage } from "./storage.js";

export const SETTINGS_KEY = "ampel.settings";
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS = {
  slotsPerDay: [
    { type: "breakfast", label: "Frühstück" },
    { type: "snack",     label: "Snack 1" },
    { type: "lunch",     label: "Mittag" },
    { type: "snack",     label: "Snack 2" },
    { type: "dinner",    label: "Abend" },
  ],
  weeklyPointBudget: 12,
  weekStartsOn: "monday",
  language: "de",
};

export function makeSettingsStore(backend) {
  const storage = makeStorage(backend, {
    [SETTINGS_KEY]: { currentVersion: SETTINGS_VERSION, migrate: {} },
  });
  return {
    load() {
      return storage.read(SETTINGS_KEY) ?? structuredClone(DEFAULT_SETTINGS);
    },
    save(settings) {
      storage.write(SETTINGS_KEY, settings, SETTINGS_VERSION);
    },
    reset() {
      storage.write(SETTINGS_KEY, structuredClone(DEFAULT_SETTINGS), SETTINGS_VERSION);
    },
  };
}
