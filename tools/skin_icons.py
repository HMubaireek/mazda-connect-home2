"""Home 2.0 icon set for Mazda's media bar buttons (IcnUmp*, 40px) and list rows (IcnList*, 36px).
Mazda's controls set these as an inline background image, so the skin swaps them by file name
([style*="/IcnUmpPlayPause_Play_En.png"]). Every glyph is our own line drawing on a 24px grid
(stroke 2, round caps); names without a glyph keep Mazda's icon.
Used by tools/build_assets.py with tools/skin_controls_icons.json (names and sizes from the firmware)."""
import re

PHONE = ("M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3"
         "a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7"
         "a2 2 0 0 1 1.7 2z")
NOTE = "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0 M21 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0"
STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"
LIST = "M9 6h12 M9 12h12 M9 18h12 M4 6h.01 M4 12h.01 M4 18h.01"
REPEAT = "M17 2l4 4-4 4 M3 11V9a3 3 0 0 1 3-3h15 M7 22l-4-4 4-4 M21 13v2a3 3 0 0 1-3 3H3"
SHUFFLE = "M16 3h5v5 M4 20L21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5"
MIC = "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3"
MIC_OFF = ("M2 2l20 20 M9 9v3a3 3 0 0 0 5.1 2.1 M15 9.3V5a3 3 0 0 0-5.9-.7 M17 16.9A7 7 0 0 1 5 12v-2 M19 10v2"
           "a7 7 0 0 1-.1 1.2 M12 19v3")
GEAR = ("M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3"
        " 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1"
        "a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1"
        "a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0"
        " 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z")
USER = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0"
USER_PLUS = "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M12.5 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0 M20 8v6 M23 11h-6"
USER_MINUS = "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M12.5 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0 M23 11h-6"
MAIL = "M3 5h18v14H3z M3 6l9 7 9-7"
CHAT = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
FOLDER = "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"
DISC = "M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0 M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0"
BROADCAST = ("M14 12a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M16.2 7.8a6 6 0 0 1 0 8.5 M7.8 16.2a6 6 0 0 1 0-8.5 M19.1 4.9a10 10 0 0 1 0 14.2"
             " M4.9 19.1a10 10 0 0 1 0-14.2")
BT = "M7 7l10 10-5 5V2l5 5L7 17"
CAR = "M5 17H3v-5l2.5-5h13l2.5 5v5h-2 M5 12h14 M9 17h6 M9 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M19 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0"
TRASH = "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6"
DOTS = "M6 4h.01 M12 4h.01 M18 4h.01 M6 10h.01 M12 10h.01 M18 10h.01 M6 16h.01 M12 16h.01 M18 16h.01 M12 22h.01"
CIRCLE = "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0"
INFO = CIRCLE + " M12 16v-5 M12 8h.01"
HELP = CIRCLE + " M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01"
ALERT = "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01"
REFRESH = "M23 4v6h-6 M1 20v-6h6 M3.5 9a9 9 0 0 1 14.9-3.4L23 10 M1 14l4.6 4.4A9 9 0 0 0 20.5 15"
SLIDERS = "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6"
PIN = "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z M14.5 10a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0"
MAP = "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z M8 2v16 M16 6v16"
PENCIL = "M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"
WIFI = ["M12 20h.01", "M8.5 16.4a5 5 0 0 1 7 0", "M5 12.9a10 10 0 0 1 14 0", "M1.4 9a15 15 0 0 1 21.2 0"]
SKIP_FWD = "M5 4l10 8-10 8z M17 5h3v14h-3z"
SKIP_BACK = "M19 20L9 12l10-8z M4 5h3v14H4z"
SEEK_FWD = "M2 5l9 7-9 7z M11 5l9 7-9 7z M20 5h2.5v14H20z"
SEEK_BACK = "M22 19l-9-7 9-7z M13 19l-9-7 9-7z M1.5 5H4v14H1.5z"
CW = "M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5"
CCW = "M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5"

WHITE, ACCENT, GREEN, RED, AMBER = "#FFFFFF", "#FFB547", "#4AD98B", "#FF6B5E", "#FFC24A"


def _text(t, size=7.5):
    return ('<text x="12" y="15.2" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="%s" '
            'font-weight="bold" fill="currentColor" stroke="none">%s</text>') % (size, t)


