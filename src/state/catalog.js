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

async function defaultFetchSeed() {
  const res = await fetch("data/dishes.json");
  if (!res.ok) throw new Error(`Failed to fetch seed catalog: ${res.status}`);
  return await res.json();
}
