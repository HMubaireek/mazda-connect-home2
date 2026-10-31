/*
 * Home 2.0 "Ember Glass" launcher for Mazda Connect (CMU 150, firmware 74.x)
 * Version @VERSION@, "Ember Glance" layout (live car, phone and media status) — see README.md
 *
 * The installer (run.sh) recognises an installed launcher by the first line above: keep it.
 *
 * Drop-in replacement for /jci/gui/apps/system/controls/MainMenu/js/MainMenuCtrl.js.
 * It keeps the public API the stock system app uses (constructor, handleControllerEvent,
 * setText, getRemoteUiButtonStatus, transitions, context capture, cleanUp), so no other
 * Mazda file needs to change.
 *
 * Written for the Opera Presto engine in the CMU: ES5 only, no flexbox.
 *
 * Apache License 2.0. Not affiliated with Mazda.
 */

log.addSrcFile("MainMenuCtrl.js", "system");

/* ---------- configuration ---------- */
var HOME2_CONFIG = {
    // Use Arabic-Indic digits (٠١٢٣) when the system language is Arabic.
    arabicDigits : true,
    // How often to re-read the phone and car status from the system app (ms).
    statusPollMs : 1000,
    // How often to refresh the clock (ms).
    clockMs : 5000,
    // Show a small line saying whether the Tajawal font loaded (for testing on the car).
    fontCheck : false
};

// Font family names, as written inside the installed .ttf files (see tools/rename_fonts.py).
var HOME2_FONTS = ["Home2 Tajawal Bold", "Home2 Tajawal Medium", "Home2 Tajawal Light"];

// Status the system app receives as messages but does not keep (see _hookSystemMessages).
// Kept outside the control so it survives the home screen being rebuilt.
var HOME2_LIVE = { call : null, audioSource : null, audioPlaying : false, audioPending : null };

/* ---------- static text ---------- */
var HOME2_TEXT = {
    ar : {
        labels : { nav : "الملاحة", ent : "الوسائط", com : "الهاتف", set : "الإعدادات", app : "التطبيقات" },
        androidauto : "أندرويد أوتو",
        carplay : "آبل كاربلاي",
        phoneSub : "متصل · اضغط للفتح",
        parked : "متوقفة",
        driving : "أثناء القيادة",
        carOk : "السيارة سليمة",
        carOkSub : "لا تحذيرات · لا صيانة مستحقة",
        warnings : ["تحذير واحد في السيارة", "تحذيران في السيارة", "تحذيرات في السيارة", "تحذيرًا في السيارة"],
        serviceDue : "الصيانة مستحقة",
        serviceAlso : "والصيانة مستحقة",
        noService : "لا صيانة مستحقة",
        serviceOnlySub : "لا تحذيرات · اضغط للتفاصيل",
        call : "مكالمة جارية",
        callSub : "اضغط للعودة",
        phoneFallback : "الجوال",
        noBt : "لا يوجد جوال بلوتوث",
        noNews : "لا مكالمات أو رسائل جديدة",
        missed : ["مكالمة فائتة", "مكالمتان فائتتان", "مكالمات فائتة", "مكالمة فائتة"],
        texts : ["رسالة جديدة", "رسالتان جديدتان", "رسائل جديدة", "رسالة جديدة"],
        sources : { FMRadio : "راديو FM", AMRadio : "راديو AM", DAB : "راديو DAB", USB_A : "USB", USB_B : "USB",
                    BTAudio : "صوت بلوتوث", AndroidAuto : "أندرويد أوتو", CarPlay : "كاربلاي", AuxIn : "AUX", CD : "CD" },
        sourceOther : "الوسائط",
        playing : "يعمل الآن",
        paused : "متوقف مؤقتًا",
        audioOff : "الصوت متوقف",
        audioOffSub : "اضغط لاختيار مصدر",
        sep : " · ",
        am : "ص",
        pm : "م",
        days : ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
        months : ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
        hijriMonths : ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
        hijriSuffix : " هـ",
        dateSep : "، "
    },
    en : {
        labels : { nav : "Navigation", ent : "Media", com : "Phone", set : "Settings", app : "Apps" },
        androidauto : "Android Auto",
        carplay : "Apple CarPlay",
        phoneSub : "Connected · tap to open",
        parked : "Parked",
        driving : "Driving",
        carOk : "Car is OK",
        carOkSub : "No warnings · no service due",
        warnings : ["1 warning", "2 warnings", "warnings", "warnings"],
        serviceDue : "Service due",
        serviceAlso : "and service is due",
        noService : "No service due",
        serviceOnlySub : "No warnings · tap for details",
        call : "Call in progress",
        callSub : "tap to return",
        phoneFallback : "Phone",
        noBt : "No Bluetooth phone",
        noNews : "No new calls or messages",
        missed : ["1 missed call", "2 missed calls", "missed calls", "missed calls"],
        texts : ["1 new message", "2 new messages", "new messages", "new messages"],
        sources : { FMRadio : "FM radio", AMRadio : "AM radio", DAB : "DAB radio", USB_A : "USB", USB_B : "USB",
                    BTAudio : "Bluetooth audio", AndroidAuto : "Android Auto", CarPlay : "CarPlay", AuxIn : "AUX", CD : "CD" },
        sourceOther : "Media",
        playing : "Playing",
        paused : "Paused",
        audioOff : "Audio off",
        audioOffSub : "Tap to choose a source",
        sep : " · ",
        am : "AM",
        pm : "PM",
        days : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        months : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        hijriMonths : ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"],
        hijriSuffix : " AH",
        dateSep : ", "
    }
};

