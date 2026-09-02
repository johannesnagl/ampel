// src/state/catalog.js
import { makeStorage } from "./storage.js";

export const CATALOG_KEY = "ampel.dishes";
// Bump when the seed catalog ("data/dishes 2.0.xlsx" → data/dishes.json) is
// replaced. Bumping invalidates the user's localStorage cache so the new
// catalog is fetched on next load.
export const CATALOG_VERSION = 5;

export function makeCatalogStore(backend, fetchSeed = defaultFetchSeed) {
  const storage = makeStorage(backend, {
    [CATALOG_KEY]: {
      currentVersion: CATALOG_VERSION,
      migrate: {
        // 1 → 2 → 3: identity migrations. Preserve the user's catalog
        // across version bumps that only added dishes.
        1: (data) => data,
        2: (data) => data,
        // 3 → 4: NO migration, deliberately.
        //
        // Version 4 is the validated "Dishes 2.0" catalog. Every dish was
        // re-checked against Masterpost Phase 3 — 79 frequencies, 4 traffic
        // lights and 21 heavy/light gradings were corrected, and 5 duplicates
        // were removed. 143 of the 147 version-3 dishes still exist under the
        // same id, so an additive merge would silently keep their OLD, wrong
        // codings and only add the 112 new dishes.
        //
        // Omitting the migration makes storage.read() return null for a
        // version-3 cache, which makes load() re-seed from data/dishes.json.
        // That is the intended behaviour here: the corrected codings must win.
        // Trade-off: dishes a user added through the catalog screen are lost.
        // The catalog is maintained in the spreadsheet, so that is acceptable.
        //
        // 4 → 5: also no migration. Slot assignments and tags of existing
        // dishes changed (desserts dropped out of the breakfast picker,
        // four breakfast dishes gained the slot, five "süß" tags that were
        // false positives from "Süßkartoffel" removed). Same reasoning:
        // an additive merge would keep the outdated fields.
      },
    },
  });

  return {
    async load() {
      const cached = storage.read(CATALOG_KEY);
      if (cached) {
        // Try to bring in any new seed dishes the user hasn't seen yet.
        //
        // BUT: if the cache and seed share almost no IDs, the seed has been
        // wholesale replaced (e.g. data/dishes.json regenerated from a
        // different source). Additively merging would pollute the cache with
        // a mix of old + new dishes that aren't related — the picker and
        // search would surface stale ghosts. Don't auto-merge in that case;
        // log a warning and leave the cache alone. The user can opt in to a
        // fresh seed via Settings → "Vorrat zurücksetzen".
        try {
          const seed = await fetchSeed();
          const seedIds = new Set(seed.dishes.map((d) => d.id));
          const cachedIds = cached.dishes.map((d) => d.id);
          const overlap = cachedIds.filter((id) => seedIds.has(id)).length;
          const ratio = cachedIds.length > 0 ? overlap / cachedIds.length : 1;

          if (ratio < 0.3 && cachedIds.length > 0) {
            console.warn(
              `[ampel] Cached catalog has diverged from seed (${overlap}/${cachedIds.length} IDs match, ${Math.round(ratio * 100)}%). ` +
              `Skipping auto-merge to avoid pollution. ` +
              `Use Settings → "Vorrat zurücksetzen" to refresh from seed.`,
            );
            return cached;
          }

          // Healthy overlap — pull in any new seed dishes
          const cachedIdSet = new Set(cachedIds);
          const newOnes = seed.dishes.filter((d) => !cachedIdSet.has(d.id));
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
  // Notfall-Katalog, falls data/dishes.json beim Kaltstart nicht erreichbar ist.
  // Aus dem validierten Katalog (version 4) übernommen – gleiche Codierung,
  // gleiche Tags. version: 0 markiert ihn als unvollständig, damit ein späterer
  // Online-Load ihn ersetzt.
  version: 0,
  dishes: [
    { id: "standard-porridge-smoothie", name: "Standard Porridge + Smoothie", category: "green", heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["breakfast", "snack", "lunch", "dinner"], tags: ["leicht verdaulich", "kalt", "vegetarisch"], notes: "Offline-Standard" },
    { id: "skyr-obst", name: "Skyr + Obst", category: "green", heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["breakfast", "snack", "lunch", "dinner"], tags: ["leicht verdaulich", "kalt", "to go", "vegetarisch"], notes: "Offline-Standard" },
    { id: "cottage-apfel", name: "Cottage + Apfel", category: "green", heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["snack"], tags: ["leicht verdaulich", "to go", "vegetarisch"], notes: "Offline-Standard" },
    { id: "ruehrei-avocado", name: "Rührei + Avocado", category: "green", heavy: false, frequency: { type: "weekly", max: 5 }, slotTypes: ["breakfast", "lunch", "dinner"], tags: ["leicht verdaulich", "warm", "vegetarisch"], notes: "Offline-Standard" },
    { id: "couscous-rucola-gurke-cottage", name: "Couscous – Rucola – Gurke - Cottage", category: "green", heavy: false, frequency: { type: "weekly", max: 2 }, slotTypes: ["lunch", "dinner"], tags: ["leicht verdaulich", "to go", "vegetarisch"], notes: "Offline-Standard" },
    { id: "quinoa-thunfisch-rucola-gurke-warm", name: "Quinoa – Thunfisch – Rucola - Gurke (warm)", category: "green", heavy: false, frequency: { type: "weekly", max: 2 }, slotTypes: ["lunch", "dinner"], tags: ["leicht verdaulich", "warm"], notes: "Offline-Standard" },
    { id: "zucchinicremesuppe", name: "Zucchinicremesuppe", category: "green", heavy: false, frequency: { type: "weekly", max: 2 }, slotTypes: ["lunch", "dinner"], tags: ["warm", "meal prep", "vegetarisch"], notes: "Offline-Standard" },
    { id: "couscoussalat-mit-feta-gurke-minze-erbsen-basilikum", name: "Couscoussalat mit Feta, Gurke, Minze, Erbsen, Basilikum", category: "yellow", heavy: true, frequency: { type: "weekly", max: 2 }, slotTypes: ["lunch", "dinner"], tags: ["kalt", "meal prep", "to go", "vegetarisch"], notes: "Offline-Standard" },
    { id: "falafel-bowl", name: "Falafel Bowl", category: "yellow", heavy: false, frequency: { type: "weekly", max: 2 }, slotTypes: ["lunch", "dinner"], tags: ["leicht verdaulich", "bowl", "kalt", "meal prep", "to go", "vegetarisch"], notes: "Offline-Standard" },
    { id: "pizza", name: "Pizza", category: "red", heavy: true, frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch", "dinner"], tags: ["vegetarisch", "cheat"], notes: "Offline-Standard" },
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
