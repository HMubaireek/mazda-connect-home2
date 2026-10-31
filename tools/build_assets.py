#!/usr/bin/env python3
"""
Render the Home 2.0 image assets (Midnight palette).

Outputs to installer/home2/images/home2/:
  bg_ltr.png, bg_rtl.png            800x416 background under Mazda's status bar
  chip_nav/ent/com/set/app.png      56x56 dock icon chips (40px chip)
  row_*.png                         42x42 status-card chips (car, phone, media)
  pill_aa.png, pill_cp.png          35x35 round chips for the Android Auto / CarPlay pill
  ic_park.png, ic_drive.png         18x18 parked / driving icons
and docs/background_full.png (800x480, for the README).

Requires: Pillow, numpy, cairosvg
"""
import io
import os

import cairosvg
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "installer", "home2", "images", "home2")
DOCS = os.path.join(ROOT, "docs")
os.makedirs(OUT, exist_ok=True)
os.makedirs(DOCS, exist_ok=True)

W, H = 800, 480          # full screen
STATUS = 64              # Mazda status bar height

# ---------------------------------------------------------------- background
BASE = (5, 6, 12)
# (x, y, w, h, rgb, alpha) in left-to-right screen coordinates
BLOOMS = [
    (-180, 170, 680, 560, (58, 76, 255), 0.72),
    (420, -240, 620, 540, (20, 190, 200), 0.42),
    (560, 290, 440, 380, (255, 106, 61), 0.30),
]
# light-trail arcs: (x, y, w, h, line width, rgb, alpha, rotation deg)
RIBBONS = [
    (-260, 232, 1320, 560, 1.5, (160, 182, 255), 0.34, -6),
    (-200, 258, 1260, 540, 1.0, (90, 120, 255), 0.20, -6),
]


def over(dst, rgb, alpha):
    """Alpha-composite a solid colour with a per-pixel alpha map onto dst (float HxWx3)."""
    a = alpha[..., None]
    return dst * (1 - a) + np.array(rgb, dtype=np.float64)[None, None, :] * a


def render_background():
    img = np.zeros((H, W, 3), dtype=np.float64) + np.array(BASE, dtype=np.float64)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)

    for (x, y, w, h, rgb, a) in BLOOMS:
        cx, cy = x + w / 2.0, y + h / 2.0
        d = np.sqrt(((xx - cx) / (w / 2.0)) ** 2 + ((yy - cy) / (h / 2.0)) ** 2)
        alpha = (np.clip(1.0 - d, 0, 1) ** 0.85) * a
        img = over(img, rgb, alpha)

    # light-trail arcs, drawn 4x supersampled
    S = 4
    for (x, y, w, h, lw, rgb, a, rot) in RIBBONS:
        layer = Image.new("L", (W * S, H * S), 0)
        from PIL import ImageDraw
        dr = ImageDraw.Draw(layer)
        dr.ellipse([x * S, y * S, (x + w) * S, (y + h) * S], outline=255, width=max(1, int(round(lw * S))))
        arr = np.asarray(layer.resize((W, H), Image.LANCZOS), dtype=np.float64) / 255.0
        # keep only the top part of the ellipse (like a CSS border-top), fading out to the sides
        cx, cy = x + w / 2.0, y + h / 2.0
        ang = np.degrees(np.arctan2(cy - yy, xx - cx))      # 90 = straight up
        fade = np.clip(1.0 - np.abs(ang - 90.0) / 50.0, 0, 1)
        alpha = arr * fade * a
        # rotate around the ellipse centre
        al_img = Image.fromarray((alpha * 255).astype(np.uint8))
        al_img = al_img.rotate(-rot, resample=Image.BICUBIC, center=(cx, cy))
        alpha = np.asarray(al_img, dtype=np.float64) / 255.0
        img = over(img, rgb, alpha)

    # vignette: transparent to 58%, black 0.5 at the edges
    d = np.sqrt(((xx - W / 2.0) / (W * 0.85 / 2.0 * 1.18)) ** 2 + ((yy - H / 2.0) / (H * 0.85 / 2.0 * 1.18)) ** 2)
    v = np.clip((d - 0.62) / (1.0 - 0.62), 0, 1) * 0.4
    img = over(img, (0, 0, 0), v)

    # light dithering to avoid banding on the car display
    rng = np.random.default_rng(7)
    img = img + rng.uniform(-0.8, 0.8, img.shape)
    img = np.clip(np.round(img), 0, 255).astype(np.uint8)

    full = Image.fromarray(img, "RGB")
    full.save(os.path.join(DOCS, "background_full.png"), optimize=True)
    ltr = full.crop((0, STATUS, W, H))
    ltr.save(os.path.join(OUT, "bg_ltr.png"), optimize=True)
    ltr.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(OUT, "bg_rtl.png"), optimize=True)