// Media row chip for each audio source the system app reports.
var HOME2_SOURCE_CHIP = { FMRadio : "radio", AMRadio : "radio", DAB : "radio", USB_A : "usb", USB_B : "usb",
                          BTAudio : "btaudio", AndroidAuto : "aa", CarPlay : "cp" };

/* ---------- constructor ---------- */
function MainMenuCtrl(uiaId, parentDiv, controlId, properties)
{
    this.uiaId = uiaId;
    this.divElt = null;
    this.controlId = controlId;

    this.properties =
    {
        "appData" : null,
        "selectCallback" : null,
        "tiltHoldTime" : 1500,
        "tiltStepTime" : 500
    };

    for (var i in properties)
    {
        this.properties[i] = properties[i];
    }

    // Focus order: Android Auto / CarPlay pill, the three status rows, then the dock.
    // "key" is the icon code the stock system app expects in the select callback.
    this._items =
    [
        { key : "phone", nameId : null },
        { key : "app",   nameId : null, row : "car" },     // opens Applications (warnings, maintenance)
        { key : "com",   nameId : null, row : "phone" },   // opens Communication (active call, call history, SMS)
        { key : "ent",   nameId : null, row : "media" },   // opens Entertainment
        { key : "nav",   nameId : "NavigationTitle" },
        { key : "ent",   nameId : "Entertainment" },
        { key : "com",   nameId : "Communication" },
        { key : "set",   nameId : "Settings" },
        { key : "app",   nameId : "Applications" }
    ];
    this._firstRow = 1;
    this._lastRow = 3;
    this._firstDock = 4;

    this._lang = this._detectLanguage();
    this._isArabic = (this._lang === "ar_SA");
    this._isRtl = (this._lang === "ar_SA" || this._lang === "he_IL");
    this._text = this._isArabic ? HOME2_TEXT.ar : HOME2_TEXT.en;

    this._phone = "none";               // "none" | "androidauto" | "carplay"
    this._status = null;                // last status read from the system app
    this._statusKey = "";               // to redraw only when something changed
    this._focus = 0;                    // index of the item with logical focus
    this._highlighted = -1;             // index visibly highlighted, -1 for none
    this._prvFocus = -1;                // focus remembered while another control has focus
    this._pressedIndex = -1;            // index under a touch press
    this._hasInvokedSelectCallback = false;
    this._lastControllerStartEvent = "";
    this._allowInput = true;
    this._allowInputTimerId = null;
    this._tiltHoldTimerId = null;
    this._fastTiltStepIntervalId = null;
    this._fastTiltDirection = 0;
    this._clockTimerId = null;
    this._statusTimerId = null;

    this.createStructure();
    parentDiv.appendChild(this.divElt);
    this.init();
}

/* ---------- environment helpers ---------- */
MainMenuCtrl.prototype._detectLanguage = function()
{
    try
    {
        if (framework && framework.localize && framework.localize.getCurrentLanguage)
        {
            return framework.localize.getCurrentLanguage() || "en_US";
        }
    }
    catch (e) {}
    return "en_US";
};

MainMenuCtrl.prototype._label = function(item)
{
    // Arabic and English use the short Home 2.0 labels. Other languages use Mazda's own translations.
    if (this._isArabic || this._lang.indexOf("en_") === 0 || !item.nameId)
    {
        return this._text.labels[item.key] || "";
    }
    try
    {
        var s = framework.localize.getLocStr(this.uiaId, item.nameId);
        if (s) { return s; }
    }
    catch (e) {}
    return HOME2_TEXT.en.labels[item.key] || "";
};

MainMenuCtrl.prototype._digits = function(str)
{
    if (!(this._isArabic && HOME2_CONFIG.arabicDigits))
    {
        return str;
    }
    var map = "٠١٢٣٤٥٦٧٨٩";
    var out = "";
    for (var i = 0; i < str.length; i++)
    {
        var c = str.charAt(i);
        out += (c >= "0" && c <= "9") ? map.charAt(c.charCodeAt(0) - 48) : c;
    }
    return out;
};

// Count phrases: forms = [one, two, 3-10, 11+]. Arabic needs all four; English uses "<n> <word>" from 3 up.
MainMenuCtrl.prototype._count = function(n, forms)
{
    if (n === 1) { return this._digits(forms[0]); }
    if (n === 2) { return this._digits(forms[1]); }
    return this._digits(String(n)) + " " + (n <= 10 ? forms[2] : forms[3]);
};

MainMenuCtrl.prototype._el = function(tag, className, parent, text)
{
    var e = document.createElement(tag);
    if (className) { e.className = className; }
    if (typeof text === "string") { e.appendChild(document.createTextNode(text)); }
    if (parent) { parent.appendChild(e); }
    return e;
};

MainMenuCtrl.prototype._setText = function(el, text)
{
    while (el.firstChild) { el.removeChild(el.firstChild); }
    el.appendChild(document.createTextNode(text));
};

