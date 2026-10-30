/*
 * Home 2.0 "Ember Glass" launcher for Mazda Connect (CMU 150, firmware 74.x)
 * Version @VERSION@ — see README.md
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
    // How often to check whether a phone is connected (ms).
    phonePollMs : 1000,
    // How often to refresh the clock (ms).
    clockMs : 5000,
    // Show a small line saying whether the Tajawal font loaded (for testing on the car).
    fontCheck : true
};

// Font family names, as written inside the installed .ttf files (see tools/rename_fonts.py).
var HOME2_FONTS = ["Home2 Tajawal Bold", "Home2 Tajawal Medium", "Home2 Tajawal Light"];

/* ---------- static text ---------- */
var HOME2_TEXT = {
    ar : {
        labels : { nav : "الملاحة", ent : "الوسائط", com : "الهاتف", set : "الإعدادات", app : "التطبيقات" },
        connect : "وصّل جوالك",
        connectSub : "عبر USB لتشغيل أندرويد أوتو أو كاربلاي",
        androidauto : "أندرويد أوتو",
        carplay : "آبل كاربلاي",
        open : "اضغط للفتح",
        connected : "متصل",
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
        connect : "Connect your phone",
        connectSub : "USB · Android Auto or CarPlay",
        androidauto : "Android Auto",
        carplay : "Apple CarPlay",
        open : "Tap to open",
        connected : "Connected",
        am : "AM",
        pm : "PM",
        days : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
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

    // Item 0 is the phone card; 1-5 are the dock tiles.
    // "key" is the icon code the stock system app expects in the select callback.
    this._items =
    [
        { key : "phone", nameId : null },
        { key : "nav",   nameId : "NavigationTitle" },
        { key : "ent",   nameId : "Entertainment" },
        { key : "com",   nameId : "Communication" },
        { key : "set",   nameId : "Settings" },
        { key : "app",   nameId : "Applications" }
    ];

    this._lang = this._detectLanguage();
    this._isArabic = (this._lang === "ar_SA");
    this._isRtl = (this._lang === "ar_SA" || this._lang === "he_IL");
    this._text = this._isArabic ? HOME2_TEXT.ar : HOME2_TEXT.en;

    this._phone = "none";               // "none" | "androidauto" | "carplay"
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
    this._phoneTimerId = null;
    this._nudgeTimerId = null;

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
    this.divElt.className = "MainMenuCtrl H2Root " + (this._isRtl ? "H2Rtl" : "H2Ltr");

    // Clock + dates
    var clock = this._el("div", "H2Clock", this.divElt);
    var timeLine = this._el("div", "H2TimeLine", clock);
    this._timeEl = this._el("span", "H2Time", timeLine, "");
    this._ampmEl = this._el("span", "H2AmPm", timeLine, "");
    this._dateEl = this._el("div", "H2Date", clock, "");
    this._hijriEl = this._el("div", "H2Hijri", clock, "");

    // Phone card
    var hero = this._el("div", "H2Card H2Hero H2PhoneNone", this.divElt);
    this._el("div", "H2HeroChip", hero);
    this._el("div", "H2HeroArrow", hero);
    this._heroBadge = this._el("div", "H2HeroBadge", hero, this._text.connected);
    this._heroTitle = this._el("div", "H2HeroTitle", hero, this._text.connect);
    this._heroSub = this._el("div", "H2HeroSub", hero, this._text.connectSub);
    this._items[0].div = hero;

    // Dock tiles
    for (var i = 1; i < this._items.length; i++)
    {
        var item = this._items[i];
        var tile = this._el("div", "H2Card H2Dock H2Dock" + i, this.divElt);
        this._el("div", "H2DockChip H2Chip-" + item.key, tile);
        this._el("div", "H2DockLabel", tile, this._label(item));
        item.div = tile;
    }

    // Kept for API compatibility: the system app writes the CarPlay/Android Auto
    // status-bar button name here via setText(). Not shown.
    this._iconNameDiv = this._el("div", "MainMenuCtrlIconName", this.divElt);

    if (HOME2_CONFIG.fontCheck)
    {
        this._fontCheckEl = this._el("div", "H2FontCheck", this.divElt, "");
    }

    this._applyPhoneState();
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

    this._pollPhone();
    this._phoneTimerId = setInterval(this._pollPhone.bind(this), HOME2_CONFIG.phonePollMs);

    // Start on the phone card when a phone is connected, otherwise on Navigation.
    this._setFocus(this._phone === "none" ? 1 : 0);

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

/* ---------- phone state ---------- */
MainMenuCtrl.prototype._readPhoneState = function()
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
    if (state === "none")
    {
        try
        {
            var app = framework._appInstances ? framework._appInstances[this.uiaId] : null;
            var list = app ? app._masterEntertainmentDataList : null;
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

MainMenuCtrl.prototype._pollPhone = function()
{
    var s = this._readPhoneState();
    if (s !== this._phone)
    {
        this._phone = s;
        this._applyPhoneState();
    }
};

MainMenuCtrl.prototype._applyPhoneState = function()
{
    var hero = this._items[0].div;
    if (!hero) { return; }

    hero.classList.remove("H2PhoneNone");
    hero.classList.remove("H2PhoneAA");
    hero.classList.remove("H2PhoneCP");

    if (this._phone === "androidauto")
    {
        hero.classList.add("H2PhoneAA");
        this._setText(this._heroTitle, this._text.androidauto);
        this._setText(this._heroSub, this._text.open);
    }
    else if (this._phone === "carplay")
    {
        hero.classList.add("H2PhoneCP");
        this._setText(this._heroTitle, this._text.carplay);
        this._setText(this._heroSub, this._text.open);
    }
    else
    {
        hero.classList.add("H2PhoneNone");
        this._setText(this._heroTitle, this._text.connect);
        this._setText(this._heroSub, this._text.connectSub);
    }

    // No phone: the card is hidden and the clock takes the top of the screen.
    if (this._phone === "none")
    {
        this.divElt.classList.add("H2NoPhone");
        if (this._focus === 0)
        {
            this._focus = 1;
            if (this._highlighted === 0) { this._setHighlight(1); }
        }
        if (this._prvFocus === 0) { this._prvFocus = 1; }
    }
    else
    {
        this.divElt.classList.remove("H2NoPhone");
    }
};

// The phone card can only take focus while a phone is connected.
MainMenuCtrl.prototype._firstIndex = function()
{
    return (this._phone === "none") ? 1 : 0;
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

MainMenuCtrl.prototype._offsetFocus = function(direction)
{
    var index = this._focus + direction;
    if (index < this._firstIndex()) { index = this._firstIndex(); }
    if (index > this._items.length - 1) { index = this._items.length - 1; }

    if (index !== this._focus || this._highlighted !== index)
    {
        this._setFocus(index);
        this._setHighlight(index);
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

    this._setFocus(index);
    this._setHighlight(index);

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
    else
    {
        // No phone: give a short visual nudge instead of doing nothing.
        var hero = this._items[0].div;
        hero.classList.add("H2Nudge");
        clearTimeout(this._nudgeTimerId);
        this._nudgeTimerId = setTimeout(function() {
            hero.classList.remove("H2Nudge");
        }, 1200);
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

    this._setFocus(index);
    this._setHighlight(index);
};

MainMenuCtrl.prototype._mouseMove = function(evt)
{
    var index = this._indexFromEvent(evt);
    if (index !== -1 && index !== this._pressedIndex)
    {
        this._pressedIndex = index;
        this._setFocus(index);
        this._setHighlight(index);
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
    if ((d === -1 && f > 0) || (d === 1 && f < this._items.length - 1))
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
            // From the phone card, down moves into the dock.
            if (this._allowInput && this._focus === 0)
            {
                this._lastControllerStartEvent = "";
                this._offsetFocus(1);
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
                if (this._focus !== 0 && this._phone !== "none")
                {
                    // From the dock, up moves to the phone card (only shown when a phone is connected).
                    this._setFocus(0);
                    this._setHighlight(0);
                }
                else
                {
                    // From the top row, up goes to the status bar (stock behaviour).
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
    this._pollPhone();
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
    clearInterval(this._phoneTimerId);
    clearTimeout(this._nudgeTimerId);
    clearTimeout(this._fontCheckTimerId);
    if (this._allowInputTimerId)
    {
        clearTimeout(this._allowInputTimerId);
        this._allowInputTimerId = null;
    }
    this._cancelFastTilt();

    delete this.properties;
};

framework.registerCtrlLoaded("MainMenuCtrl");