# ---------------------------------------------------------------- icons
ICONS = {
    "nav": '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    "ent": '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    "com": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    "set": '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7"/>'
           '<line x1="19" y1="12" x2="21.5" y2="12"/><line x1="12" y1="19" x2="12" y2="21.5"/>'
           '<line x1="5" y1="12" x2="2.5" y2="12"/><line x1="12" y1="5" x2="12" y2="2.5"/>'
           '<line x1="16.95" y1="16.95" x2="18.72" y2="18.72"/><line x1="7.05" y1="16.95" x2="5.28" y2="18.72"/>'
           '<line x1="7.05" y1="7.05" x2="5.28" y2="5.28"/><line x1="16.95" y1="7.05" x2="18.72" y2="5.28"/>',
    "app": '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/>'
           '<rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    "aa": '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/>'
          '<polygon points="9.5 13.5 14.5 8.5 13 14.5 11.6 12.6 9.5 13.5"/>',
    "cp": '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>'
          '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    "alert": '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
             '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91'
              'a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    "bt": '<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>',
    "radio": '<rect x="4" y="10" width="16" height="10" rx="2"/><line x1="8" y1="10" x2="17" y2="4"/>'
             '<circle cx="14" cy="15" r="2"/><line x1="7" y1="14" x2="8" y2="14"/>',
    "usb": '<path d="M12 2v14"/><polyline points="8 6 12 2 16 6"/><path d="M7 9v3l5 3 5-3V9"/><circle cx="12" cy="18" r="2"/>',
    "steer": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>'
             '<path d="M2.5 10.5L10 12"/><path d="M21.5 10.5L14 12"/><path d="M12 14v7.5"/>',
    "park": '<circle cx="12" cy="12" r="10"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>',
}

# (gradient start, gradient end) for each chip
CHIP_COLOURS = {
    "nav": ("#3FD9C8", "#168FB3"),
    "ent": ("#FFB547", "#FF6A2E"),
    "com": ("#4AD98B", "#189C5F"),
    "set": ("#9AA0AA", "#5A606B"),
    "app": ("#9B8CFF", "#5B46E6"),
}

BLUE = ("#6C8BFF", "#3A3FE0")
GREEN = ("#4AD98B", "#189C5F")
AMBER = ("#FFC24A", "#E88A12")
ORANGE = ("#FFB547", "#FF6A2E")
BT_BLUE = ("#5B8CFF", "#2F5BD8")

# status-card chips: output name -> (icon, colours or None for the grey "empty" look)
ROW_CHIPS = {
    "ok": ("shield", GREEN), "warn": ("alert", AMBER), "service": ("wrench", AMBER),
    "bt": ("bt", BT_BLUE), "btnone": ("bt", None), "call": ("com", GREEN),
    "radio": ("radio", ORANGE), "usb": ("usb", ORANGE), "btaudio": ("bt", ORANGE),
    "aa": ("aa", ORANGE), "cp": ("cp", ORANGE), "media": ("ent", ORANGE), "off": ("ent", None),
}


def svg_png(svg, size):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                                                    output_width=size, output_height=size))).convert("RGBA")


def chip(name, canvas, chip_size, radius, icon_size, stroke, shadow_rgba, out_name, colours="auto"):
    S = 4  # supersample
    c, cs, r, ic = canvas * S, chip_size * S, radius * S, icon_size * S
    off = (c - cs) // 2
    if colours == "auto":
        colours = CHIP_COLOURS.get(name)
    if colours:
        a, b = colours
        fill = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs>' % (a, b)
        rect = '<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="url(#g)"/>' % (off, off, cs, cs, r)
        icon_colour, icon_alpha = "#FFFFFF", 1.0
    else:
        fill = ""
        rect = '<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="#FFFFFF" fill-opacity="0.08"/>' % (off, off, cs, cs, r)
        icon_colour, icon_alpha = "#FFFFFF", 0.85
    io_ = (c - ic) / 2.0
    icon = ('<g transform="translate(%f %f) scale(%f)" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s" '
            'stroke-linecap="round" stroke-linejoin="round">%s</g>') % (io_, io_, ic / 24.0, icon_colour, icon_alpha, stroke, ICONS[name])
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s%s%s</svg>' % (c, c, c, c, fill, rect, icon)
    top = svg_png(svg, c)

    base = Image.new("RGBA", (c, c), (0, 0, 0, 0))
    if shadow_rgba:
        sh = Image.new("RGBA", (c, c), (0, 0, 0, 0))
        mask = Image.new("L", (c, c), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).rounded_rectangle([off, off + 6 * S, off + cs, off + cs + 6 * S], radius=r, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(9 * S))
        col = Image.new("RGBA", (c, c), shadow_rgba[:3] + (255,))
        sh = Image.composite(col, sh, mask.point(lambda v: int(v * shadow_rgba[3])))
        base = Image.alpha_composite(base, sh)
    base = Image.alpha_composite(base, top)
    base.resize((canvas, canvas), Image.LANCZOS).save(os.path.join(OUT, out_name), optimize=True)


