#!/usr/bin/env python3
"""Run once per firmware: read Mazda's control CSS + images from an extracted firmware and record, for each image we restyle,
its size, the area its pixels cover (bbox), how to redraw it (kind) and the CSS selectors that use it.
Usage: python3 tools/extract_skin_table.py <extracted jci/gui> tools/skin_controls.json
Output (skin_controls.json, _layers.json, _icons.json) holds numbers and names only, no Mazda artwork.
tools/build_assets.py redraws the images from it.
For screen backgrounds and graph grids it also records where Mazda draws its divider lines (hlines / vlines), so the
redrawn image keeps the same structure."""
import json, os, re, sys
from PIL import Image
G, OUT = sys.argv[1], sys.argv[2]
# Tabs are styled by hand in src/skin/home2skin.css (one segmented bar).
CONTROLS = ["Dialog3", "InCall2", "Ump3", "Tuner4", "Wink", "ScreenSettings2", "NowPlaying4", "Sbn", "List2",
            "Keyboard", "DialPad2", "Messaging2", "ScrollDetail", "ClockSettings2"]
# Mazda's own screens (all their CSS): fuel economy, i-ACTIVSENSE, vehicle status, compass, DVD, HD traffic image,
# network management, SiriusXM data (sports, weather, fuel prices, ...).
APPS = ["ecoenergy", "idm", "vsm", "emnavi", "dvd", "hdtrafficimage", "netmgmt", "xmdata"]
SKIP = re.compile(r"Ticks_|NowPlayingBG|AhaStar|IcnStatBg|PinEntry|LineSeparatorGrid|Mobile911|IcnContactImage911|UMPPopup|UmpPopup|Popup_Point|"
                  r"SliderTick|ProgressMeter_|_Held_|StatusNotificationBg|ListBackground|ListFocus|ListItemSeparator\.png|"
                  r"^Scrollbar\.png|^ScrollbarBg|TitleStyle|ListItemStyle29|^background\.png|"
                  r"IcnListVDT|IcnListProtect|IcnListPlus|IcnListMinus|Icn_XM|IcnWrn|InLineButton.*XM|Scrubber_Mask|"
                  r"^Icn(?!ListCheck|ListRadio|_|KbdShift)|Cursor|DisplayMask|Colon|ScoreTransBar|Glow|Cylinder|^Number|"
                  r"HEV|Flow|SmallTree|bg_tcs")
# In app folders only frames are redrawn; pictures (car, engine, battery, energy flow, gauges) stay Mazda's.
FRAME = re.compile(r"(?i)bg|bkgd|background|^key|btn|button|bar|divider|whiteline|rail|input|focus|hit|charconv")
NOT_SCREEN = re.compile(r"BarsBg|SliderBg|ScrubberBg|Bg_Arch|BgDial|AdjustBtn_Bg|Notification_BG|DialogBG|NowPlayingBG|TunerCtrl_Bg")


