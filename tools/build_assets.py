#!/usr/bin/env python3
"""
Render the Home 2.0 image assets (Midnight palette).

Outputs to installer/home2/images/home2/:
  bg_ltr.png, bg_rtl.png            800x416 background under Mazda's status bar
  chip_nav/ent/com/set/app.png      56x56 dock icon chips (40px chip)
  row_*.png                         42x42 status-card chips (car, phone, media)
  pill_aa.png, pill_cp.png          35x35 round chips for the Android Auto / CarPlay pill
  row_maint.png                     maintenance chip
and docs/background_full.png (800x480, for the README).

Requires: Pillow, numpy, cairosvg
"""
import io
import os
import sys

import cairosvg
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skin_icons                     # noqa: E402  (our icon set for the media bar and list rows)
from skin_icons import icon_svg       # noqa: E402

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
    "maint": ("wrench", ("#3FD9C8", "#168FB3")),
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


# Menu layout (List2Ctrl box = screen x 68-800): back button x 24-72, scroll bar x 84-90, container x 102-776
# (list x 34-708). Rows keep Mazda's 732px width; in Arabic they are mirrored, so row images get an _rtl copy
# drawn at the mirrored position.
PANEL_X0, PANEL_X1 = 34, 708


def _row_x(x0, x1, rtl):
    return (732 - x1, 732 - x0) if rtl else (x0, x1)


def render_skin_panels():
    svg_canvas(732, 416, glass_rect(PANEL_X0, 0, PANEL_X1 - PANEL_X0, 412, 28), scale=2).save(
        os.path.join(SKIN, "list_panel.png"), optimize=True)
    for rtl in (False, True):
        suffix = "_rtl" if rtl else ""
        # Row divider, 16px inside the container
        x0, x1 = _row_x(PANEL_X0 + 16, PANEL_X1 - 16, rtl)
        sep = Image.new("RGBA", (732, 1), (0, 0, 0, 0))
        for x in range(x0, x1):
            sep.putpixel((x, 0), (255, 255, 255, 26))
        sep.save(os.path.join(SKIN, "list_sep%s.png" % suffix), optimize=True)
        # Focus / pressed row: a rounded pill 4px inside the container, for normal (64px) and tall (82px) rows.
        # It carries its own rounded corners because the car's browser does not clip to them.
        x0, x1 = _row_x(PANEL_X0 + 4, PANEL_X1 - 4, rtl)
        for name, h, top, bottom in (("list_focus", 64, 0.30, 0.16), ("list_focus_thick", 82, 0.30, 0.16),
                                     ("list_hit", 64, 0.42, 0.26), ("list_hit_thick", 82, 0.42, 0.26)):
            tint = ('<defs><linearGradient id="fp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BECDFF" '
                    'stop-opacity="%s"/><stop offset="1" stop-color="#BECDFF" stop-opacity="%s"/></linearGradient></defs>') % (
                top, bottom)
            body = tint + '<rect x="%d" y="3" width="%d" height="%d" rx="20" fill="url(#fp)"/>' % (x0, x1 - x0, h - 6)
            svg_canvas(732, h, body, scale=2).save(os.path.join(SKIN, name + suffix + ".png"), optimize=True)
    # Back / folder-up buttons: a small round glass button (48px, screen x 24-72) beside the menu, centred
    # vertically. The rest of Mazda's 94x416 touch area stays transparent and still works.
    states = {"en": ("rgba(255,255,255,0.10)", "rgba(255,255,255,0.16)", 1),
              "ds": ("rgba(255,255,255,0.04)", "rgba(255,255,255,0.08)", 1),
              "focus": ("rgba(255,255,255,0.18)", "rgba(200,212,255,0.9)", 2.5),
              "hit": ("rgba(255,255,255,0.30)", "rgba(255,255,255,0.3)", 1)}
    arrows = {"back": "M51 198l-10 10 10 10", "up": "M38 213l10-10 10 10"}
    for kind, d in arrows.items():
        for st, (fill, stroke, sw) in states.items():
            body = '<circle cx="48" cy="208" r="24" fill="%s" stroke="%s" stroke-width="%s"/>' % (fill, stroke, sw)
            body += ('<path d="%s" fill="none" stroke="#FFFFFF" stroke-opacity="%s" stroke-width="3" stroke-linecap="round" '
                     'stroke-linejoin="round"/>') % (d, 0.35 if st == "ds" else 0.95)
            svg_canvas(94, 416, body, scale=2).save(os.path.join(SKIN, "%s_%s.png" % (kind, st)), optimize=True)
    render_tabs()
    render_media_extras()


