import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../../src/state/storage.js";

function memStore() {
  const m = new Map();
  return {
    getItem: (k) => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _raw: m,
  };
}

test("read returns null when key absent", () => {
  const s = makeStorage(memStore());
  assert.equal(s.read("missing"), null);
});

test("write/read round-trips data", () => {
  const s = makeStorage(memStore());
  s.write("foo", { hello: "world" }, 1);
  assert.deepEqual(s.read("foo"), { hello: "world" });
});

test("write wraps with schemaVersion", () => {
  const store = memStore();
  const s = makeStorage(store);
  s.write("foo", { x: 1 }, 2);
  const raw = JSON.parse(store.getItem("foo"));
  assert.equal(raw.schemaVersion, 2);
  assert.deepEqual(raw.data, { x: 1 });
});

test("read at older schemaVersion runs migration", () => {
  const store = memStore();
  store.setItem("foo", JSON.stringify({ schemaVersion: 1, data: { x: 1 } }));
  const s = makeStorage(store, {
    foo: {
      currentVersion: 2,
      migrate: { 1: (d) => ({ x: d.x, y: 0 }) },
    },
  });
  assert.deepEqual(s.read("foo"), { x: 1, y: 0 });
});

test("read at unknown schemaVersion returns null", () => {
  const store = memStore();
  store.setItem("foo", JSON.stringify({ schemaVersion: 99, data: { x: 1 } }));
  const s = makeStorage(store, {
    foo: { currentVersion: 1, migrate: {} },
  });
  assert.equal(s.read("foo"), null);
});

test("remove deletes the key", () => {
  const s = makeStorage(memStore());
  s.write("foo", { x: 1 }, 1);
  s.remove("foo");
  assert.equal(s.read("foo"), null);
});
