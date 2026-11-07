#!/usr/bin/env python3
"""
Prepare Tajawal for the car's old Opera (Presto) browser.

From src/fonts/Tajawal-{Light,Medium,Bold}.ttf this writes
installer/home2/fonts/Home2Tajawal-{Light,Medium,Bold}.ttf with:

1. Unique family names ("Home2 Tajawal Light" / "Medium" / "Bold"), one face each,
   so the browser never has to match weights inside a family.
2. Arabic presentation forms (U+FB50-FDFF, U+FE70-FEFF) added to the character map.
   Old engines often shape Arabic themselves and then look up these codepoints; Tajawal
   only maps some of them, which makes the engine fall back to another font. Each form
   is pointed at the glyph HarfBuzz picks for that letter in that position.
3. An empty, zero-width glyph for characters that never draw anything (emoji variation selectors, joiners,
   direction marks), so a name like "♥️" doesn't show a missing-glyph square.

Tajawal is under the SIL Open Font License 1.1 with no Reserved Font Name, so modified
copies may keep a name containing "Tajawal". Requires: fonttools, uharfbuzz
"""
import os
import unicodedata

import uharfbuzz as hb
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "fonts")
OUT = os.path.join(ROOT, "installer", "home2", "fonts")
ZWJ = "‍"
FORMS = {"<isolated>": ("", ""), "<initial>": ("", ZWJ), "<medial>": (ZWJ, ZWJ), "<final>": (ZWJ, "")}


def shape(hb_font, text):
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {})
    return [i.codepoint for i in buf.glyph_infos]


def add_presentation_forms(path, tt):
    blob = hb.Blob.from_file_path(path)
    hb_font = hb.Font(hb.Face(blob))
    order = tt.getGlyphOrder()
    zwj_gid = None
    cmap = tt.getBestCmap()
    if 0x200D in cmap:
        zwj_gid = tt.getGlyphID(cmap[0x200D])
    added = 0
    new = {}
    for cp in list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFF00)):
        if cp in cmap:
            continue
        try:
            decomp = unicodedata.decomposition(chr(cp)).split()
        except ValueError:
            continue
        if not decomp or decomp[0] not in FORMS:
            continue
        base = "".join(chr(int(h, 16)) for h in decomp[1:])
        pre, post = FORMS[decomp[0]]
        gids = [g for g in shape(hb_font, pre + base + post) if g != zwj_gid and g != 0]
        if len(gids) == 1:
            new[cp] = order[gids[0]]
            added += 1
    # Isolated / medial forms of the harakat (diacritics, e.g. the shadda in "وصّل")
    # are the same marks as their base characters.
    marks = {0xFE70: 0x064B, 0xFE72: 0x064C, 0xFE74: 0x064D, 0xFE76: 0x064E, 0xFE77: 0x064E,
             0xFE78: 0x064F, 0xFE79: 0x064F, 0xFE7A: 0x0650, 0xFE7B: 0x0650, 0xFE7C: 0x0651,
             0xFE7D: 0x0651, 0xFE7E: 0x0652, 0xFE7F: 0x0652}
    for cp, base in marks.items():
        if cp not in cmap and cp not in new and base in cmap:
            new[cp] = cmap[base]
            added += 1
    for table in tt["cmap"].tables:
        if table.isUnicode():
            table.cmap.update(new)
    return added


# Characters that never draw anything: emoji variation selectors (the U+FE0F after a heart in "♥️"), joiners,
# direction marks, BOM. Tajawal has none of them, so Presto drew its missing-glyph square ("♥ ☐").
INVISIBLE = (list(range(0x200B, 0x2010)) + list(range(0x202A, 0x202F)) + list(range(0x2060, 0x2065)) +
             list(range(0x2066, 0x206A)) + list(range(0xFE00, 0xFE10)) + [0x061C, 0xFEFF])


def add_invisibles(tt):
    """Map the INVISIBLE characters to one new empty glyph with no width."""
    name = "home2zerowidth"
    order = tt.getGlyphOrder()
    if name not in order:
        from fontTools.ttLib.tables._g_l_y_f import Glyph
        tt.setGlyphOrder(order + [name])
        tt["glyf"].glyphs[name] = Glyph()
        tt["glyf"].glyphOrder = tt.getGlyphOrder()
        tt["hmtx"].metrics[name] = (0, 0)
        tt["maxp"].numGlyphs = len(tt.getGlyphOrder())
    cmap = tt.getBestCmap()
    new = {cp: name for cp in INVISIBLE if cp not in cmap}
    for table in tt["cmap"].tables:
        if table.isUnicode() and table.format != 14:
            table.cmap.update(new)
    return len(new)


def set_names(tt, family, sub, ps):
    name = tt["name"]
    for rec in list(name.names):
        if rec.nameID in (16, 17, 21, 22):
            name.removeNames(nameID=rec.nameID)
    full = family
    for nid, val in ((1, family), (2, sub), (3, ps + ";home2"), (4, full), (6, ps)):
        name.setName(val, nid, 3, 1, 0x409)
        name.setName(val, nid, 1, 0, 0)


def main():
    os.makedirs(OUT, exist_ok=True)
    for weight in ("Light", "Medium", "Bold"):
        src = os.path.join(SRC, "Tajawal-%s.ttf" % weight)
        tt = TTFont(src)
        added = add_presentation_forms(src, tt)
        invisible = add_invisibles(tt)
        family = "Home2 Tajawal %s" % weight
        sub = "Bold" if weight == "Bold" else "Regular"
        set_names(tt, family, sub, "Home2Tajawal-%s" % weight)
        out = os.path.join(OUT, "Home2Tajawal-%s.ttf" % weight)
        tt.save(out)
        cmap = TTFont(out).getBestCmap()
        pf = sum(1 for u in list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFF00)) if u in cmap)
        print("%s: +%d presentation forms (now %d), +%d invisible characters, family '%s'" % (
            os.path.basename(out), added, pf, invisible, family))


if __name__ == "__main__":
    main()
