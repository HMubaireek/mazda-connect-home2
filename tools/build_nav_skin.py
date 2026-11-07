#!/usr/bin/env python3
"""
Draw the Home 2.0 "Glass Dock" navigation skin (design S, Round 10 on the design canvas).

Reads tools/nav_skin_table.json (sizes and states of Mazda's navigation images, from
tools/extract_nav_table.py) and writes our replacements, same names and sizes, as 32-bit BMPs to
installer/home2/nav/ui_jci_mazda/800_480/. On the car, run.sh adds them to a copy of
/jci/nng/ux/_skin_jci_mazda.zip; Mazda's own images are never shipped.

What changes (images only, Mazda's layout files stay as they are):
  - the curved black bar under the map menu -> one rounded glass dock (24px side margin, like the menus)
  - Mazda's red focus block and orange pressed block -> a blue-gradient pill inside the dock
  - the silver chrome icons -> our flat line icons (white; ember for an active map mode)
  - the divider lines, the tooltip above the focused button, the side panel and the panel behind the
    speed-limit sign -> dark glass
  - the speed-limit sign -> a clean flat sign (white disc, red ring; red disc when over the limit)
  - list screens (map settings, search): rows on one dark glass panel with thin dividers, a blue
    full-width focus pill instead of the red bar, a round 48px back button instead of the chevron
    column, a thin scroll bar instead of the red/white rails (all drawn symmetric, so they still fit
    when the lists are laid out right to left)

It also writes, for data.zip (applied on the car by run.sh to Mazda's own files):
  installer/home2/nav/data/colors_day.txt, colors_night.txt   the Midnight map colours: whole lines that
      replace the lines with the same key in the [color] section of scheme/<day|night>/color.ini
      (made from tools/nav_colors_orig.json, Mazda's lines for those keys, with our colour numbers)

Requires: Pillow, cairosvg
"""
import io
import json
import os
import struct
import sys

import cairosvg
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skin_icons import CIRCLE, GEAR, INFO, MAP, PIN, CW, CAR  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLE = os.path.join(ROOT, "tools", "nav_skin_table.json")
OUT = os.path.join(ROOT, "installer", "home2", "nav", "ui_jci_mazda", "800_480")
MARKER_FILE = os.path.join(ROOT, "installer", "home2", "nav", "home2_nav.txt")
COLORS_ORIG = os.path.join(ROOT, "tools", "nav_colors_orig.json")
DATA_OUT = os.path.join(ROOT, "installer", "home2", "nav", "data")

# ---------------------------------------------------------------- map colours (Midnight)
# Key -> colour (or two colours for keys with a fill and an outline value). Road keys: lower case = the
# road's inside, upper case = its edge; 0/1 = main roads, 4-12 = smaller roads, r = freeway.
_NIGHT_ROADS = {
    "r": (255, 181, 71), "R": (92, 62, 22),                       # freeways: ember
    "a": (132, 150, 206), "c": (132, 150, 206), "d": (132, 150, 206), "e": (100, 116, 172),
    "g": (74, 88, 136), "h": (74, 88, 136), "i": (58, 68, 108), "k": (58, 68, 108), "l": (58, 68, 108),
    "u": (48, 57, 92), "s": (44, 50, 72), "x": (44, 50, 72), "z": (40, 46, 68),
    "b": (70, 92, 156), "f": (70, 92, 156), "j": (70, 92, 156), "v": (70, 92, 156), "q": (70, 92, 156),
    "B": (26, 34, 64), "F": (26, 34, 64), "J": (26, 34, 64), "V": (26, 34, 64), "Q": (26, 34, 64),
}
for _k in "ACDEGHIKLUSXZ":
    _NIGHT_ROADS[_k] = (16, 20, 34)                              # dark edges keep the roads crisp

