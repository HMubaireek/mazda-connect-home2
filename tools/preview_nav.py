#!/usr/bin/env python3
"""
Desktop previews of the restyled navigation screens (docs/nav/*.png), drawn with the real images from
installer/home2/nav/ (run tools/build_nav_skin.py first) and the Midnight colours, in headless Chrome
(for Arabic shaping and Tajawal). The navigation itself is native NNG and can't run on a PC, so these
are close mock-ups: positions come from NNG's layout files (back button x 0-94, list x 60-800 with
64px rows, scroll bar 46px, map menu panel from y 384). Map roads are a made-up street plan.

Usage:  python3 tools/preview_nav.py        (needs Chrome; CHROME_PATH overrides the path)
"""
import os
import struct
import subprocess
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_nav_skin import PALETTES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAV = os.path.join(ROOT, "installer", "home2", "nav", "ui_jci_mazda", "800_480")
OUT = os.path.join(ROOT, "docs", "nav")
FONTS = os.path.join(ROOT, "installer", "home2", "fonts")
CHROME = os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def bm(name):
    b = open(os.path.join(NAV, name), "rb").read()
    off, = struct.unpack("<I", b[10:14])
    w, h = struct.unpack("<ii", b[18:26])
    raw = b[off:off + w * h * 4]
    rows = [raw[y * w * 4:(y + 1) * w * 4] for y in range(h)][::-1]
    return Image.frombytes("RGBA", (w, h), b"".join(rows), "raw", "BGRA")


class Assets:
    def __init__(self, tmp):
        self.tmp = tmp
        self.n = 0

    def frame(self, name, i=0, frames=1):
        img = bm(name)
        fh = img.height // frames
        img = img.crop((0, i * fh, img.width, (i + 1) * fh))
        self.n += 1
        path = os.path.join(self.tmp, "a%03d.png" % self.n)
        img.save(path)
        return "file:///" + path.replace("\\", "/")


def font_url(f):
    return "file:///" + os.path.join(FONTS, f).replace("\\", "/")


HEAD = """<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: TajM; src: url('%s'); }
@font-face { font-family: TajB; src: url('%s'); }
body { margin: 0; }
.s { position: relative; width: 800px; height: 480px; overflow: hidden; background: #05060C; color: #fff; font-family: TajM, sans-serif; }
.a { position: absolute; }
.pill { position: absolute; height: 44px; top: 10px; box-sizing: border-box; border-radius: 22px; background: rgba(14,17,30,.62); border: 1px solid rgba(255,255,255,.16); }
</style></head><body><div class="s">""" % (font_url("Home2Tajawal-Medium.ttf"), font_url("Home2Tajawal-Bold.ttf"))
TAIL = "</div></body></html>"

HOME = '<path d="M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6"/>'
PINI = '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z M14.5 9.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0"/>'


def svg_icon(x, y, size, body, colour="#fff"):
    return ('<svg class="a" style="left:%dpx;top:%dpx" width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="%s" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg>') % (x, y, size, size, colour, body)


