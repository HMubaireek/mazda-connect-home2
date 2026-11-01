#!/usr/bin/env python3
"""Run once per firmware: read Mazda's control CSS + images from an extracted firmware and record, for each image we restyle,
its size, the area its pixels cover (bbox), how to redraw it (kind) and the CSS selectors that use it.
Usage: python3 tools/extract_skin_table.py <extracted jci/gui> tools/skin_controls.json
Output holds numbers and class names only, no Mazda artwork. tools/build_assets.py redraws the images from it."""
import json, os, re, sys
from PIL import Image
G, OUT = sys.argv[1], sys.argv[2]
CONTROLS = ["Tabs", "Dialog3", "InCall2", "Ump3", "Tuner4", "Wink", "ScreenSettings2", "NowPlaying4", "Sbn", "List2"]
SKIP = re.compile(r"Ticks_|AhaStar|IcnStatBg|PinEntry|LineSeparatorGrid|Mobile911|IcnContactImage911|UMPPopup|UmpPopup|Popup_Point|"
                  r"ActiveCall_|SliderTick|ProgressMeter_|_Held_|StatusNotificationBg|ListBackground|ListFocus|ListItemSeparator\.png|"
                  r"ListBottomShadow|Scrollbar|IndexedList|Caret|TitleStyle|background\.png|ListItemBg|ListItemStyle29|MaintSet|"
                  r"IcnListVDT|IcnListProtect|IcnListPlus|IcnListMinus|Icn_XM|IcnWrn|InLineButton.*XM|Scrubber_Mask")
def kind(name):
    n = name
    if re.search(r"DialogBG|NowPlayingBG|TunerCtrl_Bg|Notification_BG|UMP_Bg_Arch|Separator|BottomMask", n): return {
        "DialogBG": "dim", "Notification_BG": "winkbox"}.get(next((k for k in ("DialogBG", "Notification_BG") if k in n), ""), "clear")
    if re.search(r"Scrubber_?Bg|ScrubberBg|ProgressBar_Background|SliderBG|ListItem_Slider-1|_Buffer|SBLoadBarBg|SliderBg", n): return "track"
    if re.search(r"Fill|ProgressBar_Highlight|SBLoadBar\.png|DarFill", n): return "fill"
    if re.search(r"Knob", n): return "knob"
    if re.search(r"ScrubberHighlight|Slider_Focus", n): return "halo"
    if re.search(r"IcnListCheckbox_Checked|IcnListCheck_Checked", n): return "check_on" + ("_ds" if "_Ds" in n else "")
    if re.search(r"IcnListCheckbox_Unchecked|IcnListCheck_Unchecked", n): return "check_off" + ("_ds" if "_Ds" in n else "")
    if re.search(r"IcnListRadio_Checked", n): return "radio_on" + ("_ds" if "_Ds" in n else "")
    if re.search(r"IcnListRadio_Unchecked", n): return "radio_off" + ("_ds" if "_Ds" in n else "")
    if "IcnListCheckmark" in n: return "checkmark"
    if re.search(r"UMP_Bg\.png", n): return "dock"
    if re.search(r"Active_Call_Bkg|AdjustmentSettingsBG|AdjustBtn_Bg|ImageFrame", n): return "panel"
    if re.search(r"BgDial", n): return "dial" + ("_focus" if "Focus" in n else "_hit" if ("Hit" in n or "Held" in n) else "")
    if re.search(r"Green", n): return "btn_green"
    if re.search(r"Red", n): return "btn_red"
    if re.search(r"Highlight|Selected|Current", n): return "btn_on"
    if re.search(r"Focus", n): return "btn_focus"
    if re.search(r"Hit|Press|Down", n): return "btn_hit"
    if re.search(r"_Ds", n): return "btn_ds"
    return "btn"
def bbox(path):
    im = Image.open(path).convert("RGBA")
    b = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    return list(b) if b else None
entries = {}
for ctrl in CONTROLS:
    cssdir = os.path.join(G, "common/controls", ctrl, "css")
    for cssname in sorted(os.listdir(cssdir)):
        if not cssname.endswith(".css"): continue
        s = re.sub(r"/\*.*?\*/", "", open(os.path.join(cssdir, cssname), encoding="utf-8", errors="ignore").read(), flags=re.S)
        for m in re.finditer(r"([^{}@]+)\{([^}]*)\}", s):
            sels = [" ".join(x.split()) for x in m.group(1).split(",") if x.strip()]
            for u in re.findall(r"url\([\"']?([^\"')]+)[\"']?\)", m.group(2)):
                name = os.path.basename(u)
                if SKIP.search(name): continue
                p = os.path.normpath(os.path.join(cssdir, u))
                if not os.path.exists(p): continue
                key = ctrl + "/" + name
                e = entries.setdefault(key, {"control": ctrl, "file": name, "size": list(Image.open(p).size),
                                             "bbox": bbox(p), "kind": kind(name), "selectors": []})
                for sel in sels:
                    if sel not in e["selectors"]: e["selectors"].append(sel)
out = sorted(entries.values(), key=lambda e: (e["control"], e["file"]))
json.dump(out, open(OUT, "w", encoding="utf-8", newline="\n"), indent=1)
from collections import Counter
print(len(out), "images;", Counter(e["kind"] for e in out))