# Tabs (Settings, Favorites, phone): one segmented glass bar inside the menu container (list x 40-702, 662x56),
# the chosen tab a blue pill, the others plain text. Tab widths for 2, 3 and 4 visible tabs, plus the arrow
# buttons Mazda adds when there are more than 4 tabs.
TAB_W = {2: 325, 3: 216, 4: 137}


def render_tabs():
    svg_canvas(662, 56, glass_rect(0, 0, 662, 56, 22, top=0.09, bottom=0.04, border=0.14), scale=2).save(
        os.path.join(SKIN, "tab_bar.png"), optimize=True)
    for n, w in TAB_W.items():
        on = ('<defs><linearGradient id="tb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C8BFF"/>'
              '<stop offset="1" stop-color="#3A3FE0"/></linearGradient></defs>'
              '<rect x="0" y="0" width="%d" height="48" rx="18" fill="url(#tb)"/>') % w
        svg_canvas(w, 48, on, scale=2).save(os.path.join(SKIN, "tab_on_%d.png" % n), optimize=True)
        svg_canvas(w, 48, '<rect x="0" y="0" width="%d" height="48" rx="18" fill="#FFFFFF" fill-opacity="0.18"/>' % w,
                   scale=2).save(os.path.join(SKIN, "tab_hit_%d.png" % n), optimize=True)
    for name, d in (("prev", "M27 16l-8 8 8 8"), ("next", "M21 16l8 8-8 8")):
        for st, fill in (("en", 0.08), ("hit", 0.24)):
            body = ('<rect x="0" y="0" width="48" height="48" rx="18" fill="#FFFFFF" fill-opacity="%s"/>'
                    '<path d="%s" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
                    % (fill, d))
            svg_canvas(48, 48, body, scale=2).save(os.path.join(SKIN, "tab_%s_%s.png" % (name, st)), optimize=True)


def render_media_extras():
    # Media bar tooltip: the small pointer under the dark glass balloon (36x22, like Mazda's).
    svg_canvas(36, 22, '<path d="M8 0.5h20L18 12z" fill="#1E2234" fill-opacity="0.96" stroke="#FFFFFF" stroke-opacity="0.2"/>'
               '<rect x="7" y="0" width="22" height="1.2" fill="#1E2234"/>', scale=4).save(
        os.path.join(SKIN, "tooltip_point.png"), optimize=True)
    # Now playing (radio, USB, Bluetooth audio): one glass card above the media bar (screen x 24-776),
    # and an artwork tile that shows when a station or song has no picture of its own.
    svg_canvas(800, 416, glass_rect(24, 8, 752, 292, 30, top=0.10, bottom=0.03, border=0.14), scale=2).save(
        os.path.join(SKIN, "np_card.png"), optimize=True)
    tile = ('<defs><linearGradient id="at" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB547"/>'
            '<stop offset="1" stop-color="#FF6A2E"/></linearGradient></defs>'
            '<rect x="3" y="3" width="140" height="140" rx="32" fill="url(#at)"/>'
            '<g transform="translate(43 43) scale(2.5)" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" '
            'stroke-linejoin="round"><path d="%s"/></g>') % skin_icons.BROADCAST
    svg_canvas(146, 146, tile, scale=2).save(os.path.join(SKIN, "np_art.png"), optimize=True)


