#!/usr/bin/env python3
"""
Read Mazda's navigation skin from an extracted firmware and write tools/nav_skin_table.json:
the size, number of states (frames) and what each state shows for every navigation image
Home 2.0 redraws. tools/build_nav_skin.py draws our images from that table, so the repo never
needs Mazda's files.

Usage:  python3 tools/extract_nav_table.py <extracted rootfs>/jci/nng

The navigation (NNG, firmware 74) loads its skin from /jci/nng/ux/_skin_jci_mazda.zip
(ui_jci_mazda/800_480/*.bmp, mostly NNG's own "RL" format, decoded by tools/nng_rl.py) and its
layout from data.zip and the other ux/*.zip plug-ins (.ui/.css files that name each image as
"name.bmp#<states>").
"""
import io
import json
import os
import re
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nng_rl  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "nav_skin_table.json")
SKIN_DIR = "ui_jci_mazda/800_480/"

# What we redraw: the map's bottom menu (bar, buttons, dividers, icons, tooltip),
# the cockpit panels on the left of the map and the speed-limit sign.
TARGETS = re.compile(r"^(btn_cockpitmenu.*|ico_CM_.*|spr_cockpitMenuBG|spr_floating_divider|mapmenupopup(_leg)?|"
                     r"cockpit_bg|cockpit_bg_straight|cockpit_bg_straight_overspeed|cockpit_separator_line|"
                     r"spr_speedlimit_eu|btn_openpanel)\.bmp$")


def frame_counts(nng):
    """name.bmp -> number of states, from every "name.bmp#n" in the layout files."""
    counts = {}
    zips = [os.path.join(nng, "data.zip")] + [os.path.join(nng, "ux", z) for z in sorted(os.listdir(os.path.join(nng, "ux")))
                                              if z.endswith(".zip")]
    for zp in zips:
        with zipfile.ZipFile(zp) as z:
            for n in z.namelist():
                if not re.search(r"\.(ui|css|lua)$", n):
                    continue
                text = z.read(n).decode("latin-1")
                for name, k in re.findall(r"([A-Za-z0-9_\-]+\.bmp)#(\d+)", text):
                    counts[name] = max(counts.get(name, 1), int(k))
    return counts


# Heights of one state: the bar buttons are 87px per state, the menu icons 50px. Their "#4" / "#8" is
# built in Lua (floating_menu.lua), so it is not in the layout files as text.
STATE_HEIGHT = (("btn_cockpitmenu", 87), ("ico_CM_", 50))


def classify(img, frames):
    """What each state shows: empty, or the colour family of its saturated pixels
    (Mazda: orange = pressed, red = focus, yellow = over the speed limit)."""
    import colorsys
    w, h = img.size
    fh = h // frames
    states = []
    for f in range(frames):
        crop = img.crop((0, f * fh, w, (f + 1) * fh))
        px = [p for p in list(crop.getdata()) if p[3] > 24]
        box = crop.getbbox()
        if len(px) < 4:
            states.append({"kind": "empty", "box": None})
            continue
        hues = []
        for r, g, b, a in px:
            hh, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            if s > 0.45 and v > 0.3:
                hues.append(hh * 360)
        if len(hues) < len(px) * 0.15:
            kind = "neutral"
        else:
            hues.sort()
            m = hues[len(hues) // 2]
            kind = "red" if (m < 16 or m > 340) else ("orange" if m < 45 else ("yellow" if m < 70 else "neutral"))
        states.append({"kind": kind, "box": list(box) if box else None})
    return states


def main(nng):
    counts = frame_counts(nng)
    table = {}
    with zipfile.ZipFile(os.path.join(nng, "ux", "_skin_jci_mazda.zip")) as z:
        for n in sorted(z.namelist()):
            if not n.startswith(SKIN_DIR):
                continue
            name = n[len(SKIN_DIR):]
            if not TARGETS.match(name):
                continue
            data = z.read(n)
            w, h = (int.from_bytes(data[4:6], "little"), int.from_bytes(data[6:8], "little")) if data[:2] == b"RL" else (None, None)
            frames = counts.get(name, 1)
            for prefix, sh in STATE_HEIGHT:
                if name.startswith(prefix) and h and h % sh == 0:
                    frames = h // sh
            entry = {"frames": frames}
            try:
                img = nng_rl.load_bytes(data)
                entry["size"] = list(img.size)
                entry["states"] = classify(img, frames)
            except ValueError:
                # A few large RL files use a variant the decoder does not read; their size is in the header.
                entry["size"] = [w, h]
                entry["states"] = None
            table[name] = entry
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(table, f, indent=1, sort_keys=True)
        f.write("\n")
    print("wrote %s (%d images)" % (OUT, len(table)))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
