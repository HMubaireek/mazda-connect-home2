/*
 * Home 2.0 "Ember Glass" launcher for Mazda Connect (CMU 150, firmware 74.x)
 * Version 1.4.2, "Ember Glance" layout (live car, phone and maintenance status) — see README.md
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
var HOME2_LIVE = { call : null };

/* ---------- static text ---------- */
var HOME2_TEXT = {
    ar : {
        labels : { nav : "الملاحة", ent : "الوسائط", com : "الهاتف", set : "الإعدادات", app : "التطبيقات" },
        androidauto : "أندرويد أوتو",
        carplay : "آبل كاربلاي",
        phoneSub : "متصل · اضغط للفتح",
        carOk : "السيارة سليمة",
        noWarnings : "لا تحذيرات",
        warnings : ["تحذير واحد في السيارة", "تحذيران في السيارة", "تحذيرات في السيارة", "تحذيرًا في السيارة"],
        warningsSub : "اضغط لعرض دليل التحذيرات",
        fuel : "متوسط الاستهلاك",
        fuelUnits : { l100 : "لتر/١٠٠ كم", kml : "كم/لتر", mpg : "ميل/غالون" },
        serviceDue : "الصيانة مستحقة",
        serviceNext : "الصيانة القادمة",
        noService : "لا صيانة مستحقة",
        serviceUnknown : "تظهر المواعيد بعد فتح شاشة الصيانة",
        serviceTap : "اضغط للتفاصيل",
        serviceIn : "بعد",
        km : "كم",
        miles : "ميل",
        monthCount : ["شهر", "شهران", "أشهر", "شهرًا"],
        dayCount : ["يوم", "يومان", "أيام", "يومًا"],
        oil : "عمر الزيت",
        call : "مكالمة جارية",
        callSub : "اضغط للعودة",
        phoneFallback : "الجوال",
        noBt : "لا يوجد جوال بلوتوث",
        noNews : "لا مكالمات أو رسائل جديدة",
        missed : ["مكالمة فائتة", "مكالمتان فائتتان", "مكالمات فائتة", "مكالمة فائتة"],
        texts : ["رسالة جديدة", "رسالتان جديدتان", "رسائل جديدة", "رسالة جديدة"],
        sep : " · ",
        am : "ص",
        pm : "م",
        weekdays : ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
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
        carOk : "Car is OK",
        noWarnings : "No warnings",
        warnings : ["1 warning", "2 warnings", "warnings", "warnings"],
        warningsSub : "Tap for warning guidance",
        fuel : "Average",
        fuelUnits : { l100 : "L/100km", kml : "km/L", mpg : "mpg" },
        serviceDue : "Service due",
        serviceNext : "Next service",
        noService : "No service due",
        serviceUnknown : "Details appear after opening Maintenance",
        serviceTap : "Tap for details",
        serviceIn : "in",
        km : "km",
        miles : "mi",
        monthCount : ["1 month", "2 months", "months", "months"],
        dayCount : ["1 day", "2 days", "days", "days"],
        oil : "Oil life",
        call : "Call in progress",
        callSub : "tap to return",
        phoneFallback : "Phone",
        noBt : "No Bluetooth phone",
        noNews : "No new calls or messages",
        missed : ["1 missed call", "2 missed calls", "missed calls", "missed calls"],
        texts : ["1 new message", "2 new messages", "new messages", "new messages"],
        sep : " · ",
        am : "AM",
        pm : "PM",
        weekdays : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        months : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        hijriMonths : ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"],
        hijriSuffix : " AH",
        dateSep : ", "
    }
};


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
        { key : "app",   nameId : null, row : "car" },     // opens Applications (warning guidance, fuel economy)
        { key : "com",   nameId : null, row : "phone" },   // opens Communication (active call, call history, SMS)
        { key : "app",   nameId : null, row : "maint" },   // opens Applications (maintenance)
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

    // Android Auto / CarPlay pill under the date
    var line = this._el("div", "H2StatusLine", this.divElt);
    var pill = this._el("div", "H2Card H2Pill", line);
    this._pillChip = this._el("div", "H2PillChip", pill);
    this._pillTitle = this._el("div", "H2PillTitle", pill, "");
    this._el("div", "H2PillSub", pill, this._text.phoneSub);
    this._items[0].div = pill;

    // Status card: car, phone, maintenance
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
        item.end = this._el("div", "H2RowEnd", row, "");
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
    var dateStr = t.weekdays[now.getDay()] + t.dateSep + now.getDate() + " " + t.months[now.getMonth()];
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

// The system app does not keep the active call in a form we can read back: on firmware 74 its
// active-call handler never sets the Active Call item (its check can never be true). Observe the
// message on its way to the system app's own handler, which still runs.
MainMenuCtrl.prototype._hookSystemMessages = function()
{
    var app = this._sysApp();
    if (!app || !app._messageTable || app._messageTable._home2Hooked) { return; }

    var original = app._messageTable.StatusPhoneCall;
    app._messageTable.StatusPhoneCall = function(msg)
    {
        try
        {
            var p = msg && msg.params ? msg.params.payload : null;
            if (p && p.phoneCallStatus)
            {
                HOME2_LIVE.call = (p.phoneCallStatus === "ActiveCall" || p.phoneCallStatus === "Connecting");
            }
        }
        catch (e) {}
        if (typeof original === "function") { return original(msg); }
    };
    app._messageTable._home2Hooked = true;
};