def glyph(name, size, colour, opacity, out_name):
    """A bare line icon (no chip), e.g. the parked / driving icons."""
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="%s" '
           'stroke-opacity="%s" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg>') % (
        size * 4, size * 4, colour, opacity, ICONS[name])
    svg_png(svg, size * 4).resize((size, size), Image.LANCZOS).save(os.path.join(OUT, out_name), optimize=True)


if __name__ == "__main__":
    render_background()
    for k in ("nav", "ent", "com", "set", "app"):
        chip(k, 56, 40, 13, 22, 2.0, None, "chip_%s.png" % k)
    for out, (icon, colours) in ROW_CHIPS.items():
        chip(icon, 42, 42, 14, 22, 2.0, None, "row_%s.png" % out, colours)
    chip("aa", 35, 35, 17.5, 19, 2.0, None, "pill_aa.png", BLUE)
    chip("cp", 35, 35, 17.5, 19, 2.0, None, "pill_cp.png", BLUE)
    glyph("park", 18, "#FFFFFF", 0.75, "ic_park.png")
    glyph("steer", 18, "#A9BCFF", 1.0, "ic_drive.png")
    print("assets written to", OUT)


# ---------------------------------------------------------------- system skin (top bar, alerts, menus)
# Used by src/skin/common_rtl.css, installed to /jci/gui/common/images/home2skin/.
SKIN = os.path.join(ROOT, "installer", "home2", "skin", "images", "home2skin")
WHITE = "#FFFFFF"


def svg_canvas(w, h, body, scale=4):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s</svg>'
           % (w * scale, h * scale, w, h, body))
    big = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=w * scale, output_height=h * scale)
    return Image.open(io.BytesIO(big)).convert("RGBA").resize((w, h), Image.LANCZOS)


def sb_icon(out_name, body):
    """A 37x29 status-bar icon (same size as Mazda's IcnSb*.png): a 24px glyph centred."""
    g = '<g transform="translate(6.5 2.5)" stroke-linecap="round" stroke-linejoin="round">%s</g>' % body
    svg_canvas(37, 29, g).save(os.path.join(SKIN, out_name), optimize=True)


def stroke(d, colour=WHITE, opacity=0.92, width=1.8):
    return '<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (d, colour, opacity, width)


def fill(d, colour=WHITE, opacity=0.92):
    return '<path d="%s" fill="%s" fill-opacity="%s"/>' % (d, colour, opacity)


def rbar(x, y, w, h, lit):
    return '<rect x="%s" y="%s" width="%s" height="%s" rx="1" fill="#FFFFFF" fill-opacity="%s"/>' % (x, y, w, h, 0.92 if lit else 0.28)


def render_status_icons():
    # Phone signal: five bars, 00 = none received.
    for level in range(6):
        bars = "".join(rbar(2 + i * 4.2, 18 - (i + 1) * 3.2, 3, (i + 1) * 3.2 + 2.5, i < level) for i in range(5))
        sb_icon("sb_signal_%02d.png" % level, bars)
    # Battery: rounded outline with a fill level; empty is red.
    for level in range(6):
        colour = "#FF6B5E" if level <= 1 else WHITE
        body = stroke("M2.5 9a2.5 2.5 0 0 1 2.5-2.5h12A2.5 2.5 0 0 1 19.5 9v6a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 15z", colour)
        body += fill("M21.3 10.5a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-.8.8z", colour)
        if level:
            body += '<rect x="5" y="9" width="%.1f" height="6" rx="1" fill="%s" fill-opacity="0.92"/>' % (12.0 * level / 5, colour)
        sb_icon("sb_batt_%02d.png" % level, body)
    # Wi-Fi: dot + two arcs.
    arcs = ["M7.5 13.8a6.5 6.5 0 0 1 9 0", "M4.5 10.5a11 11 0 0 1 15 0"]
    for level in range(5):
        lit = min(level, 3)
        body = fill("M12 16.5a2 2 0 1 1 0 4a2 2 0 1 1 0-4", WHITE, 0.92 if lit >= 1 else 0.28)
        for i, a in enumerate(arcs):
            body += stroke(a, WHITE, 0.92 if lit >= i + 2 else 0.28, 2)
        for suffix in ("", "_active"):
            sb_icon("sb_wifi_%02d%s.png" % (level, suffix), body)
    bt = "M7 7.5l10 9-5 4.5V3l5 4.5-10 9"
    sb_icon("sb_bt.png", stroke(bt))
    sb_icon("sb_bt_ds.png", stroke(bt, WHITE, 0.35))
    sb_icon("sb_msg.png", stroke("M4 6.5A2.5 2.5 0 0 1 6.5 4H14 M20 10v4.5a2.5 2.5 0 0 1-2.5 2.5H9.5L5 20.5V17h-.5") +
            stroke("M4 6.5V16") + fill("M19 2.5a3 3 0 1 1 0 6a3 3 0 1 1 0-6", "#FF6B5E", 1))
    sb_icon("sb_music.png", stroke("M9 18V5l11-2v13") + fill("M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0 M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0"))
    sb_icon("sb_roam.png", stroke("M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z") +
            stroke("M9.5 16.5v-9h3.5a2.75 2.75 0 0 1 0 5.5H9.5 M13 13l2.5 3.5"))
    sb_icon("sb_traffic.png", stroke("M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13.1a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z M12 9.5v4", "#FFC46B", 1) +
            fill("M12 15.6a1.2 1.2 0 1 1 0 2.4a1.2 1.2 0 1 1 0-2.4", "#FFC46B", 1))