def kind(name, size):
    n0 = name
    if re.match(r"Icn_|IcnKbdShift|Delete_Btn|ActiveCall_|Arrow(Left|Right).png", n0): return "glyph"   # keyboard / keypad key symbols: our own glyphs
    n, (w, h) = name, size
    if re.search(r"(?i)(^|_)bg|bkgd|background|Bkg_|BG(_Focus)?\.png", n) and not NOT_SCREEN.search(n) and w >= 500 and h >= 300:
        if h >= 470: return "clear"   # full-screen art that also sits behind the status bar: show the skin background
        return "screen_focus" if "Focus" in n else "screen"
    if re.search(r"BgBars", n): return "grid"
    if re.search(r"(?i)Divider|WhiteLine", n): return "line"
    if n == "DialPad_CallIcon.png": return "icon_call"
    if re.search(r"BarCap|Bar_?Cap", n): return "clear"
    if re.search(r"FuelConsBar|OilLevelBar|ScoreTransition_Bar|GeneratedEnergy", n): return "vbar"
    if re.search(r"HeaderBg|HeadBack_Bg|BannerBg|IndexedListBg|ListItemBg_Gray", n): return "panel"
    if re.search(r"BottomShadow", n): return "clear"
    if n == "Caret.png": return "caret"
    if re.search(r"CallBtn", n): return "btn_green_focus" if "Focus" in n else "btn_green"
    if re.search(r"DialogBG|NowPlayingBG|TunerCtrl_Bg|Notification_BG|UMP_Bg_Arch|Separator|BottomMask", n): return {
        "DialogBG": "dim", "Notification_BG": "winkbox"}.get(next((k for k in ("DialogBG", "Notification_BG") if k in n), ""), "clear")
    if re.search(r"Scrubber_?Bg|ScrubberBg|ProgressBar_Background|SliderBG|ListItem_Slider-1|_Buffer|SBLoadBarBg|SliderBg|"
                 r"Scrollbar_?Bg|GreyRail", n): return "track"
    if re.search(r"Fill|ProgressBar_Highlight|SBLoadBar\.png|DarFill|Scrollbar", n): return "fill"
    if re.search(r"Knob", n): return "knob"
    if re.search(r"ScrubberHighlight|Slider_Focus", n): return "halo"
    if re.search(r"IcnListCheckbox_Checked|IcnListCheck_Checked", n): return "check_on" + ("_ds" if "_Ds" in n else "")
    if re.search(r"IcnListCheckbox_Unchecked|IcnListCheck_Unchecked", n): return "check_off" + ("_ds" if "_Ds" in n else "")
    if re.search(r"IcnListRadio_Checked", n): return "radio_on" + ("_ds" if "_Ds" in n else "")
    if re.search(r"IcnListRadio_Unchecked", n): return "radio_off" + ("_ds" if "_Ds" in n else "")
    if "IcnListCheckmark" in n: return "checkmark"
    if re.search(r"UMP_Bg\.png", n): return "dock"
    if re.search(r"AdjustmentSettingsBG|AdjustBtn_Bg", n): return "panel_dark"   # over the camera picture
    if re.search(r"Active_Call_Bkg|ImageFrame", n): return "panel"
    if re.search(r"BgDial", n): return "dial" + ("_focus" if "Focus" in n else "_hit" if ("Hit" in n or "Held" in n) else "")
    if re.search(r"Green", n): return "btn_green"
    if re.search(r"Red", n): return "btn_red"
    if re.search(r"Highlight|Selected|Current", n): return "btn_on"
    if re.search(r"Focus", n): return "btn_focus"
    if re.search(r"Hit|Press|Down", n): return "btn_hit"
    if re.search(r"_Ds|_Dead", n): return "btn_ds"
    return "btn"


def bbox(path):
    im = Image.open(path).convert("RGBA")
    b = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    return list(b) if b else None


