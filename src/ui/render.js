// src/ui/render.js — tiny DOM helpers, no framework
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class")        el.className = v;
    else if (k === "style")   Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "data")    for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else                      el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(parent, ...nodes) {
  clear(parent);
  for (const n of nodes.flat()) {
    // Skip nullish/false children — they shouldn't render as the
    // literal text "null"/"false" via native DOM append().
    if (n == null || n === false) continue;
    parent.append(n);
  }
}
