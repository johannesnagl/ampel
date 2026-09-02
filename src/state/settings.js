// src/state/settings.js
import { makeStorage } from "./storage.js";

export const SETTINGS_KEY = "ampel.settings";
export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS = {
  slotsPerDay: [
    { type: "breakfast", label: "Frühstück" },
    { type: "snack",     label: "Snack 1" },
    { type: "lunch",     label: "Mittag" },
    // Dessert ist laut Masterpost §12 eine eigene Komponente mit eigener
    // Ampelfarbe und eigenen Punkten – es ersetzt die Hauptmahlzeit nicht,
    // sondern kommt obendrauf. Deshalb ein eigener, optionaler Slot direkt
    // hinter Mittag und Abend.
    { type: "dessert",   label: "Dessert", optional: true },
    { type: "snack",     label: "Snack 2" },
    { type: "dinner",    label: "Abend" },
    { type: "dessert",   label: "Dessert", optional: true },
  ],
  weeklyPointBudget: 12,
};

// 1 → 2: die beiden optionalen Dessert-Slots hinter Mittag und Abend
// einfügen, ohne die bestehende Slot-Konfiguration des Nutzers zu verlieren.
function addDessertSlots(settings) {
  const slots = settings?.slotsPerDay;
  if (!Array.isArray(slots)) return settings;
  if (slots.some((s) => s.type === "dessert")) return settings;
  const out = [];
  for (const s of slots) {
    out.push(s);
    if (s.type === "lunch" || s.type === "dinner") {
      out.push({ type: "dessert", label: "Dessert", optional: true });
    }
  }
  return { ...settings, slotsPerDay: out };
}

export function makeSettingsStore(backend) {
  const storage = makeStorage(backend, {
    [SETTINGS_KEY]: { currentVersion: SETTINGS_VERSION, migrate: { 1: addDessertSlots } },
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