def lines(path):
    """Rows / columns where Mazda draws a long bright line (at least 30% of the image), as [start, end] runs."""
    im = Image.open(path).convert("LA")
    w, h = im.size
    px = im.load()
    lum = sorted(px[x, y][0] for x in range(0, w, 7) for y in range(0, h, 7) if px[x, y][1] > 40)
    if not lum: return [], []
    cut = lum[len(lum) // 2] + 30
    lit = lambda x, y: px[x, y][1] > 40 and px[x, y][0] > cut

    def runs(flags):
        out, start = [], None
        for i, f in enumerate(flags + [False]):
            if f and start is None: start = i
            if not f and start is not None: out.append([start, i - 1]); start = None
        return out
    inside = lambda r, size: r[0] > 3 and r[1] < size - 4   # lines on the outer edge belong to the old frame
    hl = [r for r in runs([sum(lit(x, y) for x in range(w)) > 0.3 * w for y in range(h)]) if inside(r, h)]
    vl = [r for r in runs([sum(lit(x, y) for y in range(h)) > 0.3 * h for x in range(w)]) if inside(r, w)]
    return hl, vl


def css_files():
    for ctrl in CONTROLS:
        d = os.path.join(G, "common/controls", ctrl, "css")
        for f in sorted(os.listdir(d)):
            if f.endswith(".css") and not f.endswith("_rtl.css"): yield ctrl, os.path.join(d, f), False
    for app in APPS:
        for dp, dn, fn in sorted(os.walk(os.path.join(G, "apps", app))):
            dn.sort()
            for f in sorted(fn):
                if f.endswith(".css") and not f.endswith("_rtl.css"): yield app, os.path.join(dp, f), True


entries = {}
multi = []   # rules that stack several images (icon over key): rewritten as one list so no layer is lost
for ctrl, path, is_app in css_files():
    s = re.sub(r"/\*.*?\*/", "", open(path, encoding="utf-8", errors="ignore").read(), flags=re.S)
    for m in re.finditer(r"([^{}@]+)\{([^}]*)\}", s):
        sels = [" ".join(x.split()) for x in m.group(1).split(",") if x.strip()]
        urls = re.findall(r"url\([\"']?([^\"')]+)[\"']?\)", m.group(2))
        if len(urls) > 1:
            multi.append((ctrl, sels, [(os.path.basename(u), os.path.relpath(os.path.normpath(
                os.path.join(os.path.dirname(path), u)), G).replace(os.sep, "/")) for u in urls]))
        for u in urls:
            name = os.path.basename(u)
            if SKIP.search(name) or (is_app and not FRAME.search(name)): continue
            p = os.path.normpath(os.path.join(os.path.dirname(path), u))
            if not os.path.exists(p): continue
            key = ctrl + "/" + name
            if key not in entries:
                size = Image.open(p).size
                e = entries[key] = {"control": ctrl, "file": name, "size": list(size), "bbox": bbox(p),
                                    "kind": kind(name, size), "selectors": []}
                if e["kind"] in ("screen", "screen_focus", "grid"):
                    e["hlines"], e["vlines"] = lines(p)
            e = entries[key]
            for sel in sels:
                if sel not in e["selectors"]: e["selectors"].append(sel)
# Some apps ship their own copy of a common control's CSS (xmdata: Messaging2, ScrollDetail) with other image sizes:
# those selectors belong to the common control, so the app's copy must not claim them.
common_sels = {s for e in entries.values() if e["control"] not in APPS for s in e["selectors"]}
for k in list(entries):
    e = entries[k]
    if e["control"] in APPS:
        e["selectors"] = [s for s in e["selectors"] if s not in common_sels]
        if not e["selectors"]: del entries[k]
out = sorted(entries.values(), key=lambda e: (e["control"], e["file"]))
json.dump(out, open(OUT, "w", encoding="utf-8", newline="\n"), indent=1)
# Stacked rules: per selector, its layers in Mazda's order, ours ("ctl:<control>_<file>") or Mazda's ("gui:<path>").
layers = {}
for ctrl, sels, urls in multi:
    lst = ["ctl:%s_%s" % (ctrl, n) if (ctrl + "/" + n) in entries else "gui:" + r for n, r in urls]
    if any(x.startswith("ctl:") for x in lst):
        for sel in sels: layers[sel] = lst
json.dump(layers, open(OUT.replace(".json", "_layers.json"), "w", encoding="utf-8", newline="\n"), indent=1, sort_keys=True)
print(len(layers), "stacked selectors")
# Icons that Mazda's controls set as an inline background (media bar buttons, list rows): names and sizes only.
icn = os.path.join(G, "common/images/icons")
icons = {f: list(Image.open(os.path.join(icn, f)).size) for f in sorted(os.listdir(icn))
         if re.match(r"Icn(Ump|List).*\.png$", f)}
json.dump(icons, open(OUT.replace(".json", "_icons.json"), "w", encoding="utf-8", newline="\n"), indent=0, sort_keys=True)
print(len(icons), "media bar / list icons")
from collections import Counter
print(len(out), "images;", Counter(e["kind"] for e in out))