/* ---------- structure ---------- */
MainMenuCtrl.prototype.createStructure = function()
{
    this.divElt = document.createElement("div");
    this.divElt.id = this.controlId;
    this.divElt.className = "MainMenuCtrl H2Root H2NoPhone " + (this._isRtl ? "H2Rtl" : "H2Ltr");

    // Clock + dates
    var clock = this._el("div", "H2Clock", this.divElt);
    var timeLine = this._el("div", "H2TimeLine", clock);
    this._timeEl = this._el("span", "H2Time", timeLine, "");
    this._ampmEl = this._el("span", "H2AmPm", timeLine, "");
    this._dateEl = this._el("div", "H2Date", clock, "");
    this._hijriEl = this._el("div", "H2Hijri", clock, "");

    // Driving / parked chip and the Android Auto / CarPlay pill, side by side under the date
    var line = this._el("div", "H2StatusLine", this.divElt);
    this._driveEl = this._el("div", "H2Drive H2Parked", line);
    this._el("span", "H2DriveIcon", this._driveEl);
    this._driveText = this._el("span", "H2DriveText", this._driveEl, this._text.parked);
    var pill = this._el("div", "H2Card H2Pill", line);
    this._pillChip = this._el("div", "H2PillChip", pill);
    this._pillTitle = this._el("div", "H2PillTitle", pill, "");
    this._el("div", "H2PillSub", pill, this._text.phoneSub);
    this._items[0].div = pill;

    // Status card: car, phone, media
    var card = this._el("div", "H2Glance", this.divElt);
    this._el("div", "H2Rule H2Rule1", card);
    this._el("div", "H2Rule H2Rule2", card);
    for (var r = this._firstRow; r <= this._lastRow; r++)
    {
        var item = this._items[r];
        var row = this._el("div", "H2Card H2Row H2Row" + r, card);
        item.chip = this._el("div", "H2RowChip", row);
        item.title = this._el("div", "H2RowTitle", row, "");
        item.sub = this._el("div", "H2RowSub", row, "");
        item.badge = this._el("div", "H2Badge H2RowBadge", row, "");
        if (item.row === "media")
        {
            var eq = this._el("div", "H2Eq", row);
            this._el("div", "H2EqBar H2EqBar1", eq);
            this._el("div", "H2EqBar H2EqBar2", eq);
            this._el("div", "H2EqBar H2EqBar3", eq);
            item.eq = eq;
        }
        item.div = row;
    }

    // Dock tiles
    for (var i = this._firstDock; i < this._items.length; i++)
    {
        var d = this._items[i];
        var tile = this._el("div", "H2Card H2Dock H2Dock" + (i - this._firstDock + 1), this.divElt);
        this._el("div", "H2DockChip H2Chip-" + d.key, tile);
        this._el("div", "H2DockLabel", tile, this._label(d));
        d.badge = this._el("div", "H2Badge H2DockBadge", tile, "");
        d.div = tile;
    }

    // Kept for API compatibility: the system app writes the CarPlay/Android Auto
    // status-bar button name here via setText(). Not shown.
    this._iconNameDiv = this._el("div", "MainMenuCtrlIconName", this.divElt);

    if (HOME2_CONFIG.fontCheck)
    {
        this._fontCheckEl = this._el("div", "H2FontCheck", this.divElt, "");
    }

    this._applyStatus(this._emptyStatus());
};

// Reports whether each Home 2.0 font is available, by comparing the width of a sample
// drawn in that font against the same text in a font name that cannot exist.
MainMenuCtrl.prototype._checkFonts = function()
{
    if (!this._fontCheckEl) { return; }
    // Arabic and Latin are checked separately: the browser can use a font for one script
    // and fall back to another font for the other.
    var samples = { ar : "وصّل جوالك الإعدادات", en : "Android Auto 0123" };
    var probe = this._el("span", "H2FontProbe", this.divElt, "");
    var self = this;
    function width(text, family)
    {
        self._setText(probe, text);
        probe.style.fontFamily = family;
        return probe.offsetWidth;
    }
    var parts = [];
    for (var i = 0; i < HOME2_FONTS.length; i++)
    {
        var fam = "'" + HOME2_FONTS[i] + "', 'H2NoSuchFont', monospace";
        var ar = width(samples.ar, fam) !== width(samples.ar, "'H2NoSuchFont', monospace");
        var en = width(samples.en, fam) !== width(samples.en, "'H2NoSuchFont', monospace");
        parts.push(HOME2_FONTS[i].replace("Home2 Tajawal ", "") + " AR " + (ar ? "OK" : "NO") + " EN " + (en ? "OK" : "NO"));
    }
    this.divElt.removeChild(probe);
    this._setText(this._fontCheckEl, "Font check: " + parts.join("  |  "));
};

MainMenuCtrl.prototype.init = function()
{
    this._mouseDownCallback = this._mouseDown.bind(this);
    this._mouseUpCallback = this._mouseUp.bind(this);
    this._mouseMoveCallback = this._mouseMove.bind(this);
    document.body.addEventListener("mousedown", this._mouseDownCallback);

    this._updateClock();
    this._clockTimerId = setInterval(this._updateClock.bind(this), HOME2_CONFIG.clockMs);

    this._hookSystemMessages();
    home2HookStatusBar();
    this._pollStatus();
    this._statusTimerId = setInterval(this._pollStatus.bind(this), HOME2_CONFIG.statusPollMs);

    // Start on the Android Auto / CarPlay pill when a phone is connected, otherwise on Navigation.
    this._setFocus(this._phone === "none" ? this._firstDock : 0);

    this._checkFonts();
    if (this._fontCheckEl)
    {
        // Check again once the page has settled, in case fonts were still loading.
        this._fontCheckTimerId = setTimeout(this._checkFonts.bind(this), 3000);
    }
};