# Screen icons (top bar) and alert icons: Mazda's IcnSbn<Name>.png, redrawn as 38px chips in a 40px image.
SBN_ICONS = {
    "apps": (ICONS["app"], ("#9B8CFF", "#5B46E6")),
    "bt": ('<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>', ("#5B8CFF", "#2F5BD8")),
    "comm": ('<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/>', ("#4AD98B", "#189C5F")),
    "contact": ('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', ("#4AD98B", "#189C5F")),
    "email": ('<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>', ("#5B8CFF", "#2F5BD8")),
    "ent": (ICONS["ent"], ("#FFB547", "#FF6A2E")),
    "favorite": ('<polygon points="12 3 14.8 8.7 21 9.6 16.5 14 17.5 20.2 12 17.3 6.5 20.2 7.5 14 3 9.6 9.2 8.7 12 3"/>', ("#FFD15C", "#F2A31B")),
    "maint": ('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>', ("#FFC24A", "#E88A12")),
    "map": ('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', ("#3FD9C8", "#168FB3")),
    "micclosed": ('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="4" y1="4" x2="20" y2="20"/>', ("#9AA0AA", "#5A606B")),
    "micopen": ('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/>', ("#5B8CFF", "#2F5BD8")),
    "micunavail": ('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/>', ("#9AA0AA", "#5A606B")),
    "muteoff": ('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>', ("#FFB547", "#FF6A2E")),
    "muteon": ('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>', ("#FF6B5E", "#D7263D")),
    "prompt": ('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>', ("#5B8CFF", "#2F5BD8")),
    "sdcard": ('<path d="M7 3h8l4 4v14H7z"/><line x1="10" y1="6" x2="10" y2="9"/><line x1="13" y1="6" x2="13" y2="9"/>', ("#9AA0AA", "#5A606B")),
    "settings": (ICONS["set"], ("#9AA0AA", "#5A606B")),
    "systemerror": ('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', ("#FF6B5E", "#D7263D")),
    "volume": ('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>', ("#FFB547", "#FF6A2E")),
}


def render_wink_icons():
    """The centre mute / unmute box images (Mazda's IcnWinkMute.png / IcnWinkUnMute.png, 112x112)."""
    speaker = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>'
    for name, extra, ring, stroke in (("wink_mute", '<line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>',
                                       "rgba(255,107,94,0.18)", "#FF8F86"),
                                      ("wink_unmute", '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
                                       "rgba(108,139,255,0.20)", "#FFFFFF")):
        body = ('<circle cx="56" cy="56" r="54" fill="%s"/><g transform="translate(26 26) scale(2.5)" fill="none" stroke="%s" '
                'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s%s</g>') % (ring, stroke, speaker, extra)
        svg_canvas(112, 112, body, scale=4).save(os.path.join(SKIN, name + ".png"), optimize=True)


def render_sbn_icons():
    for name, (icon, (c1, c2)) in SBN_ICONS.items():
        body = ('<defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/>'
                '<stop offset="1" stop-color="%s"/></linearGradient></defs>'
                '<rect x="1" y="1" width="38" height="38" rx="12" fill="url(#sg)"/>'
                '<g transform="translate(9 9) scale(0.9167)" fill="none" stroke="#FFFFFF" stroke-width="2" '
                'stroke-linecap="round" stroke-linejoin="round">%s</g>') % (c1, c2, icon)
        svg_canvas(40, 40, body, scale=4).save(os.path.join(SKIN, "sbn_%s.png" % name), optimize=True)


if __name__ == "__main__":
    os.makedirs(SKIN, exist_ok=True)
    render_status_icons()
    render_skin_panels()
    render_sbn_icons()
    render_wink_icons()
    glyph24("sb_home.png", "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10", 22)
    glyph24("sb_aa.png", "M6.5 2.5h11v19h-11z|M10.5 18.5h3|M9.5 13.5l5-5-1.5 6-1.4-1.9z", 24)
    glyph24("sb_cp.png", "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2|M9 17h6|M9 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0|M19 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0", 24)
    # Screen background for Mazda's own screens: the same Midnight art as the home screen, and mirrored for Arabic.
    full = Image.open(os.path.join(DOCS, "background_full.png"))
    full.save(os.path.join(SKIN, "bg_ltr.png"), optimize=True)
    full.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(SKIN, "bg_rtl.png"), optimize=True)
    print("skin assets written to", SKIN)


# ---------------------------------------------------------------- Mazda control images, redrawn
# tools/skin_controls.json lists, for each Mazda control image the skin restyles: its size, the area its pixels
# cover (bbox), how to redraw it (kind) and the CSS selectors that use it. It holds numbers and class names only
# (made once from the firmware, see CLAUDE.md). Every image is redrawn at the same size, so Mazda's layout and
# touch areas stay exactly as they are. Also writes src/skin/controls.generated.css.
CTL = os.path.join(SKIN, "ctl")
ICN = os.path.join(SKIN, "icn")
GLYPHS = {
    "CloseBtn1": "M7 7l10 10 M17 7L7 17",
    "SettingsBtn1": "M4 7h10 M18 7h2 M4 17h4 M12 17h8 M14 5v4 M8 15v4",
    "PSMOpen": "M15 6l-6 6 6 6",
    "PSMClose": "M9 6l6 6-6 6",
    "CVCBtn1": "M4 8h3l2-3h6l2 3h3v11H4z M9 13.5a3 3 0 0 1 5.4-1.8 M15 13.5a3 3 0 0 1-5.4 1.8",
    "BtnLeft": "M15 6l-6 6 6 6",
}
BLUE_GRAD = ("#6C8BFF", "#3A3FE0")