# name (without "IcnUmp" / "IcnList" and state suffix) -> (stroke paths, filled paths, colour or None, extra svg)
G = {}


def g(names, stroke="", fill="", colour=None, extra=""):
    for n in names.split():
        G[n] = (stroke, fill, colour, extra)


# ---- media bar (IcnUmp*)
g("PlayPause_Play", fill="M7 4l13 8-13 8z")
g("PlayPause_Pause", fill="M6 4h4v16H6z M14 4h4v16h-4z")
g("PlayPause_Stop", fill="M6 6h12v12H6z")
g("PlayOrPause", fill="M2 5l9 7-9 7z M14 5h2.6v14H14z M19.4 5H22v14h-2.6z")
g("NextChannel", fill=SKIP_FWD)
g("PreviousChannel", fill=SKIP_BACK)
g("NextAudio", fill=SEEK_FWD)
g("PreviousAudio", fill=SEEK_BACK)
g("NextStation", fill="M4 8h16l-8 10z")
g("PreviousStation", fill="M4 16h16L12 6z")
g("Fwd", "M4 12h15 M13 6l6 6-6 6")
g("Back", "M15 5l-7 7 7 7")
g("Fwd15s", CW, extra=_text("15"))
g("Fwd30s", CW, extra=_text("30"))
g("Back15s", CCW, extra=_text("15"))
g("Back30s", CCW, extra=_text("30"))
g("Shuffle_Off", SHUFFLE)
g("Shuffle_On Shuffle_Folder", SHUFFLE, colour=ACCENT)
g("Repeat_None", REPEAT)
g("Repeat_List", REPEAT, colour=ACCENT)
g("Repeat_Song", REPEAT, colour=ACCENT, extra=_text("1", 7))
g("Scan_Unsel", "M3 20v-8 M7 20V6 M11 20v-10", fill="M14 7l8 5-8 5z")
g("Scan", "M3 20v-8 M7 20V6 M11 20v-10", fill="M14 7l8 5-8 5z", colour=ACCENT)
g("Scan_Folder", FOLDER, fill="M10 10l5 3-5 3z", colour=ACCENT)
g("Favorite_Unfavorite", STAR)
g("Favorite_Favorite", fill=STAR, colour=ACCENT)
g("Bookmark_Unsel", "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z")
g("Bookmark", fill="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z", colour=ACCENT)
g("Equalizer", "M4 20v-6 M8 20V8 M12 20V10 M16 20V5 M20 20v-9")
g("Tune VideoSet", SLIDERS)
g("AutoMem", WIFI[0] + " " + WIFI[1] + " " + WIFI[2] + " " + WIFI[3])
g("Program ConnectionManager", BROADCAST)
g("LiveStreaming", BROADCAST, colour=ACCENT)
g("CurrentList TopList", LIST)
g("EntMenu Genre", NOTE)
g("AddSong More", "M9 18V5l12-2v7 M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0 M18 14v8 M14 18h8")
g("CommMenu", CHAT)
g("Apps", "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z")
g("Settings CtrlPanel", GEAR)
g("Info", INFO)
g("Help", HELP)
g("Hide CloseUmp", "M6 6l6 6 6-6 M6 13l6 6 6-6")
g("ScrollDown", "M5 9l7 7 7-7")
g("ScrollUp", "M5 15l7-7 7 7")
g("Plus", "M12 5v14 M5 12h14")
g("Minus", "M5 12h14")
g("Plus_Hd", "M12 5v14 M5 12h14", colour=ACCENT)
g("Minus_Hd", "M5 12h14", colour=ACCENT)
g("NextChannel_Hd", fill=SKIP_FWD, colour=ACCENT)
g("PreviousChannel_Hd", fill=SKIP_BACK, colour=ACCENT)
g("NextAudio_Hd", fill=SEEK_FWD, colour=ACCENT)
g("PreviousAudio_Hd", fill=SEEK_BACK, colour=ACCENT)
g("Eject", "M5 19h14", fill="M12 4l8 10H4z")
g("Folder_Down", FOLDER + " M12 10v6 M9 13l3 3 3-3")
g("Folder_Up", FOLDER + " M12 16v-6 M9 13l3-3 3 3")
g("Delete", TRASH)
g("Map", MAP)
g("Reset", REFRESH)
g("SwitchView", "M3 3h8v8H3z M13 13h8v8h-8z M14 7h7 M18 4l3 3-3 3")
g("Reply", "M9 17l-5-5 5-5 M20 18v-2a4 4 0 0 0-4-4H4")
g("ReplyToAll", "M7 17l-5-5 5-5 M12 17l-5-5 5-5 M22 18v-2a4 4 0 0 0-4-4H7")
# calls
g("Call", PHONE, colour=GREEN)
g("Hangup", fill="M2.3 13.6c-.5-.5-.6-1.3-.2-1.9C4.8 8.2 8.2 6.5 12 6.5s7.2 1.7 9.9 5.2c.4.6.3 1.4-.2 1.9l-2 2"
                  "c-.5.5-1.3.6-1.9.2l-2.3-1.6c-.4-.3-.6-.7-.6-1.2v-1.8c-1.9-.6-3.9-.6-5.8 0V13c0 .5-.2.9-.6 1.2l-2.3 1.6"
                  "c-.6.4-1.4.3-1.9-.2z", colour=RED)