def top_bar(rtl, clock="1:02", title=None):
    """Home 2.0's Floating Pills top bar (Mazda's HTML status bar over the map), as in the car photos."""
    title = title or ("التنقل" if rtl else "Navigation")
    s = '<div class="a" style="left:0;top:0;width:800px;height:96px;background:linear-gradient(180deg,rgba(5,6,12,.72),rgba(5,6,12,0))"></div>'
    batt = ('<svg class="a" style="left:%dpx;top:21px" width="26" height="22" viewBox="0 0 26 22"><rect x="1" y="5" width="20" height="12" rx="3.5" '
            'fill="none" stroke="#fff" stroke-width="2"/><rect x="22.5" y="9" width="2.5" height="4" rx="1" fill="#fff"/><rect x="4" y="8" '
            'width="11" height="6" rx="1.5" fill="#fff"/></svg>')
    sig = ('<svg class="a" style="left:%dpx;top:21px" width="22" height="22" viewBox="0 0 22 22"><rect x="1" y="15" width="3.5" height="6" rx="1" fill="#fff"/>'
           '<rect x="6.5" y="11" width="3.5" height="10" rx="1" fill="#fff"/><rect x="12" y="7" width="3.5" height="14" rx="1" fill="#fff"/>'
           '<rect x="17.5" y="3" width="3.5" height="18" rx="1" fill="rgba(255,255,255,.3)"/></svg>')
    chip = '<div class="a" style="left:%dpx;top:14px;width:36px;height:36px;border-radius:12px;background:linear-gradient(160deg,#3FD0C2,#1C8F86)"></div>'
    if rtl:   # mirrored: clock and status on the left, title and home button on the right
        s += '<div class="pill" style="left:24px;width:96px"></div><div class="a" dir="ltr" style="left:24px;top:10px;width:96px;line-height:46px;text-align:center;font-size:24px">%s</div>' % clock
        s += '<div class="pill" style="left:132px;width:84px"></div>' + batt % 146 + sig % 180
        s += '<div class="a" style="right:124px;top:10px;line-height:46px;font-size:24px;font-family:TajB;font-weight:700">%s</div>' % title
        s += chip % 680 + svg_icon(687, 21, 22, PINI)
        s += '<div class="pill" style="left:732px;width:44px"></div>' + svg_icon(743, 21, 22, HOME)
    else:
        s += '<div class="pill" style="left:24px;width:44px"></div>' + svg_icon(35, 21, 22, HOME)
        s += chip % 80 + svg_icon(87, 21, 22, PINI)
        s += '<div class="a" style="left:126px;top:10px;line-height:46px;font-size:24px;font-family:TajB;font-weight:700">%s</div>' % title
        s += '<div class="pill" style="left:584px;width:84px"></div>' + batt % 598 + sig % 632
        s += '<div class="pill" style="left:680px;width:96px"></div><div class="a" style="left:680px;top:10px;width:96px;line-height:46px;text-align:center;font-size:24px">%s</div>' % clock
    return s


def list_screen(A, rtl, rows, focus):
    """NNG list screen: back button (x 0-94), rows from x 60 (730px images, 64px tall from y 64),
    scroll bar 46px (right 2.5%; mirrored to the left when the list runs right to left)."""
    s = HEAD
    row_img = A.frame("listitem64px1line.bmp", 0, 4)
    row_focus_frame = A.frame("listitem64px1line.bmp", 3, 4)
    focus_img = A.frame("listitem64px1line_focus.bmp")
    for i, (label, value) in enumerate(rows):
        y = 64 + 64 * i
        if i == focus:
            s += '<img class="a" style="left:60px;top:%dpx" src="%s">' % (y, focus_img)
            s += '<img class="a" style="left:60px;top:%dpx" src="%s">' % (y, row_focus_frame)
        else:
            s += '<img class="a" style="left:60px;top:%dpx" src="%s">' % (y, row_img)
        font = "font-family:TajM" if rtl else "font-family:Arial,Helvetica,sans-serif"
        if rtl:
            s += '<div class="a" dir="rtl" style="right:84px;top:%dpx;line-height:64px;font-size:23px;%s">%s</div>' % (y, font, label)
            if value:
                s += '<div class="a" dir="rtl" style="left:132px;top:%dpx;line-height:64px;font-size:18px;color:rgba(255,255,255,.72);%s">%s</div>' % (y, font, value)
        else:
            s += '<div class="a" style="left:144px;top:%dpx;line-height:64px;font-size:23px;%s">%s</div>' % (y, font, label)
            if value:
                s += '<div class="a" style="right:84px;top:%dpx;line-height:64px;font-size:18px;color:rgba(255,255,255,.72);%s">%s</div>' % (y, font, value)
    thumb = A.frame("spr_hscroll_indicator.bmp")
    x = 78 if rtl else 734        # 2.5% of the 740px list from its edge
    s += '<div class="a" style="left:%dpx;top:64px;width:46px;height:250px;overflow:hidden"><img src="%s"></div>' % (x, thumb)
    s += '<img class="a" style="left:0;top:64px" src="%s">' % A.frame("btn_back.bmp", 0, 4)
    s += top_bar(rtl)
    return s + TAIL


