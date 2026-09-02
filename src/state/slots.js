// src/state/slots.js
//
// Gleicht die gespeicherten Slots eines Tages gegen die aktuelle
// Slot-Konfiguration aus den Settings ab.

export function normalizeSlots(existingSlots, slotsPerDay) {
  const take = (cfg, existing) => ({
    type: cfg.type,
    dishId: existing?.dishId ?? null,
    loggedAt: existing?.loggedAt ?? null,
    note: existing?.note ?? "",
  });

  // Gleiche Slot-Anzahl → Zuordnung über den Index. Das ist der Fall
  // "Nutzer hat den Typ eines Slots geändert": Das geplante Gericht soll im
  // Slot bleiben, nur der Typ wechselt.
  if (existingSlots.length === slotsPerDay.length) {
    return slotsPerDay.map((cfg, i) => take(cfg, existingSlots[i]));
  }

  // Unterschiedliche Anzahl → über den Typ ausrichten statt stur nach Index.
  // Sonst verschiebt ein mittendrin eingefügter Slot (die Dessert-Slots hinter
  // Mittag und Abend) alle folgenden Gerichte um eine Position und das letzte
  // fällt hinten raus. Zwei Zeiger: Der alte Zeiger rückt nur vor, wenn der
  // alte Slot typgleich verbraucht wurde.
  const out = [];
  let o = 0;
  for (const cfg of slotsPerDay) {
    if (o < existingSlots.length && existingSlots[o].type === cfg.type) {
      out.push(take(cfg, existingSlots[o]));
      o += 1;
    } else {
      out.push(take(cfg, null)); // neuer Slot: leer, alten Zeiger halten
    }
  }
  return out;
}