MainMenuCtrl.prototype._emptyStatus = function()
{
    return { phone : "none", warnings : 0, service : false, missed : 0, texts : 0, call : false, btName : "",
             fuel : "", fuelUnit : "", maintKnown : false, maintDist : 0, maintTime : 0, maintTimeUnit : "",
             oil : -1, miles : false };
};

// Numbers kept by Mazda's own apps once they have loaded (they get their data from the car then).
// Fuel economy: the ecoenergy app's trip average. Maintenance: the schedmaint app's "due in" values.
MainMenuCtrl.prototype._readCarApps = function(s)
{
    var apps = framework._appInstances || {};
    try
    {
        var eco = apps.ecoenergy;
        var fe = eco && eco._cached_fuelEfficiencyData;
        // The car sends "--.-" until it has a trip average: show nothing then.
        if (fe && fe.fuelEfficiency !== null && fe.fuelEfficiency !== undefined && !isNaN(parseFloat(fe.fuelEfficiency)))
        {
            s.fuel = String(fe.fuelEfficiency);
            var u = String(fe.fuelEfficiencyUnit || "").toLowerCase();
            s.fuelUnit = (u.indexOf("mpg") !== -1) ? "mpg" : ((u.indexOf("100") !== -1) ? "l100" : "kml");
        }
    }
    catch (e) {}
    try
    {
        var sm = apps.schedmaint;
        if (sm)
        {
            var dist = parseInt(sm._schedmaintDistance, 10);
            var time = parseInt(sm._schedmaintTime, 10);
            var oil = parseInt(sm._oilDeteriorationLevel, 10);
            s.maintDist = (dist > 0) ? dist : 0;
            s.maintTime = (time > 0) ? time : 0;
            s.maintTimeUnit = (sm._timeUnit === "days") ? "days" : "months";
            // Oil life is the car's own reading; Mazda shows it only with the Flexible oil-change setting.
            s.oil = (oil >= 0 && oil <= 100 && sm._oilMaintenanceMode === "Flexible") ? oil : -1;
            s.miles = (String(sm._distanceUnit || "").toLowerCase().indexOf("mile") !== -1);
            s.maintKnown = (s.maintDist > 0 || s.maintTime > 0 || s.oil >= 0);
        }
    }
    catch (e2) {}
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
    this._readCarApps(s);

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

        // Entertainment list: the Bluetooth phone's name.
        var bt = this._findItem(app._masterEntertainmentDataList, "SelectBTAudio");
        if (bt && bt.text1SubMap && typeof bt.text1SubMap.deviceName === "string")
        {
            s.btName = bt.text1SubMap.deviceName;
        }
    }
    catch (e2) {}
    return s;
};