# ---------------------------------------------------------------- map
MINOR = ("M90 -10 V 490 M190 60 V 490 M290 -10 V 250 M510 -10 V 120 M700 -10 V 250 M-10 60 H 290 M-10 120 H 400 "
         "M510 120 H 810 M-10 330 H 810 M190 330 L 250 250 M510 120 C 540 160, 560 200, 560 250 M700 250 L 760 330 L 810 345 "
         "M610 330 V 490 M300 330 V 490")
SMALL = "M140 60 V 250 M240 120 V 250 M340 250 V 330 M460 330 V 490 M660 120 V 250 M-10 190 H 290 M510 190 H 700"
MAIN = "M400 -10 V 490 M-10 250 H 810 M610 -10 V 250"
FREEWAY = "M-10 172 C 200 140, 500 92, 810 40"
ROUTE = "M400 352 V 250 H 610 V -10"


def rgb(c):
    return "rgb(%d,%d,%d)" % c


def map_screen(A, rtl, scheme):
    p = PALETTES[scheme]
    road = lambda d, k, w: ('<path d="%s" stroke="%s" stroke-width="%d"/><path d="%s" stroke="%s" stroke-width="%d"/>'
                            % (d, rgb(p[k.upper()]), w + 4, d, rgb(p[k]), w))
    s = HEAD.replace("background: #05060C", "background: %s" % rgb(p["0"]))
    lab = rgb(p["label_road"])
    s += '<svg class="a" width="800" height="480" viewBox="0 0 800 480" style="left:0;top:0">'
    s += '<rect x="0" y="0" width="800" height="480" fill="%s"/>' % rgb(p["0"])
    for x, y, w, h in ((100, 130, 82, 56), (300, 130, 96, 110), (420, 130, 84, 110), (620, 130, 74, 110), (100, 262, 82, 60),
                       (204, 262, 84, 60), (420, 340, 180, 140), (620, 262, 170, 60), (20, 340, 160, 140)):
        s += '<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="%s"/>' % (x, y, w, h, rgb(p["built_up"]))
    s += '<path d="M640 0 C 690 60, 760 70, 800 64 L 800 0 Z" fill="%s"/>' % rgb(p["salt_water"])
    s += '<rect x="430" y="268" width="152" height="58" rx="6" fill="%s"/>' % rgb(p["city_park"])
    s += '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'
    s += road(SMALL, "i", 4) + road(MINOR, "g", 6) + road(MAIN, "a", 11) + road(FREEWAY, "r", 12)
    s += ('<path d="%s" stroke="%s" stroke-width="16"/><path d="%s" stroke="%s" stroke-width="9"/>'
          % (ROUTE, rgb(p["planned_road_ext"]), ROUTE, rgb(p["planned_road"])))
    s += '</g>'
    for x, y, t, rot in ((150, 243, "طريق الملك فهد" if rtl else "King Fahd Rd", 0), (690, 243, "طريق الملك فهد" if rtl else "King Fahd Rd", 0),
                         (386, 170, "شارع العليا" if rtl else "Olaya St", -90)):
        s += ('<text x="0" y="0" transform="translate(%d %d) rotate(%d)" text-anchor="middle" font-family="TajM" font-size="13" fill="%s">%s</text>'
              % (x, y, rot, lab, t))
    s += ('<path d="M400 328 L 417 368 L 400 359 L 383 368 Z" fill="#3A5BE8" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>')
    s += '</svg>'
    # speed limit box (cockpit_bg_straight stretched) + sign
    s += '<img class="a" style="left:0;top:242px;width:116px;height:84px" src="%s">' % A.frame("cockpit_bg_straight.bmp")
    s += '<img class="a" style="left:28px;top:253px" src="%s">' % A.frame("spr_speedlimit_eu.bmp", 0, 2)
    s += '<div class="a" style="left:28px;top:253px;width:61px;text-align:center;font:bold 24px Arial;line-height:61px;color:#14161F">40</div>'
    # bottom bar: right to left in Arabic (the bar is a list)
    icons = ["closepanel", "newroute", "navigationinfo", "stopnavigation", "findplace", "routemenu", "2D", "settings"]
    disabled = {"stopnavigation", "routemenu"}
    slots = list(reversed(icons)) if rtl else icons
    s += '<img class="a" style="left:0;top:384px" src="%s">' % A.frame("spr_cockpitMenuBG.bmp")
    for i, ic in enumerate(slots):
        focused = ic == "closepanel"
        s += '<img class="a" style="left:%dpx;top:393px" src="%s">' % (i * 100, A.frame("btn_cockpitmenu_8.bmp", 3 if focused else 0, 4))
        if i:
            s += '<img class="a" style="left:%dpx;top:397px" src="%s">' % (i * 100, A.frame("spr_floating_divider.bmp"))
        s += '<img class="a" style="left:%dpx;top:411px" src="%s">' % (i * 100 + 25, A.frame("ico_CM_%s.bmp" % ic, 2 if ic in disabled else 0, 4))
    fx = slots.index("closepanel") * 100 + 50
    tip = "إخفاء الأزرار" if rtl else "Hide buttons"
    px = max(8, min(800 - 8 - 220, fx - 110))
    s += '<img class="a" style="left:%dpx;top:296px;width:220px;height:90px" src="%s">' % (px, A.frame("mapmenupopup.bmp"))
    s += '<img class="a" style="left:%dpx;top:368px" src="%s">' % (fx - 18, A.frame("mapmenupopup_leg.bmp"))
    s += '<div class="a" dir="%s" style="left:%dpx;top:296px;width:220px;line-height:90px;text-align:center;font-size:24px">%s</div>' % ("rtl" if rtl else "ltr", px, tip)
    s += top_bar(rtl, "1:01")
    return s + TAIL


