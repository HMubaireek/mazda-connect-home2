# Home 2.0 — notes for Claude

A custom home screen ("Ember Glass") for Mazda Connect 1. Owner: Hussain (HMubaireek). His car is a
**2019 Mazda CX-9, Saudi market, firmware 74.00.333A 4A N (ADR)**, system language **Arabic**.
v1.0.4 is installed and confirmed working in the car (31 Oct 2026). v1.1.0 ("Ember Glance" layout, live status card)
and v1.2.0 (+ "Floating Pills" system skin for Mazda's screens) were built and tested on 31 Oct 2026 but are not
yet confirmed in the car. Read this whole file before changing anything.

## What the owner wants
- Arabic first, right-to-left, Arabic-Indic digits, Hijri (Umm al-Qura) date under the Gregorian date.
- **Tajawal** font (Light for the clock, Medium for secondary lines, Bold for labels).
- Look: modern, vibrant, "2027". He rejected an early round as "feels like 1990". He picked design **D, "Ember Glass"**
  (glass cards, Midnight palette with soft colour glows and light-trail arcs, no background pattern).
- Round 5 (31 Oct 2026): he picked **L · Ember Glance**: clock top right, a parked/driving chip and a small Android Auto /
  CarPlay pill (only while a phone is connected) under the date, a status card on the left (car / phone / media rows),
  the 5-tile dock with badges. He does **not** want prayer times. The old big phone card is gone.
- Must work with the commander knob (turn, tilt, press, up/down) and touch.
- Design rounds were shown as a canvas artifact: https://claude.ai/artifact/MPcAA3UpXN89E7ko7JLTyn
  Propose new designs the same way (several options side by side, Arabic shown), then build the chosen one.

## Live status sources (firmware 74, researched 31 Oct 2026)
All read from the system app instance `framework._appInstances.system` without changing systemApp.js:
- Warnings: `_masterApplicationDataList` item `SelectWarnGuide`, `label1` = count string. Maintenance due: `_SchedMaintDueStatus`.
- Missed calls / SMS / email: `_communicationsDataList` items `SelectCallHistory` / `SelectSms` / `SelectEmail`, `label1`.
- BT phone name: `_masterEntertainmentDataList` item `SelectBTAudio`, `text1SubMap.deviceName`.
- Playing source: the Entertainment item whose `image1` is the NowPlaying icon (`appData.audioSourceId`).
- Driving: `framework.common.getAtSpeedValue()`.
- **Mazda bug:** `_StatusPhoneCallMsgHandler` never sets the Active Call item visible (its condition can't be true), and
  paused audio leaves no trace. So the launcher wraps `systemApp._messageTable.StatusPhoneCall` / `StatusUpdateAudioSource`
  once (flag `_home2Hooked`), records into the global `HOME2_LIVE`, and calls the original handler.
- Not available on the screen: oil life %, km to service, fuel economy (sent only while those Mazda screens are open),
  fuel level, range, odometer, tyre pressure, outside temperature, weather (no internet; AA/CarPlay don't send it).
- Status rows use stock home events only (car → `app`, phone → `com`, media → `ent`). Direct events like
  `SelectWarnGuide` are only known to work from the Applications list; untested from the home screen.
- run.sh recognises an installed launcher by the line `Home 2.0 "Ember Glass" launcher` in the JS header: keep it.

## System skin: top bar, alerts, menus (researched 31 Oct 2026, Round 6 on the canvas)
- Top bar = `common/controls/StatusBar` (StatusBarCtrl.js/.css, StatusBarBg.png 800x64). CSS + images only; 64px tall.
  Parts: home btn or Android Auto/CarPlay btn (x 1-59), domain icon (59-117), title `StatusBarCtrlAppName` (Tipperary
  Semibold 40px), two `StatusBarCtrlIconContainer` rows (Traffic, Roaming / Message, WifiSignal, Batt, Bluetooth that
  also shows PhoneSignal/Music), clock (right, 114px, text set by JS in Latin digits). In AA/CarPlay mode the JS narrows the bar.
- Alerts = `common/controls/Sbn` (SbnCtrl.css, StatusNotificationBg.png 626x60): drawn over the bar at x 59, 626x58.
- Menus = `common/controls/List2` (9000-line CSS, ListFocus.png red glow, ListBackground.png curved panel); rows are 64px.
- Screen background = `common/images/background.png` (grey smoke) via `.CommonBgImg`.
- Every Mazda CSS says "Tipperary" (no Arabic glyphs) → Arabic falls back to a system font. Fix globally with CSS.
- **Hook:** the framework loads `common/css/common.css` like an app sheet and, for ar_SA/he_IL, also `common/css/common_rtl.css`,
  which Mazda does not ship. Adding that one file gives an Arabic-only global stylesheet (use `!important`); no Mazda file changes.
  Alternative `/jci/opera/opera_dir/styles/user.css` is active (opera.ini `Local CSS File`) but is a Mazda file and applies to all languages.
- The Android Auto Theme installer in his Mazda folder also replaces `StatusBarBg.png` / `StatusBar_Divider.png`.
- He likes **Q · Floating Pills** (bar mirrored for Arabic, no bar background, clock and icons in glass pills, Tajawal).
  Menus: ALL rows inside ONE rounded glass container with thin dividers, focused row a rounded pill inside it
  (he rejected one rounded border per row). Rows fill the container edge to edge; the focused row is filled across its
  full width (no inset, no outline); first/last rows follow the container corners. Bar pills and the menu container
  share a 24px side margin so their edges line up; the alert pill spans from the left button to the clock pill.
- New top-bar icon set wanted (signal bars with unlit bars dimmed, rounded battery with fill level, message bubble with a
  red dot, refined Bluetooth/Wi-Fi/roaming, amber traffic). The JS sets each icon as an inline
  `background-image: url(common/images/icons/IcnSb<Name>[_<state>].png)` on `#StatusBar_<container>`; override per state with
  `[style*="IcnSbBatt_03"] { background-image: url(...) !important }` (author !important beats inline style). Every state
  PNG (Batt_00-05, PhoneSignal_00-05, WifiSignal_00-04 + _active, Bluetooth, Bluetooth_Ds, Message, Music, Roaming,
  Traffic) has a replacement in the new style.
- **Built in v1.2.0:** `src/skin/common_rtl.css` → car `/jci/gui/common/css/common_rtl.css`; images
  `installer/home2/skin/images/home2skin/` (from `tools/build_assets.py`) → `/jci/gui/common/images/home2skin/`.
  run.sh backs up a pre-existing common_rtl.css (not ours = no "Home 2.0 system skin" line) and restores it on Remove.
  The launcher wraps `StatusBarCtrl.prototype.setIcon` / `setupCPAAMode` once to add "H2On" to icon groups with a
  visible icon (CSS hides empty groups). Lists: the mask is the container (x 26-708 inside the 732px List2Ctrl,
  screen 94-776), the scroller is shifted -26px so rows keep Mazda's positions. Mazda's stock CSS left-aligns
  style01 Arabic row text; the skin keeps that (right-aligning risks clashing with labels/switches in other row styles).
  Lists sit in `TemplateWithStatusLeft` (left 60, width 740) beside the LeftBtn back button (x 0-94).
  SBN moved to x 130-722 (between clock pill and right button); inner text widths narrowed.
- Skin test: `preview/skin.html` + `tests/browser/skin.mjs` need Mazda's CSS in `preview/mazda/` (git-ignored, Mazda's
  files): `sh tools/copy_mazda_preview.sh <extracted jci/gui>`. The firmware extraction lives only in a session
  scratchpad: re-extract from the .up (rootfs1/e0000000001.dat.gz is gzip inside gzip: `gzip -dc | gzip -dc | tar`).

## Repo layout
- `src/launcher/MainMenuCtrl.js` (+ `hijri.js`, generated) — the launcher; `MainMenuCtrl.css`, `MainMenuCtrl_rtl.css`.
- `src/fonts/` original Tajawal; `tools/rename_fonts.py` → `installer/home2/fonts/Home2Tajawal-*.ttf`.
- `tools/build_assets.py` (backgrounds, icon chips), `gen_hijri.py`, `make_trigger.py` (USB trigger MP3s).
- `build.sh` → `installer/home2/*` + `checksums.md5` + `dist/home2-installer-<VERSION>.zip`. Bump `VERSION` for every car build.
- `installer/run.sh` — install/remove script run on the car. `preview/index.html` — desktop preview with a stubbed framework
  (`?lang=ar_SA|en_US&phone=none|androidauto|carplay&fmt=12hrs|24hrs&focus=N&cached=<ms>`).
- Tests (all must pass before anything goes to the car):
  `./build.sh && sh tests/test_installer.sh && (cd tests/browser && npm install && npm test)`.
  `npm test` = ES5 parse check + behaviour checks + screenshots into `docs/` + clock checks.
  Headless Chromium comes from `@sparticuz/chromium` + `puppeteer-core` (Playwright's browser download was blocked by the proxy).
- **On his Windows PC** (desktop session): `build.sh` and `tests/test_installer.sh` run in WSL `Ubuntu-20.04` (has zip, md5sum).
  Run the installer tests from a copy under `/tmp` (on `/mnt/c` some checks fail because of the Windows drive).
  If you clone inside WSL use `git -c core.autocrlf=false`. Assets: `py -3.11 tools/build_assets.py` with the Poppler
  `Library/bin` (has cairo.dll) on PATH. Browser tests: Node 16 is installed, so run `npx -y node@20 <test>.mjs` with
  `CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"` (see `tests/browser/browser.mjs`).

## The car's GUI (firmware 74)
- HTML/CSS/JS in **Opera Presto** (Opera/9.80). **ES5 only, no flexbox**, use `-o-` prefixes (`-o-linear-gradient`).
  `box-shadow` with a large blur renders as a solid slab: use thin rings (e.g. `0 0 0 3px rgba(...)`) or bake glows into PNGs.
- Screen 800×480; Mazda's status bar takes the top 64px, so the home area is **800×416**. Absolute positioning throughout.
- The home menu is `apps/system/controls/MainMenu` (`MainMenuCtrl`). Keep its public API: constructor(uiaId, parentDiv, controlId,
  properties), handleControllerEvent, setText, getRemoteUiButtonStatus, startTransitionFrom, endTransitionTo, getContextCapture,
  restoreContext, finishPartialActivity, cleanUp. `selectCallback` gets `{icon: app|com|ent|nav|set}`.
  `systemApp.js` is NOT modified (keep it that way — it runs the whole UI).
- Launch phone apps: `framework.sendEventToMmui(uiaId, "SelectAndroidAuto" | "SelectCarPlay")`.
- Phone state: `framework.common._remoteUiBtns[uiaId].appName` ("androidauto"/"carplay"); fallback
  `systemApp._masterEntertainmentDataList` items `USB1AndroidAuto`/`USB1CarPlay` with `disabled === false`. Polled every second.
- Knob: `upStart` from the top row must return `"giveFocusUp"` (focus moves to the status bar). Tilt is mirrored in RTL.
- The framework loads `<name>_rtl.css` automatically when the language is `ar_SA` or `he_IL`.
- **Time:** the CMU's Linux clock is never set (`new Date()` gives 1970). Use `framework.common.getCurrentTime()` (what Mazda's
  status-bar clock uses); 12/24h from `framework.localize.getTimeFormat()`. Show nothing rather than a 1970 date.
- **Fonts:** web fonts are off (`Enable Webfonts=0` in opera.ini), so fonts are installed as system fonts.
  Opera is started by the system manager (`/jci/sm/sm.conf`) with the environment from **`/etc/profile`, which sets
  `OPERA_FONTS=/jci/fonts/CHN`**. `/jci/opera/run-Opera` says `/jci/fonts` but is not used — fonts put in `/jci/fonts` are never
  seen (this cost three install rounds). `run.sh` asks the running Opera for its `OPERA_FONTS` and installs there.
  Presto draws Arabic with **presentation-form codepoints** (U+FB50–FDFF, U+FE70–FEFF); fonts must map them
  (`rename_fonts.py` adds them via HarfBuzz). Mazda's own fonts: Tipperary (Latin), Akhbar MT OTS (Arabic fallback).
  Each Tajawal weight has its own family name ("Home2 Tajawal Light/Medium/Bold"); always pair the Bold family with
  `font-weight: 700` (a probe at normal weight reported Latin Bold as not loaded).
- Stock MainMenuCtrl md5 (74.00.333A ADR): js `40ccb293b8c6f80960f0b953dd2e173e`, css `84071812f5641ca8c51ae366bd6da674`.
- Firmware files to research: `C:\Users\hmuba\Downloads\Mazda\74.00.333A 4A N ADR.zip` on his PC. Inside the `.up`,
  `e0000000001.dat.gz` is the gzipped root file system tar (`/jci/gui`, `/jci/fonts`, `/etc/profile`, `/jci/sm`, ...).
  Check how something is really started/configured on the car, not just the nearest script.

## Installing on the car
- Stick layout = contents of `installer/` at the stick root (FAT32). Trigger: an MP3 whose ID3 title loads `js/run.js`, which
  opens Diagnostics → "Choose a script" → Next → **TERMINAL**. A **USB keyboard is required**.
- The stick's mount name changes (sdb1, sda1, ...). Tell him: `ls /tmp/mnt/*/run.sh`, then `sh <that path>`
  (`sd_nav` is the navigation SD card). `run.sh` checks firmware 74, verifies `checksums.md5`, backs up originals to
  `/data_persist/home2-backup` and the stick's `backup/` (reinstall keeps the existing backup), installs, verifies, reboots.
  Logs go to the stick's `logs/`. Remove = same script → "Remove".
- Also installed: oem-aa-mod 0.10.0 (Android Auto multi-touch). It changes different files.

## Writing to his USB stick from a cloud session
- Use the device tools (list/stage/commit); the device shell cannot mount the stick (D:).
- The copy tool adds C2PA metadata to PNG and MP3 files (pixels and ID3 title unchanged, md5 changes). After copying, stage
  the stick's files back and regenerate `home2/checksums.md5` from what is actually on the stick, then verify with `md5sum -c`.
- The copy tool can resend a **cached older file** when a staged path is reused: copy from a fresh path each time and
  read the file back to confirm size/md5.
- Keep the stick's `backup/` and `logs/` folders.

## Working with Hussain
- He follows steps in the car on his phone: give short numbered steps, exact commands in code blocks, and say what he should
  see. Say when it is safe to remove the USB stick. He sends photos of the screen; ask for a sharper one if unreadable.
- Engine-off rules for firmware updates (ACC, tap brake every ~18 min) — not needed for Home 2.0 installs.
- Commit with the session attribution lines; he owns the GitHub repo HMubaireek/mazda-connect-home2 (Apache 2.0).