/* ---------- clock ---------- */
MainMenuCtrl.prototype._pad = function(n)
{
    return (n < 10 ? "0" : "") + n;
};

// The CMU's own Linux clock is usually never set (it starts at 1 January 1970).
// The real time comes from the system as a message and is cached by the framework,
// which is also what Mazda's status-bar clock shows. Use that; fall back to the OS clock
// only if it looks valid. Returns null when no valid time is known yet.
MainMenuCtrl.prototype._now = function()
{
    var t = 0;
    try { t = framework.common.getCurrentTime(); } catch (e) {}
    var d = (typeof t === "number" && t > 0) ? new Date(t) : new Date();
    if (isNaN(d.getTime()) || d.getFullYear() < 2020)
    {
        return null;
    }
    return d;
};

MainMenuCtrl.prototype._updateClock = function()
{
    var now = this._now();
    if (!now)
    {
        // Time not known yet: show nothing rather than a 1970 date.
        this._setText(this._timeEl, "");
        this._setText(this._ampmEl, "");
        this._setText(this._dateEl, "");
        this._setText(this._hijriEl, "");
        return;
    }

    var h = now.getHours();
    var m = now.getMinutes();
    var fmt = null;
    try { fmt = framework.localize.getTimeFormat(); } catch (e) {}

    var timeStr;
    var ampm = "";
    if (fmt === "12hrs")
    {
        ampm = (h >= 12) ? this._text.pm : this._text.am;
        var h12 = h % 12;
        if (h12 === 0) { h12 = 12; }
        timeStr = h12 + ":" + this._pad(m);
    }
    else
    {
        timeStr = this._pad(h) + ":" + this._pad(m);
    }

    this._setText(this._timeEl, this._digits(timeStr));
    this._setText(this._ampmEl, ampm);

    var t = this._text;
    var dateStr = t.days[now.getDay()] + t.dateSep + now.getDate() + " " + t.months[now.getMonth()];
    this._setText(this._dateEl, this._digits(dateStr));

    var hj = (typeof Home2Hijri !== "undefined") ? Home2Hijri.fromDate(now) : null;
    if (hj)
    {
        this._setText(this._hijriEl, this._digits(hj.day + " " + t.hijriMonths[hj.month - 1] + " " + hj.year) + t.hijriSuffix);
    }
    else
    {
        this._setText(this._hijriEl, "");
    }
};

/* ---------- status from the system app ---------- */
MainMenuCtrl.prototype._sysApp = function()
{
    try
    {
        return framework._appInstances ? framework._appInstances[this.uiaId] : null;
    }
    catch (e) {}
    return null;
};

MainMenuCtrl.prototype._findItem = function(list, mmuiEvent)
{
    if (!list || !list.items) { return null; }
    for (var i = 0; i < list.items.length; i++)
    {
        var it = list.items[i];
        if (it && it.appData && it.appData.mmuiEvent === mmuiEvent) { return it; }
    }
    return null;
};

MainMenuCtrl.prototype._labelCount = function(item)
{
    var n = item ? parseInt(item.label1, 10) : 0;
    return isNaN(n) ? 0 : n;
};

// Two status messages are not kept by the system app in a form we can read back:
// on firmware 74 its active-call handler never sets the Active Call item (its check can
// never be true), and the audio message only leaves a "now playing" icon while playing.
// Observe both messages on their way to the system app's own handlers, which still run.
MainMenuCtrl.prototype._hookSystemMessages = function()
{
    var app = this._sysApp();
    if (!app || !app._messageTable || app._messageTable._home2Hooked) { return; }

    function observe(msgId, record)
    {
        var original = app._messageTable[msgId];
        app._messageTable[msgId] = function(msg)
        {
            try { record(msg && msg.params ? msg.params.payload : null); } catch (e) {}
            if (typeof original === "function") { return original(msg); }
        };
    }

    observe("StatusPhoneCall", function(p)
    {
        if (p && p.phoneCallStatus)
        {
            HOME2_LIVE.call = (p.phoneCallStatus === "ActiveCall" || p.phoneCallStatus === "Connecting");
        }
    });
    observe("StatusUpdateAudioSource", function(p)
    {
        if (p && p.statusAudio && p.statusAudio.audioSource)
        {
            var src = p.statusAudio.audioSource;
            if (src === "CarPlayWifi") { src = "CarPlay"; }
            var playing = (p.statusAudio.audioActive === "Play");
            var live = HOME2_LIVE;
            if (playing)
            {
                live.audioSource = src;
                live.audioPlaying = true;
                live.audioPending = null;
            }
            else if (src === live.audioSource)
            {
                // The current source stopped. If another source was chosen meanwhile, it is current now.
                live.audioPlaying = false;
                if (live.audioPending)
                {
                    live.audioSource = live.audioPending;
                    live.audioPending = null;
                }
            }
            else if (!live.audioPlaying)
            {
                live.audioSource = src;
            }
            else
            {
                // Messages can arrive in either order when switching sources: this one is either the
                // new source (paused) or an old one switching off. Decide when the playing source stops.
                live.audioPending = src;
            }
        }
    });
    app._messageTable._home2Hooked = true;
};

