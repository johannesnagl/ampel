// src/state/catalog.js
import { makeStorage } from "./storage.js";

export const CATALOG_KEY = "ampel.dishes";
// Bump when the seed catalog (data/dishes.xlsx → data/dishes.json) is
// replaced. Bumping invalidates the user's localStorage cache so the new
// catalog is fetched on next load.
export const CATALOG_VERSION = 2;

export function makeCatalogStore(backend, fetchSeed = defaultFetchSeed) {
  const storage = makeStorage(backend, {
    [CATALOG_KEY]: {
      currentVersion: CATALOG_VERSION,
      migrate: {
        // 1 → 2: identity. Preserves user catalog across the version bump.
        // (When introducing future versions, replace this with a real migration.)
        1: (data) => data,
      },
    },
  });

  return {
    async load() {
      const cached = storage.read(CATALOG_KEY);
      if (cached) {
        // Merge in any new seed dishes that aren't yet in the cached catalog
        try {
          const seed = await fetchSeed();
          const cachedIds = new Set(cached.dishes.map((d) => d.id));
          const newOnes = seed.dishes.filter((d) => !cachedIds.has(d.id));
          if (newOnes.length > 0) {
            cached.dishes.push(...newOnes);
            storage.write(CATALOG_KEY, cached, CATALOG_VERSION);
          }
        } catch (e) {
          console.warn("seed fetch failed during merge; using cached catalog only", e);
        }
        return cached;
      }
      const seed = await fetchSeed();
      storage.write(CATALOG_KEY, seed, CATALOG_VERSION);
      return seed;
    },
    save(catalog) {
      storage.write(CATALOG_KEY, catalog, CATALOG_VERSION);
    },
    async reset() {
      const seed = await fetchSeed();
      storage.write(CATALOG_KEY, seed, CATALOG_VERSION);
      return seed;
    },
  };
}

const INLINE_FALLBACK = {
  version: 0,
  dishes: [
    { id: "porridge-smoothie",  name: "Porridge + Smoothie",   category: "green",  heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["breakfast"],                       tags: ["frühstück","smoothie","haferflocken"], notes: "Offline-Standard" },
    { id: "skyr-obst",          name: "Skyr + Obst",            category: "green",  heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["breakfast","snack","lunch","dinner"], tags: ["skyr","obst"],                        notes: "Offline-Standard" },
    { id: "couscous-cottage",   name: "Couscous + Cottage",     category: "green",  heavy: false, frequency: { type: "weekly", max: 5 }, slotTypes: ["lunch","dinner"],                  tags: ["couscous","cottage"],                  notes: "Offline-Standard" },
    { id: "quinoa-thunfisch",   name: "Quinoa + Thunfisch",     category: "green",  heavy: false, frequency: { type: "weekly", max: 5 }, slotTypes: ["lunch","dinner"],                  tags: ["quinoa","thunfisch"],                  notes: "Offline-Standard" },
    { id: "bulgur-cottage",     name: "Bulgur + Cottage",       category: "green",  heavy: false, frequency: { type: "weekly", max: 5 }, slotTypes: ["lunch","dinner"],                  tags: ["bulgur","cottage"],                    notes: "Offline-Standard" },
    { id: "rührei-avocado",     name: "Rührei + Avocado",       category: "green",  heavy: false, frequency: { type: "weekly", max: 5 }, slotTypes: ["breakfast","lunch","dinner"],       tags: ["rührei","avocado","ei"],               notes: "Offline-Standard" },
    { id: "couscous-feta",      name: "Couscoussalat Feta",     category: "yellow", heavy: false, frequency: { type: "weekly", max: 3 }, slotTypes: ["lunch","dinner"],                  tags: ["couscous","feta"],                     notes: "Offline-Standard" },
    { id: "falafel-bowl",       name: "Falafel Bowl",           category: "yellow", heavy: true,  frequency: { type: "weekly", max: 3 }, slotTypes: ["lunch","dinner"],                  tags: ["falafel","hummus"],                    notes: "Offline-Standard" },
    { id: "pizza",              name: "Pizza",                  category: "red",    heavy: true,  frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch","dinner"],                  tags: ["pizza"],                               notes: "Offline-Standard" },
    { id: "risotto",            name: "Risotto",                category: "red",    heavy: true,  frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch","dinner"],                  tags: ["risotto"],                             notes: "Offline-Standard" },
  ],
};

async function defaultFetchSeed() {
  try {
    const res = await fetch("data/dishes.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("Seed catalog fetch failed — using inline fallback (10 dishes). Reload online to get the full catalog.", e);
    return INLINE_FALLBACK;
  }
}
