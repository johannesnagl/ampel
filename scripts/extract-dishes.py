#!/usr/bin/env python3
"""Extract dishes from the Ampelsystem docx into data/dishes.json.

The docx is structured as repeated blocks of:
  Dish name
  Category line (🟢/🟡/🔴 + label)
  Frequency line (👉 Frequenz: ➡️ N x/Woche)

Section headings (e.g. "🟢 FRÜHSTÜCK", "🟡 RISONI") tell us the slot context.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

DOCX = Path("Gerichtepool aktuell_Ampelsystem.docx")
OUT = Path("data/dishes.json")

CAT_GREEN = "green"
CAT_YELLOW = "yellow"
CAT_RED = "red"

# Heuristics for the heavy flag — applied to lowered name + notes.
HEAVY_KEYWORDS = [
    "pizza", "pasta", "risotto", "spätzle", "spaetzle", "gnocchi",
    "schupfnudeln", "kaiserschmarrn", "pfannkuchen", "palatschinken",
    "waffeln", "tagliatelle", "spaghetti", "blätterteig", "fladenbrot",
    "falafel + hummus", "avocado + feta", "süßkartoffel + avocado",
    "mango-kokos", "kürbis-kokos", "einbrenn",
]

# Heuristics for slotTypes. If section heading is "FRÜHSTÜCK" → ["breakfast"].
# "SNACKS" → ["snack"]. Otherwise default to ["lunch", "dinner"]. Salads /
# bowls / wraps without explicit Frühstück context are lunch+dinner.
BREAKFAST_SECTION = re.compile(r"FRÜHSTÜCK", re.I)
SNACK_SECTION    = re.compile(r"SNACKS?", re.I)

CATEGORY_RX = re.compile(r"^(🟢|🟡|🔴)\s*(BASIS|MODERAT|CHEAT|GRÜN|GELB|ROT)?", re.U)
FREQ_RX = re.compile(r"(\d+)\s*[–-]?\s*(\d+)?\s*x\s*[/\\]\s*(Woche|Monat|Tag)", re.I)
NUMBERED_RX = re.compile(r"^\s*\d+\.\s*")
# Section heading patterns to avoid false-positive dish matches
SECTION_LINE_RX = re.compile(r"FRÜHSTÜCK|SNACKS?|GERICHTE|RISONI|GNOCCHI|SUPPEN|WRAPS|HAUPTGERICHTE", re.I)

def kebab(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[äÄ]", "ae", s)
    s = re.sub(r"[öÖ]", "oe", s)
    s = re.sub(r"[üÜ]", "ue", s)
    s = re.sub(r"[ß]", "ss", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def lines_from_docx(path: Path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    paras = re.findall(r"<w:p\b[^>]*>(.*?)</w:p>", xml, re.S)
    out = []
    for p in paras:
        text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
        out.append(text.rstrip())
    return out

def detect_category(line: str):
    if "🟢" in line: return CAT_GREEN
    if "🟡" in line: return CAT_YELLOW
    if "🔴" in line: return CAT_RED
    return None

def detect_frequency(line: str):
    # Handle "alle N–M Monate" pattern (e.g. "alle 1–2 Monate")
    alle_m = re.search(r"alle\s+(\d+)\s*[–-]?\s*(\d+)?\s*(Monate?|Wochen?)", line, re.I)
    if alle_m:
        lo = int(alle_m.group(1))
        hi = int(alle_m.group(2)) if alle_m.group(2) else lo
        unit = alle_m.group(3).lower()
        if "monat" in unit:
            return {"type": "monthly", "max": hi}
        if "woch" in unit:
            return {"type": "weekly", "max": hi}
    # Handle "täglich" / "frei möglich" → treat as daily (max 7/week)
    if re.search(r"täglich|frei möglich", line, re.I):
        return {"type": "weekly", "max": 7}
    m = FREQ_RX.search(line)
    if not m: return None
    lo = int(m.group(1))
    hi = int(m.group(2)) if m.group(2) else lo
    unit = m.group(3).lower()
    if unit.startswith("woch"):
        return {"type": "weekly", "max": hi}
    if unit.startswith("monat"):
        return {"type": "monthly", "max": hi}
    # daily — collapse to weekly
    return {"type": "weekly", "max": hi * 7}

def is_heavy(name: str, notes: str) -> bool:
    blob = f"{name} {notes}".lower()
    return any(k in blob for k in HEAVY_KEYWORDS)

def main():
    lines = lines_from_docx(DOCX)
    dishes = []
    seen_ids = set()
    section_breakfast = False
    section_snack = False

    def flush(name, category, freq, notes_lines, use_breakfast=None, use_snack=None):
        if not name or not category or not freq:
            return
        notes = "\n".join(n for n in notes_lines if n).strip()
        b = section_breakfast if use_breakfast is None else use_breakfast
        s = section_snack if use_snack is None else use_snack
        slot_types = (
            ["breakfast"] if b
            else ["snack"] if s
            else ["lunch", "dinner"]
        )
        base_id = kebab(name)
        dish_id = base_id
        n = 2
        while dish_id in seen_ids:
            dish_id = f"{base_id}-{n}"
            n += 1
        seen_ids.add(dish_id)
        dishes.append({
            "id": dish_id,
            "name": name,
            "category": category,
            "heavy": is_heavy(name, notes) and category != CAT_GREEN,
            "frequency": freq,
            "slotTypes": slot_types,
            "tags": [t for t in re.findall(r"[A-Za-zÄÖÜäöüß]+", name.lower()) if len(t) > 2],
            "notes": notes,
        })

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Section heading detection
        is_section_line = False
        if BREAKFAST_SECTION.search(line):
            section_breakfast, section_snack = True, False
            is_section_line = True
        elif SNACK_SECTION.search(line) and "SNACK" in line.upper():
            section_breakfast, section_snack = False, True
            is_section_line = True
        elif "GERICHTE" in line.upper() and ("KORN" in line.upper() or "WEITERE" in line.upper() or "/" in line):
            section_breakfast, section_snack = False, False
            is_section_line = True

        # Try to read a dish triple: name → category line → freq line
        category = detect_category(line)
        if (not is_section_line and category is None and not NUMBERED_RX.match(line)
                and 3 < len(line) < 80
                and not line.startswith(("👉", "➡️", "❌", "✅", "🎯", "🔥", "🟢", "🟡", "🔴"))):
            # Possible dish name candidate; peek next line
            # Guard: skip if next line is a section heading (not a real category line for a dish)
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                cat_next = detect_category(next_line)
                # Only treat as dish if next line is a color category line but NOT a section heading
                if cat_next and not SECTION_LINE_RX.search(next_line):
                    name = NUMBERED_RX.sub("", line).strip()
                    notes_lines = []
                    cat = cat_next
                    freq = None
                    # Capture current section state for this dish before scanning ahead
                    dish_breakfast = section_breakfast
                    dish_snack = section_snack
                    j = i + 1
                    # collect lines until next dish or section
                    while j < len(lines) and j < i + 10:
                        l = lines[j].strip()
                        # Update section state for section headings encountered in the inner scan
                        if l:
                            if BREAKFAST_SECTION.search(l):
                                section_breakfast, section_snack = True, False
                            elif SNACK_SECTION.search(l) and "SNACK" in l.upper():
                                section_breakfast, section_snack = False, True
                            elif "GERICHTE" in l.upper() and ("KORN" in l.upper() or "WEITERE" in l.upper() or "/" in l):
                                section_breakfast, section_snack = False, False
                        if not freq:
                            f = detect_frequency(l)
                            if f: freq = f
                        if "BASIS" in l.upper() or "MODERAT" in l.upper() or "CHEAT" in l.upper() or detect_category(l):
                            notes_lines.append(l)
                        elif l and not detect_category(l):
                            notes_lines.append(l)
                        j += 1
                        # stop at next dish-name candidate
                        if j < len(lines) and detect_category(lines[j].strip()) is None and 3 < len(lines[j].strip()) < 80 and j + 1 < len(lines) and detect_category(lines[j + 1].strip()):
                            break
                    flush(name, cat, freq, notes_lines, dish_breakfast, dish_snack)
                    i = j
                    continue
        i += 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"version": 1, "dishes": dishes}, ensure_ascii=False, indent=2))
    print(f"Wrote {len(dishes)} dishes → {OUT}")

if __name__ == "__main__":
    main()