PALETTES = {
    "night": dict(_NIGHT_ROADS, **{
        "0": (11, 14, 25), "5": (13, 34, 58),                     # ground, water
        "1": (86, 72, 120), "2": (70, 62, 100), "3": (52, 48, 78), "4": (52, 48, 78),
        "salt_water": (13, 34, 58), "sweet_water": (13, 34, 58), "intermittent_water": (16, 38, 62),
        "National_Park": (14, 34, 31), "city_forest": (14, 34, 31), "city_park": (14, 34, 31),
        "state_forest": (14, 34, 31), "recreational_area": (14, 32, 30),
        "building": (26, 31, 50), "built_up": (17, 21, 36), "built_up_border": (9, 11, 20),
        "Partition_area": (17, 21, 36), "industrial_area": (20, 24, 38), "Shopping_Center_Ground": (20, 24, 38),
        "cemetery_ground": (20, 24, 38), "airport_ground": (24, 28, 44), "airport_runway": (40, 46, 70),
        "Railway_area": (22, 26, 40), "area_a": (16, 19, 32), "area_b": (20, 24, 40), "area_c": (24, 28, 46),
        "railway": ((90, 100, 140), (30, 35, 55)),
        "planned_road": (108, 139, 255), "planned_road_ext": (58, 63, 224),          # the route: Ember blue
        "planned_road_future": (108, 139, 255), "planned_road_future_ext": (58, 63, 224),
        "planned_road_visited": (70, 80, 140), "planned_road_visited_ext": (40, 45, 90),
        "guidancestrip_ext": (58, 63, 224), "guidancestripalt_ext": (58, 63, 224),
        "international_border": (96, 76, 130), "political_border": (76, 64, 108), "region_border": (54, 48, 80),
        "label_road": (206, 214, 236), "label_roadlt": (140, 150, 182), "label_road_bubble": (206, 214, 236),
        "roadlabel_frame": (58, 63, 224), "roadlabel_stick": (58, 63, 224), "box_fill": (58, 63, 224),
        "3d_sky": (8, 10, 20), "hazecolor": (18, 24, 48),
        "3d_building_color": (40, 48, 78), "3d_building_roof": (54, 64, 100), "3d_building_outline_color": (20, 24, 40),
        "3d_faded_building_body": (34, 40, 64), "3d_grass": (14, 34, 31),
        "zoomcolor1": (20, 24, 40), "zoomcolor2": (58, 68, 108),
        "oneway_arrow": (150, 165, 210), "tunnel_overview_main_road": (255, 181, 71),
    }),
}

# Day: the same Midnight look, a touch brighter so it reads in sunlight (Mazda's day map is grey and white).
_DAY_ROADS = {k: tuple(min(255, int(c * 1.18 + 6)) for c in v) if k.islower() and k != "r" else v
              for k, v in _NIGHT_ROADS.items()}
_DAY_ROADS.update({"r": (255, 186, 80), "R": (110, 74, 26)})
for _k in "ACDEGHIKLUSXZ":
    _DAY_ROADS[_k] = (22, 27, 44)
PALETTES["day"] = dict(PALETTES["night"], **_DAY_ROADS)
PALETTES["day"].update({
    "0": (20, 25, 42), "5": (20, 48, 80), "salt_water": (20, 48, 80), "sweet_water": (20, 48, 80),
    "intermittent_water": (24, 52, 84), "built_up": (25, 31, 50), "building": (34, 41, 64), "area_a": (24, 29, 46),
    "area_b": (28, 34, 54), "area_c": (32, 38, 60), "Partition_area": (25, 31, 50), "National_Park": (20, 46, 42),
    "city_park": (20, 46, 42), "city_forest": (20, 46, 42), "state_forest": (20, 46, 42),
    "3d_sky": (36, 44, 72), "hazecolor": (40, 52, 90), "label_road": (226, 232, 248), "label_settlements": (255, 255, 255),
    "label_roadlt": (160, 170, 200), "zoomcolor1": (20, 25, 42), "zoomcolor2": (226, 232, 248),
})

BLUE = '<linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C8BFF"/><stop offset="1" stop-color="#3A3FE0"/></linearGradient>'
GLASS_FILL = "rgb(14,17,30)"     # dark glass over the map
GLASS_A = 0.74
POPUP_FILL = "rgb(22,26,44)"
EMBER = "#FFB547"

