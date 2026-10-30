#!/usr/bin/env python3
"""
Render the Home 2.0 image assets (Midnight palette).

Outputs to installer/home2/images/home2/:
  bg_ltr.png, bg_rtl.png            800x416 background under Mazda's status bar
  chip_nav/ent/com/set/app.png      56x56 dock icon chips (40px chip + shadow)
  chip_aa/cp/none.png               96x96 phone-card chips (64px chip + shadow)
  arrow_ltr.png, arrow_rtl.png      28x28 "open" arrow
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
    "none": '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
}

# (gradient start, gradient end) for each chip
CHIP_COLOURS = {
    "nav": ("#3FD9C8", "#168FB3"),
    "ent": ("#FFB547", "#FF6A2E"),
    "com": ("#4AD98B", "#189C5F"),
    "set": ("#9AA0AA", "#5A606B"),
    "app": ("#9B8CFF", "#5B46E6"),
    "aa": ("#6C8BFF", "#3A3FE0"),
    "cp": ("#6C8BFF", "#3A3FE0"),
}


def svg_png(svg, size):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                                                    output_width=size, output_height=size))).convert("RGBA")


def chip(name, canvas, chip_size, radius, icon_size, stroke, shadow_rgba, out_name):
    S = 4  # supersample
    c, cs, r, ic = canvas * S, chip_size * S, radius * S, icon_size * S
    off = (c - cs) // 2
    if name in CHIP_COLOURS:
        a, b = CHIP_COLOURS[name]
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


def arrow(out_name, flip):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" '
           'stroke-opacity="0.7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
           '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/></svg>')
    im = svg_png(svg, 112).resize((28, 28), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(os.path.join(OUT, out_name), optimize=True)


if __name__ == "__main__":
    render_background()
    for k in ("nav", "ent", "com", "set", "app"):
        chip(k, 56, 40, 13, 22, 2.0, None, "chip_%s.png" % k)
    chip("aa", 96, 64, 20, 34, 1.8, (58, 76, 255, 0.45), "chip_aa.png")
    chip("cp", 96, 64, 20, 34, 1.8, (58, 76, 255, 0.45), "chip_cp.png")
    chip("none", 96, 64, 20, 34, 1.8, None, "chip_none.png")
    arrow("arrow_ltr.png", False)
    arrow("arrow_rtl.png", True)
    print("assets written to", OUT)