MainMenuCtrl.prototype._emptyStatus = function()
{
    return { phone : "none", warnings : 0, service : false, missed : 0, texts : 0, call : false,
             btName : "", audioSource : "", audioPlaying : false, driving : false };
};

MainMenuCtrl.prototype._readPhoneState = function(app)
{
    var state = "none";

    // 1. The CarPlay / Android Auto button the system app registers for the home screen.
    try
    {
        var btns = framework.common._remoteUiBtns;
        var cfg = btns ? btns[this.uiaId] : null;
        if (cfg && (cfg.appName === "androidauto" || cfg.appName === "carplay"))
        {
            state = cfg.appName;
        }
    }
    catch (e) {}

    // 2. Fallback: the system app's Entertainment list (filled even before the home screen exists).
    if (state === "none" && app)
    {
        try
        {
            var list = app._masterEntertainmentDataList;
            if (list && list.items)
            {
                for (var i = 0; i < list.items.length; i++)
                {
                    var it = list.items[i];
                    if (it.disabled === false && it.appData)
                    {
                        if (it.text1Id === "USB1AndroidAuto") { state = "androidauto"; break; }
                        if (it.text1Id === "USB1CarPlay") { state = "carplay"; break; }
                    }
                }
            }
        }
        catch (e2) {}
    }

    return state;
};

// Everything the home screen shows, read from what the system app already keeps for its own menus.
MainMenuCtrl.prototype._readStatus = function()
{
    var s = this._emptyStatus();
    var app = this._sysApp();
    s.phone = this._readPhoneState(app);

    try { s.driving = (framework.common.getAtSpeedValue() === true); } catch (e) {}

    if (!app) { return s; }
    try
    {
        // Applications list: warning count on Warning Guidance; maintenance due flag.
        s.warnings = this._labelCount(this._findItem(app._masterApplicationDataList, "SelectWarnGuide"));
        s.service = (app._SchedMaintDueStatus === true);

        // Communication list: missed calls on Call History, unread counts on SMS and Email.
        var comm = app._communicationsDataList;
        s.missed = this._labelCount(this._findItem(comm, "SelectCallHistory"));
        s.texts = this._labelCount(this._findItem(comm, "SelectSms")) + this._labelCount(this._findItem(comm, "SelectEmail"));
        var active = this._findItem(comm, "SelectActiveCall");
        s.call = (HOME2_LIVE.call === true) || (HOME2_LIVE.call === null && active && active.appData.isVisible === true) || false;

        // Entertainment list: the Bluetooth phone's name, and the source with the "now playing" icon.
        var ent = app._masterEntertainmentDataList;
        var bt = this._findItem(ent, "SelectBTAudio");
        if (bt && bt.text1SubMap && typeof bt.text1SubMap.deviceName === "string")
        {
            s.btName = bt.text1SubMap.deviceName;
        }
        if (ent && ent.items)
        {
            for (var i = 0; i < ent.items.length; i++)
            {
                var it = ent.items[i];
                if (it.image1 && String(it.image1).indexOf("NowPlaying") !== -1 && it.appData)
                {
                    s.audioSource = it.appData.audioSourceId === "CarPlayWifi" ? "CarPlay" : it.appData.audioSourceId;
                    s.audioPlaying = true;
                    break;
                }
            }
        }
    }
    catch (e2) {}

    if (HOME2_LIVE.audioSource)
    {
        s.audioSource = HOME2_LIVE.audioSource;
        s.audioPlaying = HOME2_LIVE.audioPlaying;
    }
    return s;
};

MainMenuCtrl.prototype._pollStatus = function()
{
    var s = this._readStatus();
    var key = [s.phone, s.warnings, s.service, s.missed, s.texts, s.call, s.btName, s.audioSource, s.audioPlaying, s.driving].join("|");
    if (key !== this._statusKey)
    {
        this._statusKey = key;
        this._applyStatus(s);
    }
};

MainMenuCtrl.prototype._setChip = function(el, base, name)
{
    el.className = base + " " + base + "-" + name;
};

MainMenuCtrl.prototype._setClass = function(el, name, on)
{
    if (on) { el.classList.add(name); } else { el.classList.remove(name); }
};

MainMenuCtrl.prototype._setBadge = function(el, text, tone)
{
    this._setText(el, text);
    el.className = el.className.replace(/ ?H2Badge(On|Call|Warn)/g, "");
    if (text !== "")
    {
        el.className += " H2BadgeOn" + (tone ? " H2Badge" + tone : "");
    }
};