def _rect(x, y, w, h, r, fill, stroke=None, sw=1.0, grad=None):
    defs = ""
    if grad:
        defs = ('<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/>'
                '<stop offset="1" stop-color="%s"/></linearGradient></defs>' % grad)
        fill = "url(#cg)"
    s = '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"' % (x, y, w, h, r, fill)
    if stroke:
        s += ' stroke="%s" stroke-width="%s"' % (stroke, sw)
    return defs + s + "/>"


STATE_STYLE = {   # fill, stroke, stroke width, gradient
    "btn": ("rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)", 1, None),
    "btn_hit": ("rgba(255,255,255,0.22)", "rgba(255,255,255,0.28)", 1, None),
    "btn_focus": ("rgba(255,255,255,0.14)", "rgba(200,212,255,0.9)", 2.5, None),
    "btn_on": (None, None, 1, BLUE_GRAD),
    "btn_ds": ("rgba(255,255,255,0.04)", "rgba(255,255,255,0.08)", 1, None),
    "btn_green": (None, None, 1, ("#4AD98B", "#189C5F")),
    "btn_red": (None, None, 1, ("#FF6B5E", "#D7263D")),
    "btn_green_focus": (None, "#FFFFFF", 3, ("#4AD98B", "#189C5F")),
}


def glass_panel_svg(x, y, w, h, ring):
    return ('<defs><linearGradient id="gp" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.09"/>'
            '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0.03"/></linearGradient></defs>'
            '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="26" fill="url(#gp)" stroke="%s" stroke-width="%s"/>'
            % (x, y, w, h, ring[0], ring[1]))


def _state_of(name):
    for key, st in (("Focus", "btn_focus"), ("Hit", "btn_hit"), ("Press", "btn_hit"), ("Down", "btn_hit"), ("_Ds", "btn_ds")):
        if key in name:
            return st
    return "btn"


def _circle(cx, cy, r, fill, stroke=None, sw=1.0):
    s = '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"' % (cx, cy, r, fill)
    if stroke:
        s += ' stroke="%s" stroke-width="%s"' % (stroke, sw)
    return s + "/>"