def glyph24(out_name, d, size=24, opacity=1.0):
    g = '<g fill="none" stroke="#FFFFFF" stroke-opacity="%s" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="scale(%s)">%s</g>' % (
        opacity, size / 24.0, ''.join('<path d="%s"/>' % p for p in d.split("|")))
    svg_canvas(size, size, g).save(os.path.join(SKIN, out_name), optimize=True)


GLASS = ('<defs><linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="%s"/>'
         '<stop offset="1" stop-color="#FFFFFF" stop-opacity="%s"/></linearGradient></defs>')


def glass_rect(x, y, w, h, r, top=0.12, bottom=0.035, border=0.15, ring=None):
    s = GLASS % (top, bottom)
    s += '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="url(#gl)" stroke="#FFFFFF" stroke-opacity="%s" stroke-width="1"/>' % (
        x + 0.5, y + 0.5, w - 1, h - 1, r, border)
    if ring:
        s += '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="none" stroke="%s" stroke-width="2"/>' % (
            x + 1, y + 1, w - 2, h - 2, r, ring)
    return s


def render_skin_panels():
    # Menu container: drawn inside the list's own 732x416 box (screen x 68-800), from x 26 to 708 (screen 94-776).
    svg_canvas(732, 416, glass_rect(26, 0, 682, 412, 28), scale=2).save(os.path.join(SKIN, "list_panel.png"), optimize=True)
    # Row divider: rows keep Mazda's 732px width; the container shows x 26-708, the line runs 16px inside it.
    sep = Image.new("RGBA", (732, 1), (0, 0, 0, 0))
    for x in range(42, 692):
        sep.putpixel((x, 0), (255, 255, 255, 26))
    sep.save(os.path.join(SKIN, "list_sep.png"), optimize=True)
    # Back / folder-up buttons: a glass pill (screen x 24-84) beside the menu container, same height.
    states = {"en": dict(), "ds": dict(top=0.06, bottom=0.02, border=0.08),
              "focus": dict(top=0.24, bottom=0.08, ring="rgba(200,212,255,0.9)"), "hit": dict(top=0.32, bottom=0.14)}
    arrows = {"back": "M43 196l-12 12 12 12", "up": "M42 214l12-12 12 12"}
    for kind, d in arrows.items():
        for st, kw in states.items():
            body = glass_rect(24, 0, 60, 412, 30, **kw)
            body += '<path d="%s" fill="none" stroke="#FFFFFF" stroke-opacity="%s" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(11 0)"/>' % (
                d, 0.35 if st == "ds" else 0.95)
            svg_canvas(94, 416, body, scale=2).save(os.path.join(SKIN, "%s_%s.png" % (kind, st)), optimize=True)


if __name__ == "__main__":
    os.makedirs(SKIN, exist_ok=True)
    render_status_icons()
    render_skin_panels()
    glyph24("sb_home.png", "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10", 22)
    glyph24("sb_aa.png", "M6.5 2.5h11v19h-11z|M10.5 18.5h3|M9.5 13.5l5-5-1.5 6-1.4-1.9z", 24)
    glyph24("sb_cp.png", "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2|M9 17h6|M9 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0|M19 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0", 24)
    # Screen background for Mazda's own screens: the same Midnight art as the home screen, and mirrored for Arabic.
    full = Image.open(os.path.join(DOCS, "background_full.png"))
    full.save(os.path.join(SKIN, "bg_ltr.png"), optimize=True)
    full.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(SKIN, "bg_rtl.png"), optimize=True)
    print("skin assets written to", SKIN)