MainMenuCtrl.prototype._applyStatus = function(s)
{
    var t = this._text;
    this._status = s;

    // Android Auto / CarPlay pill
    var phoneChanged = (s.phone !== this._phone);
    this._phone = s.phone;
    this._setClass(this.divElt, "H2NoPhone", s.phone === "none");
    this._setChip(this._pillChip, "H2PillChip", s.phone === "carplay" ? "cp" : "aa");
    this._setText(this._pillTitle, s.phone === "carplay" ? t.carplay : t.androidauto);
    if (s.phone === "none" && phoneChanged)
    {
        // The pill went away: move focus off it.
        if (this._focus === 0)
        {
            this._focus = this._firstDock;
            if (this._highlighted === 0) { this._setHighlight(this._firstDock); }
        }
        if (this._prvFocus === 0) { this._prvFocus = this._firstDock; }
    }

    // Driving / parked
    this._driveEl.className = "H2Drive " + (s.driving ? "H2Driving" : "H2Parked");
    this._setText(this._driveText, s.driving ? t.driving : t.parked);

    // Car row
    var car = this._items[this._firstRow];
    var carAlert = (s.warnings > 0 || s.service);
    if (s.warnings > 0)
    {
        this._setChip(car.chip, "H2RowChip", "warn");
        this._setText(car.title, this._count(s.warnings, t.warnings));
        this._setText(car.sub, s.service ? t.serviceAlso : t.noService);
    }
    else if (s.service)
    {
        this._setChip(car.chip, "H2RowChip", "service");
        this._setText(car.title, t.serviceDue);
        this._setText(car.sub, t.serviceOnlySub);
    }
    else
    {
        this._setChip(car.chip, "H2RowChip", "ok");
        this._setText(car.title, t.carOk);
        this._setText(car.sub, t.carOkSub);
    }
    this._setClass(car.div, "H2Alert", s.warnings > 0 || s.service);
    this._setClass(car.div, "H2AlertSub", s.warnings > 0 && s.service);

    // Phone row
    var ph = this._items[this._firstRow + 1];
    var news = s.missed + s.texts;
    this._setClass(ph.div, "H2InCall", s.call);
    this._setClass(ph.div, "H2HasNews", !s.call && news > 0);
    this._setClass(ph.div, "H2Dim", !s.call && s.btName === "");
    if (s.call)
    {
        this._setChip(ph.chip, "H2RowChip", "call");
        this._setText(ph.title, t.call);
        this._setText(ph.sub, (s.btName || t.phoneFallback) + t.sep + t.callSub);
        this._setBadge(ph.badge, "");
    }
    else
    {
        this._setChip(ph.chip, "H2RowChip", s.btName ? "bt" : "btnone");
        this._setText(ph.title, s.btName || t.noBt);
        var parts = [];
        if (s.missed > 0) { parts.push(this._count(s.missed, t.missed)); }
        if (s.texts > 0) { parts.push(this._count(s.texts, t.texts)); }
        this._setText(ph.sub, parts.length ? parts.join(t.sep) : t.noNews);
        this._setBadge(ph.badge, news > 0 ? this._digits(String(news)) : "");
    }

    // Media row
    var md = this._items[this._lastRow];
    if (s.audioSource && s.audioSource !== "None" && s.audioSource !== "Off")
    {
        this._setChip(md.chip, "H2RowChip", HOME2_SOURCE_CHIP[s.audioSource] || "media");
        this._setText(md.title, t.sources[s.audioSource] || t.sourceOther);
        this._setText(md.sub, s.audioPlaying ? t.playing : t.paused);
        this._setClass(md.div, "H2Dim", false);
    }
    else
    {
        this._setChip(md.chip, "H2RowChip", "off");
        this._setText(md.title, t.audioOff);
        this._setText(md.sub, t.audioOffSub);
        this._setClass(md.div, "H2Dim", true);
    }
    this._setClass(md.div, "H2Playing", s.audioPlaying && !!s.audioSource);

    // Dock badges: Phone shows the unread count (or a green dot during a call); Apps flags car alerts.
    var comTile = this._items[this._firstDock + 2];
    var appTile = this._items[this._firstDock + 4];
    if (s.call) { this._setBadge(comTile.badge, "●", "Call"); }
    else { this._setBadge(comTile.badge, news > 0 ? this._digits(String(news)) : ""); }
    this._setBadge(appTile.badge, carAlert ? "!" : "", "Warn");
};

// The pill can only take focus while a phone is connected.
MainMenuCtrl.prototype._firstIndex = function()
{
    return (this._phone === "none") ? this._firstRow : 0;
};

/* ---------- focus + highlight ---------- */
MainMenuCtrl.prototype._getFocus = function()
{
    return this._focus;
};

MainMenuCtrl.prototype._setFocus = function(index)
{
    if (index >= 0 && index < this._items.length)
    {
        this._focus = index;
    }
};

// Show the highlight on the item with the given index; -1 clears it (another control has focus).
MainMenuCtrl.prototype._setHighlight = function(index)
{
    if (index === -1)
    {
        this._prvFocus = this._focus;
    }
    else
    {
        this._prvFocus = -1;
    }

    for (var i = 0; i < this._items.length; i++)
    {
        if (i === index)
        {
            this._items[i].div.classList.add("H2Focus");
        }
        else
        {
            this._items[i].div.classList.remove("H2Focus");
        }
    }
    this._highlighted = index;
};

MainMenuCtrl.prototype._moveTo = function(index)
{
    this._setFocus(index);
    this._setHighlight(index);
};

MainMenuCtrl.prototype._offsetFocus = function(direction)
{
    var index = this._focus + direction;
    if (index < this._firstIndex()) { index = this._firstIndex(); }
    if (index > this._items.length - 1) { index = this._items.length - 1; }

    if (index !== this._focus || this._highlighted !== index)
    {
        this._moveTo(index);
    }
};

// Tilting follows the screen: in right-to-left layouts the next item is on the left.
MainMenuCtrl.prototype._tiltDirection = function(direction)
{
    return this._isRtl ? -direction : direction;
};

