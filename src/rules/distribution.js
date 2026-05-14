// src/rules/distribution.js
//
// Counts 🟢/🟡/🔴/empty across a week and compares to target ranges from
// the spec (35-meal config).
//
// Note: `inRange` only enforces upper bounds on yellow and red and the
// lower bound implied by yellow's target range. More green than the
// target maximum is always considered fine — the user can always have
// MORE basis meals. This is an intentional asymmetry.

const TARGET_35 = { green: [22, 26], yellow: [7, 10], red: [1, 2] };
const TARGET_42 = { green: [28, 32], yellow: [8, 12], red: [1, 2] };

export function calcDistribution(week, dishes) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let green = 0, yellow = 0, red = 0, empty = 0, total = 0;

  for (const day of Object.values(week.days)) {
    for (const slot of day.slots) {
      total++;
      if (!slot.dishId) { empty++; continue; }
      const dish = byId.get(slot.dishId);
      if (!dish) { empty++; continue; }
      if (dish.category === "green") green++;
      else if (dish.category === "yellow") yellow++;
      else if (dish.category === "red") red++;
    }
  }

  const target = total >= 36 ? TARGET_42 : TARGET_35;
  const inRange =
    green  >= target.green[0] &&
    yellow >= target.yellow[0] - 4 && yellow <= target.yellow[1] + 4 &&
    red    <= target.red[1];

  return { green, yellow, red, empty, target, inRange };
}