# Geometry of the map menu (screen y): the panel starts at y 384 (80% of 480); the bar background is
# drawn from its top, the 87px buttons and the 83px dividers sit on its bottom edge (y 393 / 397 .. 480).
DOCK_TOP, DOCK_BOTTOM, DOCK_X0, DOCK_X1, DOCK_R = 398, 474, 24, 776, 26
BG_TOP = 384
BTN_TOP = 393
PILL_TOP, PILL_H, PILL_R, PILL_INSET = 408, 56, 18, 24


def svg_canvas(w, h, body, scale=4):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d"><defs>%s</defs>%s</svg>'
           % (w * scale, h * scale, w, h, BLUE, body))
    big = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=w * scale, output_height=h * scale)
    return Image.open(io.BytesIO(big)).convert("RGBA").resize((w, h), Image.LANCZOS)


def write_bmp(img, path):
    """32-bit BGRA bitmap, straight alpha, bottom-up: the same layout as Mazda's BM skin images
    (cursor.bmp, direct.bmp...), which the navigation already loads."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.tobytes("raw", "BGRA")
    rows = [px[y * w * 4:(y + 1) * w * 4] for y in range(h)][::-1]
    data = b"".join(rows)
    header = struct.pack("<2sIHHI", b"BM", 54 + len(data) + 2, 0, 0, 54)
    info = struct.pack("<IiiHHIIiiII", 40, w, h, 1, 32, 0, len(data), 2834, 2834, 0, 0)
    with open(path, "wb") as f:
        f.write(header + info + data + b"\0\0")


def rrect(x, y, w, h, r, fill, opacity=1.0, stroke=None, stroke_opacity=0.0):
    s = '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" fill-opacity="%s"' % (x, y, w, h, r, fill, opacity)
    if stroke:
        s += ' stroke="%s" stroke-opacity="%s" stroke-width="1"' % (stroke, stroke_opacity)
    return s + "/>"


def glass(x, y, w, h, r, opacity=GLASS_A, border=0.16):
    """Dark glass with a faint top sheen and a thin light edge."""
    sheen = ('<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.07"/>'
             '<stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>')
    return ('<defs>%s</defs>' % sheen + rrect(x, y, w, h, r, GLASS_FILL, opacity) +
            rrect(x + 0.5, y + 0.5, w - 1, h - 1, r, "url(#sh)", 1, "#FFFFFF", border))


# ---------------------------------------------------------------- map menu icons (ico_CM_*, 4 states)
FLAG = "M5 21V3 M5 4h11l-2.5 4L16 12H5z"
ICON_PATHS = {
    "closepanel": CIRCLE + " M8 12.5l2.8 2.8L16 9.8",
    "closepanel_ER": CIRCLE + " M8 12.5l2.8 2.8L16 9.8",
    "openpanel": CIRCLE + " M8 14l4-4 4 4",
    "select": "M4 12.5l5 5L20 6.5",
    "Select": "M4 12.5l5 5L20 6.5",
    "cancel": "M6 6l12 12 M18 6L6 18",
    "up": "M5 16l7-8 7 8",
    "down": "M5 8l7 8 7-8",
    "findplace": PIN,
    "navigationinfo": INFO,
    "newroute": FLAG + " M18 15v6 M15 18h6",
    "stopnavigation": FLAG + " M16 16l5 5 M21 16l-5 5",
    "routemenu": "M8 19a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M20 5a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16",
    "settings": GEAR,
    "browsemap": MAP,
    "PointInfo": "M12 2v4 M12 18v4 M2 12h4 M18 12h4 M17 12a5 5 0 1 1-10 0a5 5 0 1 1 10 0",
    "RecenterMap": "M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M12 7l4 9-4-2-4 2z",
    "Rotate": CW,
    "Tilt": "M8 5h8l5 14H3z M12 5v14 M5.5 12h13",
    "Zoom": "M11 18a7 7 0 1 1 0-14a7 7 0 0 1 0 14z M21 21l-5-5 M8 11h6 M11 8v6",
    "repeatguidance": "M11 5L6 9H2v6h4l5 4z M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14",
    "traffic": CAR,
}
ICON_TEXT = {"2D": "2D", "3D": "3D", "Northup": "2D"}


def icon_body(key, colour, opacity):
    if key in ICON_TEXT:
        t = ('<text x="12" y="17" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" '
             'font-weight="bold" fill="%s" fill-opacity="%s">%s</text>') % (colour, opacity, ICON_TEXT[key])
        if key == "Northup":   # 2D with north up: a small ember north mark above
            t = t.replace('y="17"', 'y="20.5"') + '<path d="M12 0.5l3 4.2H9z" fill="%s" fill-opacity="%s"/>' % (EMBER, opacity)
        return t
    return ('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round"/>') % (ICON_PATHS[key], colour, opacity)


def draw_icon(name, e):
    w, h = e["size"]
    fh = h // e["frames"]
    key = name[len("ico_CM_"):-4]
    if key not in ICON_PATHS and key not in ICON_TEXT:
        return None
    states = e["states"] or [{"kind": "neutral"}] * e["frames"]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = 30.0  # glyph size in the 50px state
    for f in range(e["frames"]):
        colour, op = "#FFFFFF", 0.95
        if f == 2:
            op = 0.32                      # disabled
        if f == 1 and states[f]["kind"] in ("red", "orange"):
            colour, op = EMBER, 1.0        # map mode switched on (Mazda drew it red)
        body = '<g transform="translate(%s %s) scale(%s)">%s</g>' % ((w - g) / 2.0, (fh - g) / 2.0, g / 24.0, icon_body(key, colour, op))
        img.alpha_composite(svg_canvas(w, fh, body), (0, f * fh))
    return img


# ---------------------------------------------------------------- bar buttons (btn_cockpitmenu*)
def pill(w, kind):
    """One state of a bar button: the pill sits inside the dock, PILL_INSET from the button's edges, so the
    end buttons stay inside the dock's 24px margin."""
    pw = w - 2 * PILL_INSET
    y = PILL_TOP - BTN_TOP
    if kind == "red":                    # focus (knob or touch): blue gradient
        return rrect(PILL_INSET, y, pw, PILL_H, PILL_R, "url(#blue)")
    if kind == "orange":                 # pressed / selected: soft blue glass
        return (rrect(PILL_INSET, y, pw, PILL_H, PILL_R, "#6C8BFF", 0.30) +
                rrect(PILL_INSET + 0.5, y + 0.5, pw - 1, PILL_H - 1, PILL_R, "none", 1, "#A0B6FF", 0.55))
    return ""