/* ---------- select ---------- */
MainMenuCtrl.prototype._invokeSelectCallback = function(index)
{
    if (index < 0 || index >= this._items.length)
    {
        return;
    }

    // Briefly block input while the screen changes (never indefinitely).
    if (this._allowInput)
    {
        this._allowInput = false;
        this._allowInputTimerId = setTimeout(function() {
            this._allowInput = true;
            this._allowInputTimerId = null;
        }.bind(this), 1000);
    }

    this._moveTo(index);

    if (index === 0)
    {
        this._selectPhone();
        return;
    }

    this._hasInvokedSelectCallback = true;
    if (this.properties && this.properties.selectCallback)
    {
        this.properties.selectCallback(this, this.properties.appData, { "icon" : this._items[index].key });
    }
};

MainMenuCtrl.prototype._selectPhone = function()
{
    if (this._phone === "androidauto")
    {
        framework.sendEventToMmui(this.uiaId, "SelectAndroidAuto");
    }
    else if (this._phone === "carplay")
    {
        framework.sendEventToMmui(this.uiaId, "SelectCarPlay");
    }
};

/* ---------- touch ---------- */
MainMenuCtrl.prototype._indexFromEvent = function(evt)
{
    var node = evt ? evt.target : null;
    while (node && node !== this.divElt && node !== document.body)
    {
        for (var i = 0; i < this._items.length; i++)
        {
            if (this._items[i].div === node)
            {
                return i;
            }
        }
        node = node.parentNode;
    }
    return -1;
};

MainMenuCtrl.prototype._mouseDown = function(evt)
{
    if (!this._allowInput)
    {
        return;
    }
    var index = this._indexFromEvent(evt);
    if (index === -1)
    {
        return;
    }

    if (this._highlighted === -1)
    {
        try { framework.common.stealFocus(); } catch (e) {}
    }

    this._pressedIndex = index;
    document.body.addEventListener("mousemove", this._mouseMoveCallback);
    document.body.addEventListener("mouseup", this._mouseUpCallback);

    this._moveTo(index);
};

MainMenuCtrl.prototype._mouseMove = function(evt)
{
    var index = this._indexFromEvent(evt);
    if (index !== -1 && index !== this._pressedIndex)
    {
        this._pressedIndex = index;
        this._moveTo(index);
    }
};

MainMenuCtrl.prototype._mouseUp = function(evt)
{
    document.body.removeEventListener("mousemove", this._mouseMoveCallback);
    document.body.removeEventListener("mouseup", this._mouseUpCallback);

    var index = this._indexFromEvent(evt);
    if (index !== -1 && index === this._pressedIndex)
    {
        try { framework.common.beep("Short", "Touch"); } catch (e) {}
        this._invokeSelectCallback(index);
    }
    this._pressedIndex = -1;
};

/* ---------- commander knob ---------- */
MainMenuCtrl.prototype._startTiltHoldTimer = function()
{
    this._cancelFastTilt();
    var f = this._focus;
    var d = this._tiltDirection(this._fastTiltDirection);
    if ((d === -1 && f > this._firstIndex()) || (d === 1 && f < this._items.length - 1))
    {
        this._tiltHoldTimerId = setTimeout(this._startFastTiltInterval.bind(this), this.properties.tiltHoldTime);
    }
};

MainMenuCtrl.prototype._startFastTiltInterval = function()
{
    try { framework.common.beep("Long", "Multicontroller"); } catch (e) {}
    this._tiltHoldTimerId = null;
    this._fastTiltStep();
    this._fastTiltStepIntervalId = setInterval(this._fastTiltStep.bind(this), this.properties.tiltStepTime);
};

MainMenuCtrl.prototype._cancelFastTilt = function()
{
    clearTimeout(this._tiltHoldTimerId);
    clearInterval(this._fastTiltStepIntervalId);
    this._tiltHoldTimerId = null;
    this._fastTiltStepIntervalId = null;
};

MainMenuCtrl.prototype._fastTiltStep = function()
{
    this._offsetFocus(this._tiltDirection(this._fastTiltDirection));
};