def control_svg(e):
    w, h = e["size"]
    x0, y0, x1, y1 = e["bbox"] or (0, 0, w, h)
    bw, bh = x1 - x0, y1 - y0
    k, name = e["kind"], e["file"]
    glyph = next((d for pre, d in GLYPHS.items() if name.startswith(pre)), None)
    if glyph and k.startswith("btn"):
        st = STATE_STYLE[_state_of(name)]
        r = min(bw, bh) / 2.0 - 3
        cx, cy = x0 + bw / 2.0, y0 + bh / 2.0
        body = _rect(cx - r, cy - r, 2 * r, 2 * r, r, st[0] or "rgba(255,255,255,0.1)", st[1], st[2], st[3])
        s = r * 1.1 / 12.0
        op = 0.4 if "_Ds" in name else 1
        body += ('<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="#FFFFFF" stroke-opacity="%s" '
                 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="%s"/></g>') % (
            cx - 12 * s, cy - 12 * s, s, op, glyph)
        return body
    if k in STATE_STYLE:
        fill, stroke, sw, grad = STATE_STYLE[k]
        r = min(22.0, (bh - 4) / 2.0)
        return _rect(x0 + 2, y0 + 2, bw - 4, bh - 4, r, fill or "#000", stroke, sw, grad)
    if k == "clear":
        return ""
    if k.startswith("screen"):   # a whole Mazda screen panel: one glass container, Mazda's dividers as faint lines
        ring = ("rgba(200,212,255,0.9)", 2.5) if k == "screen_focus" else ("rgba(255,255,255,0.14)", 1)
        body = glass_panel_svg(x0 + 4, y0 + 4, bw - 8, bh - 8, ring)
        for a, b in e.get("hlines", []):
            body += _rect(x0 + 28, (a + b) / 2.0 - 0.5, bw - 56, 1, 0, "rgba(255,255,255,0.14)")
        for a, b in e.get("vlines", []):
            body += _rect((a + b) / 2.0 - 0.5, y0 + 24, 1, bh - 48, 0, "rgba(255,255,255,0.14)")
        return body
    if k == "grid":   # graph background: faint column lines and a base line
        body = _rect(0, h - 1.5, w, 1.5, 0, "rgba(255,255,255,0.30)")
        for a, b in e.get("vlines", []):
            body += _rect((a + b) / 2.0 - 0.5, 4, 1, h - 6, 0, "rgba(255,255,255,0.10)")
        return body
    if k == "line":
        if w >= h:
            return ('<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>'
                    '<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="1" stop-color="#FFFFFF" '
                    'stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="%d" height="%d" fill="url(#lg)"/>' % (w, h))
        return _rect(w / 2.0 - 0.5, h * 0.15, 1, h * 0.7, 0, "rgba(255,255,255,0.18)")
    if k == "vbar":   # graph bars: rounded top, colour by meaning
        cols = (("Green", ("#4AD98B", "#189C5F")), ("Purple", ("#B49CFF", "#6A4FE0")), ("Umber", ("#FFC24A", "#E88A12")),
                ("Current", ("#FFFFFF", "#AFC0FF")), ("Silver", ("#FFFFFF", "#AFC0FF")))
        c1, c2 = next((c for key, c in cols if key in name), ("#6C8BFF", "#3A3FE0"))
        r = min(bw / 2.0, 7.0)
        return ('<defs><linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" '
                'stop-color="%s"/></linearGradient></defs><path d="M%.1f %.1fv%.1fa%.1f %.1f 0 0 1 %.1f -%.1fh%.1fa%.1f %.1f 0 0 1 '
                '%.1f %.1fv%.1fz" fill="url(#vb)"/>') % (c1, c2, x0, y1, -(bh - r), r, r, r, r, bw - 2 * r, r, r, r, r, bh - r)
    if k == "caret":
        return ('<path d="M%.1f %.1fl%.1f %.1f-%.1f %.1f" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2.2" '
                'stroke-linecap="round" stroke-linejoin="round"/>') % (w * 0.3, h * 0.25, w * 0.4, h * 0.25, w * 0.4, h * 0.25)
    if k == "icon_call":
        return icon_svg("IcnUmpCall_En.png", w, h).replace(skin_icons.GREEN, "#FFFFFF")
    if k == "dim":
        return _rect(0, 0, w, h, 0, "rgba(5,6,12,0.80)")
    if k == "winkbox":   # the mute / notification box: dim the screen, glass card where Mazda's box is
        return (_rect(0, 0, w, h, 0, "rgba(3,4,10,0.45)") +
                _rect(170, 48, 464, 254, 30, "rgba(30,34,52,0.95)", "rgba(255,255,255,0.18)", 1.5))
    if k == "dock":
        return _rect(10, 6, w - 20, h - 10, 28, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)", 1)
    if k == "panel_dark":   # camera adjustment bar: dark glass so it reads over the camera picture
        return _rect(x0 + 2, y0 + 2, bw - 4, bh - 4, min(24.0, bh / 4.0), "rgba(14,16,28,0.82)", "rgba(255,255,255,0.18)", 1)
    if k == "panel":
        return _rect(x0 + 2, y0 + 2, bw - 4, bh - 4, min(26.0, bh / 4.0), "rgba(255,255,255,0.08)", "rgba(255,255,255,0.15)", 1)
    if k == "track":
        return _rect(x0, y0, bw, bh, bh / 2.0, "rgba(255,255,255,0.18)")
    if k == "fill":
        return _rect(x0, y0, bw, bh, bh / 2.0, "#000", None, 1, ("#6C8BFF", "#3FD9C8"))
    if k == "knob":
        return _circle(x0 + bw / 2.0, y0 + bh / 2.0, min(bw, bh) / 2.0 - 1, "#FFFFFF", "rgba(108,139,255,0.6)", 2)
    if k == "halo":
        return _circle(x0 + bw / 2.0, y0 + bh / 2.0, min(bw, bh) / 2.0 - 4, "rgba(108,139,255,0.18)", "rgba(200,212,255,0.9)", 2.5)
    if k.startswith("dial"):   # tuner dial: glass disc with a blue centre where the frequency is drawn
        ring = {"dial": "rgba(200,212,255,0.35)", "dial_focus": "rgba(200,212,255,0.95)", "dial_hit": "#FFFFFF"}[k]
        grad = ('<defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C8BFF"/>'
                '<stop offset="1" stop-color="#3A3FE0"/></linearGradient></defs>')
        return (_circle(246, 252, 205, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.14)", 1.5) + grad +
                _circle(246, 252, 78, "url(#dg)", ring, 4))
    if k.startswith("check") or k.startswith("radio") or k == "checkmark":
        cx, cy, s = w / 2.0, h / 2.0, 13
        op = 0.45 if k.endswith("_ds") else 1
        tick = ('<path d="M%.1f %.1fl4.5 4.5 8-9" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" '
                'stroke-linejoin="round"/>') % (cx - 6.5, cy)
        if k == "checkmark":
            return tick
        r = s if k.startswith("radio") else 8
        if "_on" in k:
            inner = _circle(cx, cy, 5, "#FFFFFF") if k.startswith("radio") else tick
            return '<g opacity="%s">%s%s</g>' % (op, _rect(cx - s, cy - s, 2 * s, 2 * s, r, "#000", None, 1, BLUE_GRAD), inner)
        return '<g opacity="%s">%s</g>' % (op, _rect(cx - s, cy - s, 2 * s, 2 * s, r, "rgba(255,255,255,0.06)", "rgba(255,255,255,0.6)", 2))
    return _rect(x0 + 2, y0 + 2, bw - 4, bh - 4, min(22.0, (bh - 4) / 2.0), "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)", 1)