def draw_button(name, e):
    w, h = e["size"]
    frames = e["frames"]
    fh = h // frames
    states = e["states"]
    if states is None:   # not decodable: Mazda's usual order (normal, pressed, disabled, focus)
        states = [{"kind": k} for k in (["empty", "orange", "empty", "red"] * (frames // 4))]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for f, st in enumerate(states):
        kind = st["kind"]
        box = st.get("box")
        if kind == "neutral" and box and (box[3] - box[1]) < 20:
            kind = "empty"               # a stray line in Mazda's image
        body = pill(w, kind) if kind in ("red", "orange") else ""
        if body:
            img.alpha_composite(svg_canvas(w, fh, body), (0, f * fh))
    return img


def draw_openpanel(e):
    """The round button that opens the map menu when it is closed: glass, blue when focused."""
    w, h = e["size"]
    fh = h // e["frames"]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    r = 22
    x, y, pw, ph = (w - 2 * r - 20) / 2.0, fh - 2 * r - 6, 2 * r + 20, 2 * r
    for f, st in enumerate(e["states"]):
        k = st["kind"]
        if k == "red":
            body = rrect(x, y, pw, ph, r, "url(#blue)")
        elif k == "orange":
            body = rrect(x, y, pw, ph, r, "#6C8BFF", 0.30) + rrect(x + 0.5, y + 0.5, pw - 1, ph - 1, r, "none", 1, "#A0B6FF", 0.55)
        else:
            body = glass(x, y, pw, ph, r)
        img.alpha_composite(svg_canvas(w, fh, body), (0, f * fh))
    return img


# ---------------------------------------------------------------- the rest
def draw_other(name, e):
    w, h = e["size"]
    if name == "spr_cockpitMenuBG.bmp":
        y = DOCK_TOP - BG_TOP
        return svg_canvas(w, h, glass(DOCK_X0, y, DOCK_X1 - DOCK_X0, DOCK_BOTTOM - DOCK_TOP, DOCK_R), scale=2)
    if name == "spr_floating_divider.bmp":
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        top = h - (480 - 424)
        for yy in range(top, top + 32):
            img.putpixel((0, yy), (255, 255, 255, 30))
        return img
    if name == "mapmenupopup.bmp":
        return svg_canvas(w, h, rrect(5.5, 5.5, w - 11, h - 11, 26, POPUP_FILL, 0.94, "#FFFFFF", 0.22))
    if name == "mapmenupopup_leg.bmp":
        return svg_canvas(w, h, '<path d="M2 0H34L18 19z" fill="%s" fill-opacity="0.94"/>'
                                '<path d="M2 0.5L18 19L34 0.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="1"/>' % POPUP_FILL)
    if name == "cockpit_bg.bmp":        # the side panel during guidance: dark glass, rounded on the map side
        return svg_canvas(w, h, rrect(-30, 0, w - 6 + 30, h, 24, GLASS_FILL, GLASS_A, "#FFFFFF", 0.14), scale=2)
    if name == "cockpit_bg_straight.bmp":   # stretched behind cockpit boxes (the grey speed-limit box)
        return Image.new("RGBA", (w, h), (14, 17, 30, int(255 * GLASS_A)))
    if name == "cockpit_bg_straight_overspeed.bmp":
        img = Image.new("RGBA", (w, h), (14, 17, 30, int(255 * GLASS_A)))
        for yy in range(h // 2, h):
            for xx in range(w):
                img.putpixel((xx, yy), (255, 181, 71, 150))      # over the limit: ember glass
        return img
    if name == "cockpit_separator_line.bmp":
        return Image.new("RGBA", (w, h), (255, 255, 255, 34))
    if name == "spr_speedlimit_eu.bmp":
        fh = h // e["frames"]
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c, r = w / 2.0, w / 2.0 - 2
        normal = ('<circle cx="%s" cy="%s" r="%s" fill="#FFFFFF"/>' % (c, c, r) +
                  '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#E0402A" stroke-width="6.5"/>' % (c, c, r - 3.25) +
                  '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="1"/>' % (c, c, r + 0.5))
        over = ('<circle cx="%s" cy="%s" r="%s" fill="#E0402A"/>' % (c, c, r) +
                '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>' % (c, c, r - 5) +
                '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="1"/>' % (c, c, r + 0.5))
        img.alpha_composite(svg_canvas(w, fh, normal), (0, 0))
        img.alpha_composite(svg_canvas(w, fh, over), (0, fh))
        return img
    return None


# ---------------------------------------------------------------- list screens (settings, search)
# Screen layout (NNG params.css): back button x 0-94 from y 64; list x 60-800 with 64px rows; scroll bar
# 46px wide, 20px from the right. Row images are 730 wide; everything is drawn symmetric in them so a
# right-to-left list (rows mirrored) still lines up.
ROW_X0 = 50                 # glass panel / focus pill inset in the 730px row (screen x 110 .. 740)
ROW_R = 18
BACK_R = 24                 # the round 48px back button, like the HTML menus (x 24-72)
CHEVRON_BACK = "M14.5 6l-6 6 6 6"
CHEVRON_UP = "M6 14.5l6-6 6 6"


def row_glass(w, fh, divider_top=True):
    s = rrect(ROW_X0, 0, w - 2 * ROW_X0, fh, 0, GLASS_FILL, GLASS_A)
    y = 0.5 if divider_top else fh - 0.5
    s += '<path d="M%s %sH%s" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1"/>' % (ROW_X0 + 16, y, w - ROW_X0 - 16)
    return s


def row_pill(w, fh, kind):
    if kind == "focus":
        return rrect(ROW_X0, 2, w - 2 * ROW_X0, fh - 4, ROW_R, "url(#blue)")
    return (rrect(ROW_X0, 2, w - 2 * ROW_X0, fh - 4, ROW_R, "#6C8BFF", 0.30) +
            rrect(ROW_X0 + 0.5, 2.5, w - 2 * ROW_X0 - 1, fh - 5, ROW_R, "none", 1, "#A0B6FF", 0.55))


def draw_row(name, e):
    w, h = e["size"]
    frames = e["frames"]
    fh = h // frames
    states = e["states"] or [{"kind": "neutral"}] * frames
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for f, st in enumerate(states):
        k = st["kind"]
        if k == "red":
            body = row_pill(w, fh, "focus")
        elif k == "orange":
            body = row_glass(w, fh) + row_pill(w, fh, "pressed")
        elif f in (0, 2) or frames == 1:
            body = row_glass(w, fh, divider_top=(name != "listitem_nofocus.bmp"))
        else:
            body = ""          # the focused state: the focus sprite under the row shows through
        if body:
            img.alpha_composite(svg_canvas(w, fh, body, scale=2), (0, f * fh))
    return img


def draw_focus_bar(e):
    w, h = e["size"]
    return svg_canvas(w, h, row_pill(w, h, "focus"), scale=2)


def back_circle(w, fh, kind, chevron):
    cx, cy = 48, fh / 2.0
    if kind == "focus":
        disc, op = '<circle cx="%s" cy="%s" r="%s" fill="url(#blue)"/>' % (cx, cy, BACK_R), 1.0
    elif kind == "pressed":
        disc, op = ('<circle cx="%s" cy="%s" r="%s" fill="#6C8BFF" fill-opacity="0.30" stroke="#A0B6FF" stroke-opacity="0.55"/>'
                    % (cx, cy, BACK_R - 0.5)), 1.0
    else:
        disc = ('<circle cx="%s" cy="%s" r="%s" fill="%s" fill-opacity="%s" stroke="#FFFFFF" stroke-opacity="0.16"/>'
                % (cx, cy, BACK_R - 0.5, GLASS_FILL, GLASS_A))
        op = 0.35 if kind == "disabled" else 1.0
    icon = ('<g transform="translate(%s %s)"><path d="%s" fill="none" stroke="#FFFFFF" stroke-opacity="%s" stroke-width="2.4" '
            'stroke-linecap="round" stroke-linejoin="round"/></g>') % (cx - 12, cy - 12, chevron, op)
    return disc + icon


def draw_back(name, e):
    w, h = e["size"]
    chevron = CHEVRON_UP if name.startswith("btn_folderUp") else CHEVRON_BACK
    if e["frames"] == 1:                    # the *_fade overlay shown while the button has the focus
        return svg_canvas(w, h, back_circle(w, h, "focus", chevron), scale=2)
    fh = h // e["frames"]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    order = ["normal", "pressed", "disabled", "focus"]
    for f in range(e["frames"]):
        img.alpha_composite(svg_canvas(w, fh, back_circle(w, fh, order[f % 4], chevron), scale=2), (0, f * fh))
    return img


def draw_scroll(name, e):
    """Track: nothing (its image is wider than the scroll bar, so its position is not certain).
    Indicator: a thin 4px light-blue bar in the middle of the scroll bar."""
    w, h = e["size"]
    if "indicator" not in name:
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = w / 2.0 - 2
    return svg_canvas(w, h, rrect(x, 2, 4, h - 4, 2, "#A0B6FF", 0.92), scale=2)


# ---------------------------------------------------------------- data.zip: map colours
def recolor_line(line, colour):
    """Put our colour(s) into one of Mazda's color.ini lines, keeping its label and other numbers.
    Forms: key="label", r,g,b[, n]   key=n, r,g,b[, n]   key=n, r,g,b, r,g,b   key=r,g,b"""
    import re
    key, value = line.split("=", 1)
    labelled = value.lstrip().startswith('"')
    skip = value.index('"', value.index('"') + 1) + 1 if labelled else 0      # numbers after the label
    nums = [m for m in re.finditer(r"-?\d+", value) if m.start() >= skip]
    start = 0 if (labelled or len(nums) == 3) else 1
    colours = colour if isinstance(colour[0], tuple) else (colour,)
    if len(nums) < start + 3 * len(colours):
        raise ValueError("unexpected colour line: %r" % line)
    repl = {}
    for i, c in enumerate(colours):
        for j in range(3):
            repl[start + 3 * i + j] = str(c[j])
    out = value
    for idx in sorted(repl, reverse=True):          # replace from the end so positions stay valid
        m = nums[idx]
        out = out[:m.start()] + repl[idx] + out[m.end():]
    return key + "=" + out


def write_colors():
    orig = json.load(open(COLORS_ORIG, encoding="utf-8"))
    os.makedirs(DATA_OUT, exist_ok=True)
    for scheme, lines in sorted(orig.items()):
        out = []
        for key in sorted(lines):
            out.append(recolor_line(lines[key], PALETTES[scheme][key]))
        with open(os.path.join(DATA_OUT, "colors_%s.txt" % scheme), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(out) + "\n")
    # What run.sh changes in data.zip, and how (applied on the car to Mazda's own files).
    with open(os.path.join(DATA_OUT, "files.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("ui_jci_mazda/scheme/day/color.ini\nui_jci_mazda/scheme/night/color.ini\n"
                "ui_jci_mazda/fonts/jci.vfont\nui_jci_mazda/fonts/jci_sb.vfont\nui_jci_mazda/fonts/jci_bd.vfont\n"
                "ui_jci_mazda/common/ui/jci_mazda.css\n")
    with open(os.path.join(DATA_OUT, "fonts.sed"), "w", encoding="utf-8", newline="\n") as f:
        # Arabic in the map in Tajawal (files in /jci/fonts/navi; NNG finds fonts by file name).
        f.write('s/^AkhbarOTS="/Home2Tajawal-Medium="/\ns/^AkhbarOTS-Bold="/Home2Tajawal-Bold="/\n')
    with open(os.path.join(DATA_OUT, "css.sed"), "w", encoding="utf-8", newline="\n") as f:
        # Lists (settings, search, and the map's bottom bar, also a list) right to left in Arabic.
        f.write("s/^LIST2{/LIST2{ R2L:(%regional.current_language.is_r2l);/\n")
    print("wrote map colours and data.zip edits to", DATA_OUT)


def main():
    table = json.load(open(TABLE, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        os.remove(os.path.join(OUT, old))
    written = []
    for name, e in sorted(table.items()):
        if name.startswith("ico_CM_"):
            img = draw_icon(name, e)
        elif name == "btn_openpanel.bmp":
            img = draw_openpanel(e)
        elif name.startswith("btn_cockpitmenu"):
            img = draw_button(name, e)
        elif name.startswith("btn_back") or name.startswith("btn_folderUp"):
            img = draw_back(name, e)
        elif name.endswith("_focus.bmp") and name.startswith("listitem"):
            img = draw_focus_bar(e)
        elif name.startswith("listitem"):
            img = draw_row(name, e)
        elif name.startswith("scrolltrack") or name.startswith("spr_hscroll"):
            img = draw_scroll(name, e)
        else:
            img = draw_other(name, e)
        if img is None:
            print("kept Mazda's", name)
            continue
        assert list(img.size) == e["size"], (name, img.size, e["size"])
        write_bmp(img, os.path.join(OUT, name))
        written.append(name)
    with open(MARKER_FILE, "w", encoding="utf-8", newline="\n") as f:
        f.write("Home 2.0 navigation skin (Glass Dock): %d images replaced in _skin_jci_mazda.zip; "
                "Midnight map colours, Tajawal and right-to-left lists in data.zip\n" % len(written))
    print("wrote %d navigation images to %s" % (len(written), OUT))
    write_colors()


if __name__ == "__main__":
    main()