SETTINGS = {
    True: [("إعدادات خريطة", ""), ("إعدادات التوجيه", ""), ("إعدادات التحذير", ""), ("إعدادات المسار", ""),
           ("إعدادات المرور", ""), ("إعدادات الخدمات المتصلة بالإنترنت", "")],
    False: [("Map settings", ""), ("Guidance settings", ""), ("Warning settings", ""), ("Route settings", ""),
            ("Traffic settings", ""), ("Connected services settings", "")],
}
SEARCH = {
    True: [("طوارئ قريبة", ""), ("تصفية حسب الاسم", "انقر للإدخال"), ("تعيين فئة", "الكل"), ("المنطقة", "حول هذا المكان"), ("بحث", "")],
    False: [("Emergency nearby", ""), ("Filter by name", "Tap to enter"), ("Set category", "All"), ("Area", "Around here"), ("Search", "")],
}


def shoot(html, out, tmp):
    path = os.path.join(tmp, "page.html")
    open(path, "w", encoding="utf-8").write(html)
    shot = os.path.join(tmp, "shot.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--allow-file-access-from-files", "--window-size=800,480", "--screenshot=" + shot,
                    "file:///" + path.replace("\\", "/")], check=True, capture_output=True, timeout=120)
    Image.open(shot).convert("RGB").crop((0, 0, 800, 480)).save(shot + ".2.png", optimize=True)
    os.replace(shot + ".2.png", out)


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        A = Assets(tmp)
        jobs = [("settings_ar.png", list_screen(A, True, SETTINGS[True], 0)),
                ("search_ar.png", list_screen(A, True, SEARCH[True], 1)),
                ("map_night_ar.png", map_screen(A, True, "night")),
                ("map_day_ar.png", map_screen(A, True, "day")),
                ("settings_en.png", list_screen(A, False, SETTINGS[False], 0)),
                ("search_en.png", list_screen(A, False, SEARCH[False], 1)),
                ("map_night_en.png", map_screen(A, False, "night"))]
        for name, html in jobs:
            shoot(html, os.path.join(OUT, name), tmp)
            print("wrote docs/nav/" + name)


if __name__ == "__main__":
    main()
