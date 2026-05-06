// src/util/search.js
//
// Free-text search across name, tags, notes. Case-insensitive,
// umlaut-fold (ä→a, ö→o, ü→u, ß→ss) so "kase" matches "Käse".

function fold(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

export function matchDish(dish, query) {
  const q = fold(query).trim();
  if (!q) return true;
  const haystack = fold([dish.name, ...(dish.tags ?? []), dish.notes ?? ""].join(" "));
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