g("AddCall", PHONE + " M18 2v6 M15 5h6")
g("AddContact", USER_PLUS)
g("Dialpad", DOTS)
g("Mic BargeIn", MIC)
g("MuteUnmute_Mute CallVol_Mute", MIC_OFF)
g("MuteUnmute_Unmute", MIC_OFF, colour=RED)
g("CallVol_01", PHONE)
g("CallVol_02", PHONE + " M15 5a5 5 0 0 1 4 4")
g("CallVol_03", PHONE + " M15 5a5 5 0 0 1 4 4 M15 1a9 9 0 0 1 8 8")
g("SwapCalls_01 SwapCalls_02", "M7 16V4 M3 8l4-4 4 4 M17 8v12 M21 16l-4 4-4-4")
g("Mergecall", "M8 6l4-4 4 4 M12 2v10.3a4 4 0 0 1-1.2 2.8L4 22 M20 22l-5-5")
g("PhoneRoute_Handset", "M7 2h10v20H7z M11 18h2")
g("PhoneRoute_Vehicle", CAR)

UMP = dict(G)
G.clear()

# ---- list rows (IcnList*)
g("Call_Incoming IncomingCalls", PHONE + " M16 2v6h6 M23 1l-7 7", colour=GREEN)
g("Call_Outgoing OutgoingCalls", PHONE + " M16 8l7-7 M17 1h6v6")
g("Call_Missed", PHONE + " M23 1l-6 6 M17 1l6 6", colour=RED)
g("Call_Recent", CIRCLE + " M12 7v5l3 2")
g("UnknownCalls", PHONE + " M16 2.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5 M18.5 8.5h.01")
g("Phone", PHONE)
g("Contact Contacts Person Contact_Placeholder", USER)
g("Contact_Unavailable", USER, colour="#9AA0AA")
g("AddRecipient", USER_PLUS)
g("RemoveRecipient", USER_MINUS)
g("Sms PresetResponse", CHAT)
g("Email Envelope Inbox Outbox Drafts EmailPending SMSPending", MAIL)
g("Compose Rename", PENCIL)
g("Voicemail", "M10 15.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0 M23 15.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0 M5.5 20h13")
g("Dialpad", DOTS)
g("Keyboard", "M2 6h20v12H2z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M7 14h10")
g("Bluetooth_On BluetoothSettings BtConnType_Both BtConnType_Music BtConnType_Phone", BT)
g("Bluetooth_Off", BT, colour="#9AA0AA")
g("Fm Am Dab", BROADCAST)
g("Usb", "M12 2v16 M9 5l3-3 3 3 M7 9v3l5 3 M17 7v3l-5 3 M14 20a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M6 7h2v2H6z M16 5a1 1 0 1 1 2 0a1 1 0 1 1-2 0")
g("Audio Song Song_Placeholder", NOTE)
g("Song_Unavailable", NOTE, colour="#9AA0AA")
g("Album CdPlayer", DISC)
g("Artist", MIC)
g("Playlist", "M3 6h12 M3 12h12 M3 18h7 M17 18V9l5-1 M17 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0")
g("Folder Folder_Closed TopList", FOLDER)
g("Folder_Open", "M3 18V6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2 M3 18l3-7h17l-3 7z")
g("FolderUp", FOLDER + " M12 16v-6 M9 13l3-3 3 3")
g("EntNowPlaying", "M4 20v-6 M9 20V8 M14 20V11 M19 20V5", colour=ACCENT)
g("Settings", GEAR)
g("Delete", TRASH)
g("CancelImport", CIRCLE + " M15 9l-6 6 M9 9l6 6")
g("Import", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3")
g("Synchronize Replace", REFRESH)
g("Move", "M5 9l-3 3 3 3 M9 5l3-3 3 3 M15 19l-3 3-3-3 M19 9l3 3-3 3 M2 12h20 M12 2v20")
g("Help", HELP)
g("Globe", CIRCLE + " M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18")
g("NavPoi CarFinder", PIN)
g("OilLife", "M12 2.7l5.7 5.7a8 8 0 1 1-11.3 0z")
g("Coolant", "M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z")
g("Tire", "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M16 12a4 4 0 1 1-8 0a4 4 0 1 1 8 0")
g("CarBattery", "M2 7h20v12H2z M6 4v3 M18 4v3 M5 13h4 M15 13h4 M17 11v4")
g("Brake", CIRCLE + " M12 8v5 M12 16h.01")
g("VehicleHealth ServiceNotifications DealerInfo", "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9"
  "l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z")
g("CarHealthGreen_Med CarHealthGreen_Small", CIRCLE + " M8 12l3 3 5-6", colour=GREEN)
g("CarHealthAmber_Med CarHealthAmber_Small", CIRCLE + " M12 7v6 M12 16.5h.01", colour=AMBER)
g("CarHealthRed_Med CarHealthRed_Small", CIRCLE + " M12 7v6 M12 16.5h.01", colour=RED)
g("ExclamationPoint EmergencyBroadcast", ALERT, colour=AMBER)
g("DrivingStats Reporting", "M18 20V10 M12 20V4 M6 20v-6")
g("Shuffle_Off", SHUFFLE)
g("ReplicatedMobileScreen", "M7 2h10v20H7z M11 18h2")
for _i in range(5):
    g("Wifi_0%d WifiSecure_0%d" % (_i, _i), " ".join(WIFI[:_i + 1]), extra='<path d="%s" opacity="0.3"/>' % " ".join(WIFI[_i + 1:])
      if _i < 3 else "")
g("WifiHotspot WifiHotspot_On", BROADCAST)
g("WifiHotspot_Off WifiHotspot_Error", BROADCAST, colour="#9AA0AA")
for _d, _a in (("N", 0), ("NE", 45), ("E", 90), ("SE", 135), ("S", 180), ("SW", 225), ("W", 270), ("NW", 315)):
    g("Dir_" + _d, extra='<path d="M12 3l6 16-6-4-6 4z" fill="currentColor" stroke="none" transform="rotate(%d 12 12)"/>' % _a)

LISTICONS = dict(G)
STATE = re.compile(r"_(Sel_En|Sel_Ds|En|Ds)$")


def icon_for(file_name):
    """(glyph, colour, opacity) for a Mazda icon file name, or None to keep Mazda's icon."""
    stem = file_name[:-4]
    fam, table = ("IcnUmp", UMP) if stem.startswith("IcnUmp") else ("IcnList", LISTICONS)
    stem = stem[len(fam):]
    m = STATE.search(stem)
    state = m.group(1) if m else ""
    base = stem[:m.start()] if m else stem
    glyph = table.get(base)
    if glyph is None:
        return None
    opacity = 0.35 if state.endswith("Ds") else 1.0
    return glyph, opacity


def icon_svg(file_name, w, h):
    found = icon_for(file_name)
    if not found:
        return None
    (stroke, fill, colour, extra), opacity = found
    colour = colour or WHITE
    box = min(w, h) * (0.70 if file_name.startswith("IcnUmp") else 0.72)
    s = box / 24.0
    x, y = (w - box) / 2.0, (h - box) / 2.0
    body = ""
    if stroke:
        body += '<path d="%s" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' % stroke
    if fill:
        body += '<path d="%s" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>' % fill
    if extra:
        body += ('<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</g>'
                 % extra)
    return ('<g color="%s" opacity="%s" transform="translate(%.2f %.2f) scale(%.4f)">%s</g>'
            % (colour, opacity, x, y, s, body))