def render_control_skins():
    import json
    os.makedirs(CTL, exist_ok=True)
    entries = json.load(open(os.path.join(ROOT, "tools", "skin_controls.json"), encoding="utf-8"))
    # Mazda gives some selectors two images (normal + pressed tab, slider track + fill): the more specific
    # state is written last so it wins.
    rank = {"btn_hit": 1, "fill": 1, "knob": 1, "btn_focus": 2, "halo": 2, "btn_on": 3}
    css = ["/* Generated by tools/build_assets.py from tools/skin_controls.json: Mazda control images, redrawn",
           " * at the same size in the Home 2.0 style. Do not edit by hand. */", ""]
    layers = json.load(open(os.path.join(ROOT, "tools", "skin_controls_layers.json"), encoding="utf-8"))
    for e in sorted(entries, key=lambda e: (rank.get(e["kind"], 0), e["control"], e["file"])):
        w, h = e["size"]
        out_name = "%s_%s" % (e["control"], e["file"])
        svg_canvas(w, h, control_svg(e), scale=2).save(os.path.join(CTL, out_name), optimize=True)
        sels = [s for s in e["selectors"] if s not in layers]
        if sels:
            css.append(",\n".join(sels) + " {\n  background-image: url(../images/home2skin/ctl/%s) !important;\n}\n" % out_name)
    # Rules where Mazda stacks images (an icon over a key, focus over the button): every layer, in Mazda's order.
    css.append("/* Stacked images */")
    for sel in sorted(layers):
        urls = ["url(../images/home2skin/ctl/%s)" % x[4:] if x.startswith("ctl:") else "url(../../%s)" % x[4:] for x in layers[sel]]
        css.append("%s { background-image: %s !important; }" % (sel, ", ".join(urls)))
    # Media bar and list icons, swapped by file name (Mazda's controls set them as an inline background).
    os.makedirs(ICN, exist_ok=True)
    icons = json.load(open(os.path.join(ROOT, "tools", "skin_controls_icons.json"), encoding="utf-8"))
    css.append("\n/* Media bar and list icons */")
    drawn = 0
    for name, (w, h) in sorted(icons.items()):
        body = icon_svg(name, w, h)
        if body is None:
            continue
        svg_canvas(w, h, body, scale=3).save(os.path.join(ICN, name), optimize=True)
        css.append('[style*="/%s"] { background-image: url(../images/home2skin/icn/%s) !important; }' % (name, name))
        drawn += 1
    open(os.path.join(ROOT, "src", "skin", "controls.generated.css"), "w", encoding="utf-8", newline="\n").write("\n".join(css) + "\n")
    print("restyled %d Mazda control images, %d stacked rules, %d icons" % (len(entries), len(layers), drawn))


if __name__ == "__main__":
    render_control_skins()
