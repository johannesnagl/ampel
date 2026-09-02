// src/rules/cheatSnack.js
//
// No-Go 4 aus dem Masterpost: „Cheat + zusätzlicher Snack obendrauf“
// (z. B. Pizza, danach noch Riegel/Süßes).
//
// Es geht ausdrücklich um das ZUSÄTZLICHE. Ist der Snack selbst der Cheat,
// liegt kein „obendrauf“ vor — dann darf sich die Regel nicht gegen ihn
// selbst richten. Deshalb wird ein nicht-grüner Snack nur gemeldet, wenn in
// einem ANDEREN Slot ein 🔴 liegt.
//
// Dessert-Slots sind keine Snacks: Ein Dessert ist laut Masterpost §12 eine
// eigene Komponente mit eigener Ampelfarbe und kommt planmäßig zu einer
// Hauptmahlzeit dazu. Es löst die Regel als Cheat-Quelle aus, wird aber
// selbst nie als regelwidriger Snack gemeldet.

export function checkCheatSnackPolicy(day, date, dishes, slotsPerDay) {
  const byId = new Map(dishes.map((d) => [d.id, d]));

  // Slot-Indizes, in denen ein 🔴 liegt
  const cheatIdx = [];
  for (let i = 0; i < day.slots.length; i++) {
    const id = day.slots[i].dishId;
    if (!id) continue;
    const d = byId.get(id);
    if (d && d.category === "red") cheatIdx.push(i);
  }
  if (cheatIdx.length === 0) return [];

  const warnings = [];
  for (let i = 0; i < day.slots.length; i++) {
    // Settings ist maßgeblich für den Slot-Typ — slot.type kann veraltet
    // sein, wenn die Slot-Konfiguration nach dem Anlegen geändert wurde.
    const slotType = slotsPerDay?.[i]?.type ?? day.slots[i].type;
    if (slotType !== "snack") continue;
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category === "green") continue;
    // Der Cheat muss woanders liegen, sonst meldet die Regel sich selbst.
    if (!cheatIdx.some((c) => c !== i)) continue;
    warnings.push({
      severity: "warn",
      ruleId: "no-cheat-plus-extra-snack",
      where: { date, slotIndex: i },
      message: "Genuss-Tag: Snacks sollten grün sein",
    });
  }
  return warnings;
}