MainMenuCtrl.prototype.handleControllerEvent = function(eventId)
{
    var response = "consumed";
    var f = this._focus;
    switch (eventId)
    {
        case "lostFocus":
            this._setHighlight(-1);
            break;

        case "acceptFocusInit":     // intentional fall through
        case "acceptFocusFromTop":
            if (this._prvFocus !== -1)
            {
                this._focus = this._prvFocus;
            }
            if (this._focus < this._firstIndex())
            {
                this._focus = this._firstIndex();
            }
            this._setHighlight(this._focus);
            break;

        case "ccw":
            if (this._allowInput) { this._offsetFocus(-1); }
            break;

        case "cw":
            if (this._allowInput) { this._offsetFocus(1); }
            break;

        case "leftStart":
            if (this._allowInput)
            {
                this._lastControllerStartEvent = eventId;
                this._fastTiltDirection = -1;
                this._offsetFocus(this._tiltDirection(-1));
                this._startTiltHoldTimer();
            }
            break;

        case "left":
            if (this._allowInput && this._lastControllerStartEvent === "leftStart")
            {
                this._cancelFastTilt();
            }
            this._lastControllerStartEvent = "";
            break;

        case "rightStart":
            if (this._allowInput)
            {
                this._lastControllerStartEvent = eventId;
                this._fastTiltDirection = 1;
                this._offsetFocus(this._tiltDirection(1));
                this._startTiltHoldTimer();
            }
            break;

        case "right":
            if (this._allowInput && this._lastControllerStartEvent === "rightStart")
            {
                this._cancelFastTilt();
            }
            this._lastControllerStartEvent = "";
            break;

        case "downStart":
            // Pill -> car row, down the card, last row -> the dock.
            if (this._allowInput && f < this._firstDock)
            {
                this._lastControllerStartEvent = "";
                this._moveTo(f + 1);
            }
            else
            {
                response = "ignored";
            }
            break;

        case "selectStart":
            if (this._allowInput)
            {
                this._lastControllerStartEvent = eventId;
                this._setHighlight(this._focus);
            }
            break;

        case "select":
            if (this._allowInput && this._lastControllerStartEvent === "selectStart")
            {
                this._invokeSelectCallback(this._focus);
            }
            this._lastControllerStartEvent = "";
            break;

        case "upStart":
            if (this._allowInput)
            {
                this._lastControllerStartEvent = "";
                if (f >= this._firstDock)
                {
                    // From the dock, up moves into the status card (bottom row).
                    this._moveTo(this._lastRow);
                }
                else if (f > this._firstIndex())
                {
                    // Up the card; from the car row to the pill when a phone is connected.
                    this._moveTo(f - 1);
                }
                else
                {
                    // From the top item, up goes to the status bar (stock behaviour).
                    response = "giveFocusUp";
                }
            }
            break;

        case "up":
        case "down":
            break;

        default:
            log.debug("MainMenuCtrl.handleControllerEvent - event " + eventId + " not handled");
            response = "ignored";
            break;
    }
    return response;
};

/* ---------- stock API kept for the system app ---------- */
MainMenuCtrl.prototype.setText = function(text)
{
    // Called when the status-bar CarPlay / Android Auto button gets focus. Nothing to show here.
    this._iconNameDiv.innerHTML = text;
};

MainMenuCtrl.prototype.getRemoteUiButtonStatus = function(enabled)
{
    // The status-bar phone button went away while it had focus: take the focus back.
    if (!enabled && this._prvFocus !== -1)
    {
        this._focus = this._prvFocus;
        this._setHighlight(this._focus);
    }
    this._pollStatus();
};

MainMenuCtrl.prototype.startTransitionFrom = function()
{
    if (this._hasInvokedSelectCallback && this._highlighted !== -1)
    {
        this._items[this._highlighted].div.classList.add("H2Launch");
    }
};

MainMenuCtrl.prototype.endTransitionTo = function()
{
    this.divElt.classList.add("H2Visible");
};

MainMenuCtrl.prototype.getContextCapture = function()
{
    return { focusedIcon : this._focus };
};

MainMenuCtrl.prototype.restoreContext = function(capture)
{
    if (capture && typeof capture.focusedIcon === "number")
    {
        this._setFocus(capture.focusedIcon);
    }
};

MainMenuCtrl.prototype.finishPartialActivity = function()
{
    this._cancelFastTilt();
    this.properties.selectCallback = null;
};

MainMenuCtrl.prototype.cleanUp = function()
{
    document.body.removeEventListener("mousemove", this._mouseMoveCallback);
    document.body.removeEventListener("mousedown", this._mouseDownCallback);
    document.body.removeEventListener("mouseup", this._mouseUpCallback);

    clearInterval(this._clockTimerId);
    clearInterval(this._statusTimerId);
    clearTimeout(this._fontCheckTimerId);
    if (this._allowInputTimerId)
    {
        clearTimeout(this._allowInputTimerId);
        this._allowInputTimerId = null;
    }
    this._cancelFastTilt();

    delete this.properties;
};

/* ---------- system skin helper ---------- */
// The Arabic system skin (common/css/common_rtl.css) draws each status-bar icon group as a glass pill.
// CSS cannot tell whether a group has a visible icon, so groups that do are marked "H2On". Mazda's
// StatusBarCtrl is not changed: its icon methods are wrapped once, and the originals still run.
function home2MarkIconGroups(bar)
{
    if (!bar) { return; }
    var groups = [bar._iconContainer0, bar._iconContainer1];
    for (var g = 0; g < groups.length; g++)
    {
        var group = groups[g];
        if (!group) { continue; }
        var on = false;
        for (var i = 0; i < group.childNodes.length; i++)
        {
            var d = group.childNodes[i].style ? group.childNodes[i].style.display : "";
            if (d && d !== "none") { on = true; }
        }
        if (on) { group.classList.add("H2On"); } else { group.classList.remove("H2On"); }
    }
}

function home2HookStatusBar()
{
    try
    {
        if (typeof StatusBarCtrl !== "undefined" && !StatusBarCtrl.prototype._home2Hooked)
        {
            var wrap = function(name)
            {
                var original = StatusBarCtrl.prototype[name];
                if (typeof original !== "function") { return; }
                StatusBarCtrl.prototype[name] = function()
                {
                    var result = original.apply(this, arguments);
                    try { home2MarkIconGroups(this); } catch (e) {}
                    return result;
                };
            };
            wrap("setIcon");
            wrap("setupCPAAMode");
            StatusBarCtrl.prototype._home2Hooked = true;
        }
        home2MarkIconGroups(framework.common.statusBar);
    }
    catch (e2) {}
}

home2HookStatusBar();

framework.registerCtrlLoaded("MainMenuCtrl");