MainMenuCtrl.prototype._pollStatus = function()
{
    var s = this._readStatus();
    var key = [s.phone, s.warnings, s.service, s.missed, s.texts, s.call, s.btName, s.fuel, s.fuelUnit,
               s.maintDist, s.maintTime, s.maintTimeUnit, s.oil, s.miles].join("|");
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

    // Car row: warnings, and the trip's average fuel economy once Mazda's fuel economy app knows it
    var car = this._items[this._firstRow];
    var carAlert = (s.warnings > 0 || s.service);
    var fuelText = "";
    if (s.fuel)
    {
        fuelText = t.fuel + " " + this._digits(this._isArabic ? s.fuel.replace(".", "٫") : s.fuel) + " " + t.fuelUnits[s.fuelUnit];
    }
    if (s.warnings > 0)
    {
        this._setChip(car.chip, "H2RowChip", "warn");
        this._setText(car.title, this._count(s.warnings, t.warnings));
        this._setText(car.sub, t.warningsSub);
    }
    else
    {
        this._setChip(car.chip, "H2RowChip", "ok");
        this._setText(car.title, t.carOk);
        this._setText(car.sub, fuelText || t.noWarnings);
    }
    this._setClass(car.div, "H2Alert", s.warnings > 0);

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

    // Maintenance row: due flag from the system app; "due in" values once the maintenance app has them
    var mt = this._items[this._lastRow];
    var when = [];
    if (s.maintDist > 0) { when.push(this._digits(String(s.maintDist)) + " " + (s.miles ? t.miles : t.km)); }
    if (s.maintTime > 0) { when.push(this._count(s.maintTime, s.maintTimeUnit === "days" ? t.dayCount : t.monthCount)); }
    var whenText = when.length ? t.serviceIn + " " + when.join(t.sep) : "";
    this._setChip(mt.chip, "H2RowChip", s.service ? "service" : "maint");
    if (s.service)
    {
        this._setText(mt.title, t.serviceDue);
        this._setText(mt.sub, whenText || t.serviceTap);
    }
    else if (whenText)
    {
        this._setText(mt.title, t.serviceNext);
        this._setText(mt.sub, whenText);
    }
    else
    {
        this._setText(mt.title, t.noService);
        this._setText(mt.sub, s.maintKnown ? t.serviceTap : t.serviceUnknown);
    }
    this._setText(mt.end, s.oil >= 0 ? t.oil + " " + this._digits(String(s.oil)) + (this._isArabic ? "٪" : "%") : "");
    this._setClass(mt.div, "H2Alert", s.service);

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

// Tilting and turning follow the screen: in right-to-left layouts the next item is on the left.
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

        // Turning follows the screen too: in Arabic the items run right to left, so turning left
        // moves focus to the left (the next item) and turning right moves it to the right.
        case "ccw":
            if (this._allowInput) { this._offsetFocus(this._tiltDirection(-1)); }
            break;

        case "cw":
            if (this._allowInput) { this._offsetFocus(this._tiltDirection(1)); }
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
// The system skin (common/css/home2skin.css) draws each status-bar icon group as a glass pill.
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

// Mazda's own lists (List2Ctrl). Row icons: List2Ctrl._setImage puts the icon URL in an inline style, which the
// skin's [style*=...] rules did not catch in the car, so the launcher points it at our redrawn icon (HOME2_ICONS,
// generated). Focus: when the list scrolls, Mazda's code can leave an old row marked "focus", so after every
// focus move only the row that really has focus keeps the mark.
function home2IconUrl(url)
{
    if (typeof url !== "string") { return url; }
    var m = url.match(/(Icn(?:List|Ump)[A-Za-z0-9_]*\.png)$/);
    if (m && typeof HOME2_ICONS !== "undefined" && HOME2_ICONS[m[1]]) { return "common/images/home2skin/icn/" + m[1]; }
    return url;
}

function home2OneFocus(list)
{
    if (!list || !list.divElt || typeof list._getDOMItem !== "function") { return; }
    var keep = list._getDOMItem(list._lastItemWithFocus);
    var rows = list.divElt.querySelectorAll(".ListItem.focus");
    for (var i = 0; i < rows.length; i++)
    {
        if (rows[i] !== keep) { rows[i].classList.remove("focus"); }
    }
}

function home2HookList()
{
    try
    {
        if (typeof List2Ctrl === "undefined" || List2Ctrl.prototype._home2Hooked) { return; }
        var p = List2Ctrl.prototype;
        var setImage = p._setImage;
        if (typeof setImage === "function")
        {
            p._setImage = function(li, className, url)
            {
                return setImage.call(this, li, className, home2IconUrl(url));
            };
        }
        var showFocus = p._showFocus;
        if (typeof showFocus === "function")
        {
            p._showFocus = function(item, allowOffscreen, simulationMode)
            {
                var result = showFocus.apply(this, arguments);
                if (simulationMode !== true) { try { home2OneFocus(this); } catch (e) {} }
                return result;
            };
        }
        p._home2Hooked = true;
    }
    catch (e2) {}
}

// The system skin for Mazda's own screens (common/css/home2skin.css) applies in every language. In Arabic Mazda's
// framework loads common_rtl.css at start-up, before any screen, and that file imports the skin, so the camera or a
// USB dialog shown before the home screen is already styled. In other languages the launcher adds the skin here,
// and again whenever the language changes to one without common_rtl.css.
// The skin sets #Home2SkinProbe to 7px wide: a quick check that it is on the page.
function home2SkinActive()
{
    var probe = document.getElementById("Home2SkinProbe");
    if (!probe)
    {
        probe = document.createElement("div");
        probe.id = "Home2SkinProbe";
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        document.body.appendChild(probe);
    }
    return probe.offsetWidth === 7;
}

function home2LoadSkin()
{
    try
    {
        if (document.getElementById("Home2Skin")) { return; }
        if (framework._rtlLanguage && home2SkinActive()) { return; }
        var link = document.createElement("link");
        link.id = "Home2Skin";
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = "common/css/home2skin.css";
        document.querySelector("head").appendChild(link);
    }
    catch (e) {}
}

// Mazda's controls load on first use and announce themselves with framework.registerCtrlLoaded: hook them then,
// before the first one is built. Also follow language changes for the skin.
function home2HookFramework()
{
    try
    {
        if (framework._home2Hooked) { return; }
        var registered = framework.registerCtrlLoaded;
        if (typeof registered === "function")
        {
            framework.registerCtrlLoaded = function()
            {
                var result = registered.apply(this, arguments);
                home2HookList();
                home2HookStatusBar();
                return result;
            };
        }
        var styling = framework._setLanguageSpecificStyling;
        if (typeof styling === "function")
        {
            framework._setLanguageSpecificStyling = function()
            {
                var result = styling.apply(this, arguments);
                home2LoadSkin();
                return result;
            };
        }
        framework._home2Hooked = true;
    }
    catch (e) {}
}

home2LoadSkin();
home2HookStatusBar();
home2HookList();
home2HookFramework();

framework.registerCtrlLoaded("MainMenuCtrl");

/* Umm al-Qura calendar table, generated by tools/gen_hijri.py — do not edit by hand.
 * MONTH_STARTS[i] = first day of Hijri month i (counted from 1445/1), in days since 1970-01-01. */
var Home2Hijri = {
    FIRST_YEAR : 1445,
    MONTH_STARTS : [19557,19586,19616,19646,19676,19705,19735,19764,19793,19823,19852,19881,19911,19940,19970,20000,20030,20059,20089,20119,20148,20177,20207,20236,20265,20295,20324,20354,20384,20414,20443,20473,20502,20532,20561,20591,20620,20649,20679,20708,20738,20768,20797,20827,20857,20886,20916,20945,20975,21004,21033,21063,21092,21122,21151,21181,21211,21240,21270,21300,21329,21359,21388,21418,21447,21476,21506,21535,21565,21594,21624,21654,21683,21713,21743,21772,21802,21831,21860,21890,21919,21949,21978,22008,22037,22067,22097,22127,22156,22186,22215,22244,22274,22303,22333,22362,22392,22421,22451,22481,22511,22540,22569,22599,22628,22658,22687,22717,22746,22775,22805,22835,22865,22894,22924,22953,22983,23012,23042,23071,23101,23130,23159,23189,23219,23248,23278,23307,23337,23367,23396,23426,23455,23485,23514,23543,23573,23602,23632,23661,23691,23721,23751,23780,23810,23839,23869,23898,23927,23957,23986,24015,24045,24075,24104,24134,24164,24194,24223,24253,24282,24311,24341,24370,24399,24429,24459,24488,24518,24548,24578,24607,24637,24666,24695,24725,24754,24783,24813,24843,24872,24902,24932,24961,24991,25020,25050,25079,25109,25138,25167,25197,25227,25256,25286,25315,25345,25375,25404,25434,25463,25493,25522,25552,25581,25611,25640,25670,25699,25729,25758,25788,25817,25847,25877,25906,25936,25965,25995,26024,26053,26083,26112,26142,26172,26201,26231,26261,26290,26320,26349,26379,26408,26437,26467,26496,26526,26555,26585,26615,26645,26674,26704,26733,26763,26792,26821,26851,26880,26909,26939,26969,26999,27029,27058,27088,27117,27147,27176,27205,27235,27264,27294,27323,27353,27383,27412,27442,27472,27501,27531,27560,27589,27619,27648,27678,27707,27737,27766,27796,27826,27855,27885,27914,27944,27973,28003,28032,28062,28091,28120,28150,28180,28209,28239,28269,28298,28328,28358,28387,28416,28446,28475,28504,28534,28564,28593,28623,28652,28682,28712,28742,28771,28800,28830,28859,28888,28918,28947,28977,29007,29036,29066,29096,29125,29155,29184,29214,29243,29273,29302,29331,29361,29390,29420,29450,29479,29509,29538,29568,29598,29627,29657,29686,29715,29745,29774,29804,29833,29863,29893,29922,29952,29982,30011,30041,30070,30099,30129,30158,30188,30217,30247,30276,30306,30336,30366,30395,30425,30454,30483,30513,30542,30571,30601,30630,30660,30690,30720,30749,30779,30809,30838,30867,30897,30926,30955,30985,31014,31044,31074,31103,31133,31163,31193,31222,31251,31281,31310,31339,31369,31398,31428,31458,31487,31517,31547,31576,31606,31635,31665,31694,31723,31753,31782,31812,31841,31871,31901,31930,31960,31989,32019,32049,32078,32107,32137,32166,32196,32225,32255,32284,32314],
    fromDate : function(d)
    {
        var days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
        var s = this.MONTH_STARTS;
        if (days < s[0] || days >= s[s.length - 1]) { return null; }
        var lo = 0, hi = s.length - 2;
        while (lo < hi)
        {
            var mid = Math.ceil((lo + hi) / 2);
            if (s[mid] <= days) { lo = mid; } else { hi = mid - 1; }
        }
        return { year : this.FIRST_YEAR + Math.floor(lo / 12), month : (lo % 12) + 1, day : days - s[lo] + 1 };
    }
};


// Generated by tools/build_assets.py: the Mazda icons Home 2.0 redraws (common/images/home2skin/icn/).
var HOME2_ICONS = {
    "IcnListAddRecipient_Ds.png": 1,
    "IcnListAddRecipient_En.png": 1,
    "IcnListAddSong_Ds.png": 1,
    "IcnListAddSong_En.png": 1,
    "IcnListAlbum.png": 1,
    "IcnListAm_Ds.png": 1,
    "IcnListAm_En.png": 1,
    "IcnListArtist.png": 1,
    "IcnListAttachmentDisallowed.png": 1,
    "IcnListAudio_Ds.png": 1,
    "IcnListAudio_En.png": 1,
    "IcnListBluetoothSettings_Ds.png": 1,
    "IcnListBluetoothSettings_En.png": 1,
    "IcnListBluetooth_Off.png": 1,
    "IcnListBluetooth_On.png": 1,
    "IcnListBrake_Ds.png": 1,
    "IcnListBrake_En.png": 1,
    "IcnListBtConnType_Both.png": 1,
    "IcnListBtConnType_Music.png": 1,
    "IcnListBtConnType_Phone.png": 1,
    "IcnListCall_Incoming.png": 1,
    "IcnListCall_Missed.png": 1,
    "IcnListCall_Outgoing.png": 1,
    "IcnListCall_Recent.png": 1,
    "IcnListCancelImport_Ds.png": 1,
    "IcnListCancelImport_En.png": 1,
    "IcnListCarBattery_Ds.png": 1,
    "IcnListCarBattery_En.png": 1,
    "IcnListCarFinder_Ds.png": 1,
    "IcnListCarFinder_En.png": 1,
    "IcnListCarHealthAmber_Med.png": 1,
    "IcnListCarHealthAmber_Small.png": 1,
    "IcnListCarHealthGreen_Med.png": 1,
    "IcnListCarHealthGreen_Small.png": 1,
    "IcnListCarHealthRed_Med.png": 1,
    "IcnListCarHealthRed_Small.png": 1,
    "IcnListCdPlayer_Ds.png": 1,
    "IcnListCdPlayer_En.png": 1,
    "IcnListCheckbox_Checked.png": 1,
    "IcnListCheckbox_Unchecked.png": 1,
    "IcnListCheckmark.png": 1,
    "IcnListCompose_Ds.png": 1,
    "IcnListCompose_En.png": 1,
    "IcnListContact_Ds.png": 1,
    "IcnListContact_En.png": 1,
    "IcnListContact_Placeholder.png": 1,
    "IcnListContact_Unavailable.png": 1,
    "IcnListContacts_Ds.png": 1,
    "IcnListContacts_En.png": 1,
    "IcnListCoolant_Ds.png": 1,
    "IcnListCoolant_En.png": 1,
    "IcnListDab_Ds.png": 1,
    "IcnListDab_En.png": 1,
    "IcnListDealerInfo_Ds.png": 1,
    "IcnListDealerInfo_En.png": 1,
    "IcnListDelete_Ds.png": 1,
    "IcnListDelete_En.png": 1,
    "IcnListDialpad_Ds.png": 1,
    "IcnListDialpad_En.png": 1,
    "IcnListDir_E.png": 1,
    "IcnListDir_N.png": 1,
    "IcnListDir_NE.png": 1,
    "IcnListDir_NW.png": 1,
    "IcnListDir_S.png": 1,
    "IcnListDir_SE.png": 1,
    "IcnListDir_SW.png": 1,
    "IcnListDir_W.png": 1,
    "IcnListDrafts_Ds.png": 1,
    "IcnListDrafts_En.png": 1,
    "IcnListDrivingStats_Ds.png": 1,
    "IcnListDrivingStats_En.png": 1,
    "IcnListEmailPending.png": 1,
    "IcnListEmail_Ds.png": 1,
    "IcnListEmail_En.png": 1,
    "IcnListEmergencyBroadcast_Ds.png": 1,
    "IcnListEmergencyBroadcast_En.png": 1,
    "IcnListEntNowPlaying_Ds.png": 1,
    "IcnListEntNowPlaying_En.png": 1,
    "IcnListEnvelope_Ds.png": 1,
    "IcnListEnvelope_En.png": 1,
    "IcnListExclamationPoint.png": 1,
    "IcnListFm_Ds.png": 1,
    "IcnListFm_En.png": 1,
    "IcnListFolder.png": 1,
    "IcnListFolderUp.png": 1,
    "IcnListFolder_Closed.png": 1,
    "IcnListFolder_Open.png": 1,
    "IcnListGlobe.png": 1,
    "IcnListHD.png": 1,
    "IcnListHelp_Ds.png": 1,
    "IcnListHelp_En.png": 1,
    "IcnListImport_Ds.png": 1,
    "IcnListImport_En.png": 1,
    "IcnListInbox_Ds.png": 1,
    "IcnListInbox_En.png": 1,
    "IcnListIncomingCalls.png": 1,
    "IcnListIpodout_Ds.png": 1,
    "IcnListIpodout_En.png": 1,
    "IcnListKeyboard_Ds.png": 1,
    "IcnListKeyboard_En.png": 1,
    "IcnListMove_Ds.png": 1,
    "IcnListMove_En.png": 1,
    "IcnListNavPoi_Ds.png": 1,
    "IcnListNavPoi_En.png": 1,
    "IcnListOilLife_Ds.png": 1,
    "IcnListOilLife_En.png": 1,
    "IcnListOutbox_Ds.png": 1,
    "IcnListOutbox_En.png": 1,
    "IcnListOutgoingCalls.png": 1,
    "IcnListParentalControl.png": 1,
    "IcnListPerson.png": 1,
    "IcnListPhone_Ds.png": 1,
    "IcnListPhone_En.png": 1,
    "IcnListPlaylist_Ds.png": 1,
    "IcnListPlaylist_En.png": 1,
    "IcnListPresetResponse_Ds.png": 1,
    "IcnListPresetResponse_En.png": 1,
    "IcnListProgram_Ds.png": 1,
    "IcnListProgram_En.png": 1,
    "IcnListProtectFile_Off_Ds.png": 1,
    "IcnListProtectFile_Off_En.png": 1,
    "IcnListProtectFile_On_Ds.png": 1,
    "IcnListProtectFile_On_En.png": 1,
    "IcnListRadio_Checked_Ds.png": 1,
    "IcnListRadio_Checked_En.png": 1,
    "IcnListRadio_Unchecked_Ds.png": 1,
    "IcnListRadio_Unchecked_En.png": 1,
    "IcnListRemoveRecipient_Ds.png": 1,
    "IcnListRemoveRecipient_En.png": 1,
    "IcnListRename_Ds.png": 1,
    "IcnListRename_En.png": 1,
    "IcnListReplace_Ds.png": 1,
    "IcnListReplace_En.png": 1,
    "IcnListReplicatedMobileScreen.png": 1,
    "IcnListReporting_Ds.png": 1,
    "IcnListReporting_En.png": 1,
    "IcnListSMSPending.png": 1,
    "IcnListServiceNotifications_Ds.png": 1,
    "IcnListServiceNotifications_En.png": 1,
    "IcnListSettings_Ds.png": 1,
    "IcnListSettings_En.png": 1,
    "IcnListShuffle_Off_Ds.png": 1,
    "IcnListShuffle_Off_En.png": 1,
    "IcnListSignalE_00.png": 1,
    "IcnListSignalG_00.png": 1,
    "IcnListSignalG_01.png": 1,
    "IcnListSignalG_02.png": 1,
    "IcnListSignalG_03.png": 1,
    "IcnListSignalG_04.png": 1,
    "IcnListSignalG_05.png": 1,
    "IcnListSms_Ds.png": 1,
    "IcnListSms_En.png": 1,
    "IcnListSong.png": 1,
    "IcnListSong_Placeholder.png": 1,
    "IcnListSong_Unavailable.png": 1,
    "IcnListStore_Ds.png": 1,
    "IcnListStore_En.png": 1,
    "IcnListSynchronize_Ds.png": 1,
    "IcnListSynchronize_En.png": 1,
    "IcnListTire_Ds.png": 1,
    "IcnListTire_En.png": 1,
    "IcnListUnknownCalls.png": 1,
    "IcnListUsb_Ds.png": 1,
    "IcnListUsb_En.png": 1,
    "IcnListVehicleHealth_Ds.png": 1,
    "IcnListVehicleHealth_En.png": 1,
    "IcnListVoicemail_Ds.png": 1,
    "IcnListVoicemail_En.png": 1,
    "IcnListWifiHotspot_Ds.png": 1,
    "IcnListWifiHotspot_Error.png": 1,
    "IcnListWifiHotspot_Off.png": 1,
    "IcnListWifiHotspot_On.png": 1,
    "IcnListWifiSecure_00.png": 1,
    "IcnListWifiSecure_01.png": 1,
    "IcnListWifiSecure_02.png": 1,
    "IcnListWifiSecure_03.png": 1,
    "IcnListWifiSecure_04.png": 1,
    "IcnListWifi_00.png": 1,
    "IcnListWifi_01.png": 1,
    "IcnListWifi_02.png": 1,
    "IcnListWifi_03.png": 1,
    "IcnListWifi_04.png": 1,
    "IcnUmpAddCall_Ds.png": 1,
    "IcnUmpAddCall_En.png": 1,
    "IcnUmpAddContact_Ds.png": 1,
    "IcnUmpAddContact_En.png": 1,
    "IcnUmpAddSong_Ds.png": 1,
    "IcnUmpAddSong_En.png": 1,
    "IcnUmpAmPm_Ds.png": 1,
    "IcnUmpAmPm_En.png": 1,
    "IcnUmpApps_Ds.png": 1,
    "IcnUmpApps_En.png": 1,
    "IcnUmpAutoMem_Ds.png": 1,
    "IcnUmpAutoMem_En.png": 1,
    "IcnUmpBack15s_Ds.png": 1,
    "IcnUmpBack15s_En.png": 1,
    "IcnUmpBack30s_Ds.png": 1,
    "IcnUmpBack30s_En.png": 1,
    "IcnUmpBack_Ds.png": 1,
    "IcnUmpBack_En.png": 1,
    "IcnUmpBargeIn_Ds.png": 1,
    "IcnUmpBargeIn_En.png": 1,
    "IcnUmpBookmark_Sel_Ds.png": 1,
    "IcnUmpBookmark_Sel_En.png": 1,
    "IcnUmpBookmark_Unsel_Ds.png": 1,
    "IcnUmpBookmark_Unsel_En.png": 1,
    "IcnUmpCallVol_01.png": 1,
    "IcnUmpCallVol_02.png": 1,
    "IcnUmpCallVol_03.png": 1,
    "IcnUmpCallVol_Mute.png": 1,
    "IcnUmpCall_Ds.png": 1,
    "IcnUmpCall_En.png": 1,
    "IcnUmpCamAngle_Sel_Ds.png": 1,
    "IcnUmpCamAngle_Sel_En.png": 1,
    "IcnUmpCamAngle_Unsel_Ds.png": 1,
    "IcnUmpCamAngle_Unsel_En.png": 1,
    "IcnUmpCloseUmp_Ds.png": 1,
    "IcnUmpCloseUmp_En.png": 1,
    "IcnUmpCommMenu_Ds.png": 1,
    "IcnUmpCommMenu_En.png": 1,
    "IcnUmpConnectionManager_Ds.png": 1,
    "IcnUmpConnectionManager_En.png": 1,
    "IcnUmpCtrlPanel_Ds.png": 1,
    "IcnUmpCtrlPanel_En.png": 1,
    "IcnUmpCurrentList_Ds.png": 1,
    "IcnUmpCurrentList_En.png": 1,
    "IcnUmpDelete_Ds.png": 1,
    "IcnUmpDelete_En.png": 1,
    "IcnUmpDialpad_Ds.png": 1,
    "IcnUmpDialpad_En.png": 1,
    "IcnUmpEject.png": 1,
    "IcnUmpEntMenu_Ds.png": 1,
    "IcnUmpEntMenu_En.png": 1,
    "IcnUmpEqualizer_Ds.png": 1,
    "IcnUmpEqualizer_En.png": 1,
    "IcnUmpFavorite_Favorite.png": 1,
    "IcnUmpFavorite_Favorite_Ds.png": 1,
    "IcnUmpFavorite_Favorite_En.png": 1,
    "IcnUmpFavorite_Unfavorite.png": 1,
    "IcnUmpFavorite_Unfavorite_Ds.png": 1,
    "IcnUmpFavorite_Unfavorite_En.png": 1,
    "IcnUmpFolder_Down.png": 1,
    "IcnUmpFolder_Up.png": 1,
    "IcnUmpFwd15s_Ds.png": 1,
    "IcnUmpFwd15s_En.png": 1,
    "IcnUmpFwd30s_Ds.png": 1,
    "IcnUmpFwd30s_En.png": 1,
    "IcnUmpFwd_Ds.png": 1,
    "IcnUmpFwd_En.png": 1,
    "IcnUmpGenre_Ds.png": 1,
    "IcnUmpGenre_En.png": 1,
    "IcnUmpHD_Sel_Ds.png": 1,
    "IcnUmpHD_Sel_En.png": 1,
    "IcnUmpHD_Unsel_Ds.png": 1,
    "IcnUmpHD_Unsel_En.png": 1,
    "IcnUmpHangup_Ds.png": 1,
    "IcnUmpHangup_En.png": 1,
    "IcnUmpHelp.png": 1,
    "IcnUmpHide_Ds.png": 1,
    "IcnUmpHide_En.png": 1,
    "IcnUmpInfo_Ds.png": 1,
    "IcnUmpInfo_En.png": 1,
    "IcnUmpItunesTag_Tagged_Ds.png": 1,
    "IcnUmpItunesTag_Tagged_En.png": 1,
    "IcnUmpItunesTag_Untagged_Ds.png": 1,
    "IcnUmpItunesTag_Untagged_En.png": 1,
    "IcnUmpLiveStreaming.png": 1,
    "IcnUmpLock_Locked_Ds.png": 1,
    "IcnUmpLock_Locked_En.png": 1,
    "IcnUmpLock_Unlocked_Ds.png": 1,
    "IcnUmpLock_Unlocked_En.png": 1,
    "IcnUmpMap_Ds.png": 1,
    "IcnUmpMap_En.png": 1,
    "IcnUmpMergecall_Ds.png": 1,
    "IcnUmpMergecall_En.png": 1,
    "IcnUmpMic.png": 1,
    "IcnUmpMinus_Ds.png": 1,
    "IcnUmpMinus_En.png": 1,
    "IcnUmpMinus_Hd.png": 1,
    "IcnUmpMore_Ds.png": 1,
    "IcnUmpMore_En.png": 1,
    "IcnUmpMuteUnmute_Mute_Ds.png": 1,
    "IcnUmpMuteUnmute_Mute_En.png": 1,
    "IcnUmpMuteUnmute_Unmute_Ds.png": 1,
    "IcnUmpMuteUnmute_Unmute_En.png": 1,
    "IcnUmpNextAudio_Ds.png": 1,
    "IcnUmpNextAudio_En.png": 1,
    "IcnUmpNextAudio_Hd.png": 1,
    "IcnUmpNextChannel_Ds.png": 1,
    "IcnUmpNextChannel_En.png": 1,
    "IcnUmpNextChannel_Hd.png": 1,
    "IcnUmpNextStation_Ds.png": 1,
    "IcnUmpNextStation_En.png": 1,
    "IcnUmpPhoneRoute_Handset.png": 1,
    "IcnUmpPhoneRoute_Handset_En.png": 1,
    "IcnUmpPhoneRoute_Vehicle.png": 1,
    "IcnUmpPlayOrPause_Ds.png": 1,
    "IcnUmpPlayOrPause_En.png": 1,
    "IcnUmpPlayPause_Pause_Ds.png": 1,
    "IcnUmpPlayPause_Pause_En.png": 1,
    "IcnUmpPlayPause_Play_Ds.png": 1,
    "IcnUmpPlayPause_Play_En.png": 1,
    "IcnUmpPlayPause_Stop_Ds.png": 1,
    "IcnUmpPlayPause_Stop_En.png": 1,
    "IcnUmpPlus_Ds.png": 1,
    "IcnUmpPlus_En.png": 1,
    "IcnUmpPlus_Hd.png": 1,
    "IcnUmpPreviousAudio_Ds.png": 1,
    "IcnUmpPreviousAudio_En.png": 1,
    "IcnUmpPreviousAudio_Hd.png": 1,
    "IcnUmpPreviousChannel_Ds.png": 1,
    "IcnUmpPreviousChannel_En.png": 1,
    "IcnUmpPreviousChannel_Hd.png": 1,
    "IcnUmpPreviousStation_Ds.png": 1,
    "IcnUmpPreviousStation_En.png": 1,
    "IcnUmpProgram_Ds.png": 1,
    "IcnUmpProgram_En.png": 1,
    "IcnUmpRepeat_List.png": 1,
    "IcnUmpRepeat_List_Ds.png": 1,
    "IcnUmpRepeat_List_En.png": 1,
    "IcnUmpRepeat_None.png": 1,
    "IcnUmpRepeat_None_Ds.png": 1,
    "IcnUmpRepeat_None_En.png": 1,
    "IcnUmpRepeat_Song.png": 1,
    "IcnUmpRepeat_Song_Ds.png": 1,
    "IcnUmpRepeat_Song_En.png": 1,
    "IcnUmpReplyToAll_Ds.png": 1,
    "IcnUmpReplyToAll_En.png": 1,
    "IcnUmpReply_Ds.png": 1,
    "IcnUmpReply_En.png": 1,
    "IcnUmpReset_Ds.png": 1,
    "IcnUmpReset_En.png": 1,
    "IcnUmpScan_Folder_Ds.png": 1,
    "IcnUmpScan_Folder_En.png": 1,
    "IcnUmpScan_Sel_Ds.png": 1,
    "IcnUmpScan_Sel_En.png": 1,
    "IcnUmpScan_Unsel_Ds.png": 1,
    "IcnUmpScan_Unsel_En.png": 1,
    "IcnUmpScrollDown_Ds.png": 1,
    "IcnUmpScrollDown_En.png": 1,
    "IcnUmpScrollUp_Ds.png": 1,
    "IcnUmpScrollUp_En.png": 1,
    "IcnUmpSettings_Ds.png": 1,
    "IcnUmpSettings_En.png": 1,
    "IcnUmpShuffle_Folder_Ds.png": 1,
    "IcnUmpShuffle_Folder_En.png": 1,
    "IcnUmpShuffle_Off_Ds.png": 1,
    "IcnUmpShuffle_Off_En.png": 1,
    "IcnUmpShuffle_On_Ds.png": 1,
    "IcnUmpShuffle_On_En.png": 1,
    "IcnUmpSubtitles_Sel_Ds.png": 1,
    "IcnUmpSubtitles_Sel_En.png": 1,
    "IcnUmpSubtitles_Unsel_Ds.png": 1,
    "IcnUmpSubtitles_Unsel_En.png": 1,
    "IcnUmpSwapCalls_01_Ds.png": 1,
    "IcnUmpSwapCalls_01_En.png": 1,
    "IcnUmpSwapCalls_02_Ds.png": 1,
    "IcnUmpSwapCalls_02_En.png": 1,
    "IcnUmpSwitchView_Ds.png": 1,
    "IcnUmpSwitchView_En.png": 1,
    "IcnUmpThumbsDown_Sel_Ds.png": 1,
    "IcnUmpThumbsDown_Sel_En.png": 1,
    "IcnUmpThumbsDown_UnSel_Ds.png": 1,
    "IcnUmpThumbsDown_UnSel_En.png": 1,
    "IcnUmpThumbsUp_Sel_Ds.png": 1,
    "IcnUmpThumbsUp_Sel_En.png": 1,
    "IcnUmpThumbsUp_UnSel_Ds.png": 1,
    "IcnUmpThumbsUp_UnSel_En.png": 1,
    "IcnUmpTopList_Ds.png": 1,
    "IcnUmpTopList_En.png": 1,
    "IcnUmpTrafficAlert_Sel_Ds.png": 1,
    "IcnUmpTrafficAlert_Sel_En.png": 1,
    "IcnUmpTrafficAlert_Unsel_Ds.png": 1,
    "IcnUmpTrafficAlert_Unsel_En.png": 1,
    "IcnUmpTune_Ds.png": 1,
    "IcnUmpTune_En.png": 1,
    "IcnUmpVideoSet_Ds.png": 1,
    "IcnUmpVideoSet_En.png": 1
};
