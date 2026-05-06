//
// Versioned localStorage wrapper. Every value is stored as
//   { schemaVersion: N, data: ... }
// On read, if the stored version is older than `currentVersion`, we run
// migrations sequentially. If newer or unknown, we treat the data as
// missing.

export function makeStorage(backend = globalThis.localStorage, schemas = {}) {
  function read(key) {
    const raw = backend.getItem(key);
    if (raw == null) return null;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return null; }
    if (!parsed || typeof parsed !== "object") return null;
    const schema = schemas[key];
    if (!schema) return parsed.data ?? null;
    let v = parsed.schemaVersion;
    let data = parsed.data;
    if (v === schema.currentVersion) return data;
    if (v > schema.currentVersion) return null;
    while (v < schema.currentVersion) {
      const step = schema.migrate?.[v];
      if (!step) return null;
      data = step(data);
      v += 1;
    }
    return data;
  }

  function write(key, data, version) {
    const wrapped = { schemaVersion: version, data };
    try {
      backend.setItem(key, JSON.stringify(wrapped));
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
        // Surface to caller; the app should catch this and show a toast.
        throw new Error("Speicher voll. Bitte exportiere & lösche alte Daten.");
      }
      throw e;
    }
  }

  function remove(key) {
    backend.removeItem(key);
  }

  return { read, write, remove };
}
