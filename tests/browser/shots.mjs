import { fileURLToPath } from 'url';
import { launch } from './browser.mjs';

const base = new URL('../../preview/index.html', import.meta.url).href;
const out = fileURLToPath(new URL('../../docs/', import.meta.url));
const browser = await launch();
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
// The launcher adds common/css/home2skin.css, which only exists on the car: ignore that missing file here.
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FILE_NOT_FOUND')) console.log('CONSOLE', m.text()); });

const BT = encodeURIComponent('جوال حسين');
const BUSY = 'warnings=2&service=1&missed=3&texts=1&bt=' + BT + '&maintkm=3200&maintmonths=4&oil=75';
const CALM = 'fuel=10.4&maintkm=3200&maintmonths=4&oil=75';

async function shot(qs, file) {
  await page.goto(base + '?' + qs, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { const f = document.querySelector('.H2FontCheck'); if (f) f.style.display = 'none'; });
  const el = await page.$('#screen');
  await el.screenshot({ path: out + file });
  console.log('shot', file);
}

await shot('lang=ar_SA&phone=androidauto&fmt=12hrs&focus=4&' + BUSY, 'shot_ar_glance.png');
await shot('lang=ar_SA&phone=carplay&fmt=12hrs&focus=2&call=1&warnings=1&missed=3&texts=1&bt=' + BT + '&' + CALM, 'shot_ar_drive_call.png');
await shot('lang=ar_SA&phone=none&fmt=12hrs&focus=5&bt=' + BT + '&' + CALM, 'shot_ar_allclear.png');
await shot('lang=en_US&phone=androidauto&fmt=12hrs&focus=4&' + BUSY.replace(BT, 'Hussain%27s%20phone'), 'shot_en_glance.png');
await shot('lang=en_US&phone=carplay&fmt=12hrs&focus=2&call=1&warnings=1&missed=3&texts=1&bt=Hussain%27s%20phone&' + CALM, 'shot_en_drive_call.png');
await shot('lang=en_US&phone=none&fmt=12hrs&focus=5&bt=Hussain%27s%20phone&' + CALM, 'shot_en_allclear.png');

// ---- behaviour checks ----
async function state() {
  return page.evaluate(() => {
    const items = ctrl._items.map(i => i.div.classList.contains('H2Focus'));
    return { focus: ctrl._focus, highlighted: items.indexOf(true), log: document.getElementById('log').textContent };
  });
}
async function key(k) { await page.keyboard.press(k); await new Promise(r => setTimeout(r, 50)); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const text = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
const shown = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
async function live(o) { await page.evaluate(x => setStatus(x), o); await wait(1600); }

let fails = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (want ' + JSON.stringify(want) + ')'));
}

// Items: 0 pill, 1 car row, 2 phone row, 3 maintenance row, 4 Navigation, 5 Media, 6 Phone, 7 Settings, 8 Apps.
// English, phone connected: knob order and up/down
await page.goto(base + '?lang=en_US&phone=androidauto', { waitUntil: 'load' });
expect('en start on pill', (await state()).focus, 0);
await key(']'); expect('en rotate cw -> car row', (await state()).focus, 1);
await key('ArrowUp'); expect('en up from car row -> pill', (await state()).focus, 0);
await key('ArrowUp'); expect('en up from pill -> status bar', (await state()).log, 'giveFocusUp (focus moves to the status bar)');
await key('Enter'); expect('en select pill', (await state()).log, 'sendEventToMmui(system, SelectAndroidAuto)');
await wait(1100);
await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown');
expect('en down through the card', (await state()).focus, 3);
await key('ArrowDown'); expect('en down from maintenance row -> dock', (await state()).focus, 4);
await key('ArrowDown'); expect('en down in dock stays', (await state()).focus, 4);
await key('ArrowRight'); await key('ArrowRight');
await key('ArrowUp'); expect('en up from dock -> maintenance row', (await state()).focus, 3);
await key('Enter'); expect('en select maintenance row -> Applications', (await state()).log, 'selectCallback icon=app');
await wait(1100);
for (let i = 0; i < 10; i++) await key(']');
expect('en clamp at end', (await state()).focus, 8);
await key('Enter'); expect('en select Apps', (await state()).log, 'selectCallback icon=app');
await wait(1100);

// Arabic: tilting and turning are mirrored (the items run right to left)
await page.goto(base + '?lang=ar_SA&phone=carplay', { waitUntil: 'load' });
await key('['); await key('[');
expect('ar turn left moves to the next item (left)', (await state()).focus, 2);
await key(']'); expect('ar turn right moves back (right)', (await state()).focus, 1);
await key('['); await key('ArrowRight'); expect('ar tilt right (mirrored)', (await state()).focus, 1);
await key('ArrowLeft'); expect('ar tilt left (mirrored)', (await state()).focus, 2);
expect('ar pill title', await text('.H2PillTitle'), 'آبل كاربلاي');

// No phone: pill hidden, start on Navigation, knob stops at the car row
await page.goto(base + '?lang=en_US&phone=none', { waitUntil: 'load' });
expect('no phone: start on Navigation', (await state()).focus, 4);
expect('no phone: pill hidden', await shown('.H2Pill'), false);
for (let i = 0; i < 9; i++) await key('[');
expect('no phone: knob stops at car row', (await state()).focus, 1);
await key('ArrowUp'); expect('no phone: up from car row -> status bar', (await state()).log, 'giveFocusUp (focus moves to the status bar)');

// Touch
async function tap(sel) {
  const b = await (await page.$(sel)).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await wait(100);
}
await tap('.H2Row1'); expect('touch car row -> Applications', (await state()).log, 'selectCallback icon=app');
await wait(1100);
await tap('.H2Row2'); expect('touch phone row -> Communication', (await state()).log, 'selectCallback icon=com');
await wait(1100);
await tap('.H2Dock4'); expect('touch Settings tile', (await state()).log, 'selectCallback icon=set');
await wait(1100);

// Status card, Arabic, everything showing
await page.goto(base + '?lang=ar_SA&phone=androidauto&' + BUSY, { waitUntil: 'load' });
expect('ar car title (2 warnings)', await text('.H2Row1 .H2RowTitle'), 'تحذيران في السيارة');
expect('ar car sub (warnings)', await text('.H2Row1 .H2RowSub'), 'اضغط لعرض دليل التحذيرات');
expect('ar phone title = Bluetooth name', await text('.H2Row2 .H2RowTitle'), 'جوال حسين');
expect('ar phone sub (missed + texts)', await text('.H2Row2 .H2RowSub'), '٣ مكالمات فائتة · رسالة جديدة');
expect('ar phone row badge', await text('.H2Row2 .H2RowBadge'), '٤');
expect('ar Phone tile badge', await text('.H2Dock3 .H2DockBadge'), '٤');
expect('ar Apps tile flags the car', await text('.H2Dock5 .H2DockBadge'), '!');
expect('ar maintenance due', await text('.H2Row3 .H2RowTitle'), 'الصيانة مستحقة');
expect('ar maintenance due in', await text('.H2Row3 .H2RowSub'), 'بعد ٣٢٠٠ كم · ٤ أشهر');
expect('ar oil life', await text('.H2Row3 .H2RowEnd'), 'عمر الزيت ٧٥٪');
expect('ar no parked chip any more', await page.evaluate(() => document.querySelector('.H2Drive') === null), true);

// Live changes, the way the car sends them
await live({ call: true });
expect('call: phone row', await text('.H2Row2 .H2RowTitle'), 'مكالمة جارية');
expect('call: phone row sub', await text('.H2Row2 .H2RowSub'), 'جوال حسين · اضغط للعودة');
expect('call: green dot on Phone tile', await text('.H2Dock3 .H2DockBadge'), '●');
expect('call: stock handler still runs', await page.evaluate(() => sysApp._handled > 0), true);
await live({ call: false });
expect('call ended', await text('.H2Row2 .H2RowTitle'), 'جوال حسين');
await live({ warnings: 0, service: false });
expect('all clear', await text('.H2Row1 .H2RowTitle'), 'السيارة سليمة');
expect('all clear: no warnings line', await text('.H2Row1 .H2RowSub'), 'لا تحذيرات');
expect('all clear: no Apps flag', await shown('.H2Dock5 .H2DockBadge'), false);
expect('next service', [await text('.H2Row3 .H2RowTitle'), await text('.H2Row3 .H2RowSub')], ['الصيانة القادمة', 'بعد ٣٢٠٠ كم · ٤ أشهر']);
await live({ fuel: '10.4' });
expect('fuel economy on the car row', await text('.H2Row1 .H2RowSub'), 'متوسط الاستهلاك ١٠٫٤ لتر/١٠٠ كم');
await live({ service: true });
expect('service due flag', await text('.H2Row3 .H2RowTitle'), 'الصيانة مستحقة');
expect('service due: Apps flag', await text('.H2Dock5 .H2DockBadge'), '!');
await live({ warnings: 11 });
expect('11 warnings wording', await text('.H2Row1 .H2RowTitle'), '١١ تحذيرًا في السيارة');
await live({ warnings: 1, service: false, maintkm: 0, maintmonths: 1, oil: 40 });
expect('1 warning wording', await text('.H2Row1 .H2RowTitle'), 'تحذير واحد في السيارة');
expect('one month wording', await text('.H2Row3 .H2RowSub'), 'بعد شهر');
expect('oil updates', await text('.H2Row3 .H2RowEnd'), 'عمر الزيت ٤٠٪');
await live({ missed: 0, texts: 0 });
expect('no news', await text('.H2Row2 .H2RowSub'), 'لا مكالمات أو رسائل جديدة');
expect('no news: no badge', await shown('.H2Dock3 .H2DockBadge'), false);
await live({ bt: '' });
expect('no Bluetooth phone', await text('.H2Row2 .H2RowTitle'), 'لا يوجد جوال بلوتوث');

// Phone unplugged while the pill has focus
await page.evaluate(() => { ctrl._moveTo(0); framework.common._remoteUiBtns.system = null; });
await wait(1200);
expect('pill gone -> focus moves to Navigation', (await state()).focus, 4);
expect('pill hidden after unplug', await shown('.H2Pill'), false);
await page.evaluate(() => { framework.common._remoteUiBtns.system = { appName: 'androidauto' }; });
await wait(1200);
expect('pill back when phone connects', await shown('.H2Pill'), true);

// Before the maintenance app has data, English wording
await page.goto(base + '?lang=en_US&phone=none&missed=3&texts=12&bt=Pixel', { waitUntil: 'load' });
expect('en maintenance before data', [await text('.H2Row3 .H2RowTitle'), await text('.H2Row3 .H2RowSub')], ['No service due', 'Details appear after opening Maintenance']);
expect('en no oil value yet', await text('.H2Row3 .H2RowEnd'), '');
expect('en counts', await text('.H2Row2 .H2RowSub'), '3 missed calls · 12 new messages');
expect('en car ok', await text('.H2Row1 .H2RowTitle'), 'Car is OK');
await live({ fuel: '8.2', maintkm: 1500, maintmonths: 2, oil: 60 });
expect('en fuel', await text('.H2Row1 .H2RowSub'), 'Average 8.2 L/100km');
expect('en next service', await text('.H2Row3 .H2RowSub'), 'in 1500 km · 2 months');
expect('en oil', await text('.H2Row3 .H2RowEnd'), 'Oil life 60%');
await page.evaluate(() => { maintApp._oilMaintenanceMode = 'Fixed'; });
await live({ oil: 60 });
expect('en oil life hidden with the Fixed oil-change setting', await text('.H2Row3 .H2RowEnd'), '');
await live({ fuel: '--.-' });
expect('en no fuel line while the car sends --.-', await text('.H2Row1 .H2RowSub'), 'No warnings');

// Mazda's list control, hooked when it loads: our row icons, and only one row keeps the focus mark
const listResult = await page.evaluate(() => {
  window.List2Ctrl = function() {};
  List2Ctrl.prototype._setImage = function(li, cls, url) { this.lastUrl = url; return li; };
  List2Ctrl.prototype._getDOMItem = function(i) { return this.rows[i]; };
  List2Ctrl.prototype._showFocus = function(i) { this.rows[i].classList.add('focus'); this._lastItemWithFocus = i; return i; };
  framework.registerCtrlLoaded('List2Ctrl');
  const l = new List2Ctrl();
  l.divElt = document.createElement('div');
  l.rows = [0, 1, 2].map(() => { const r = document.createElement('div'); r.className = 'ListItem'; l.divElt.appendChild(r); return r; });
  l._setImage(null, '.image1', 'common/images/icons/IcnListAddRecipient_En.png');
  const swapped = l.lastUrl;
  l._setImage(null, '.image1', './data/contact_photo_12.jpg');
  const photo = l.lastUrl;
  l._setImage(null, '.image1', 'common/images/icons/IcnListPandora_En.png');
  const brand = l.lastUrl;
  l.rows[0].classList.add('focus');        // a mark Mazda left behind while scrolling
  l._showFocus(2);
  return { swapped, photo, brand, focused: l.divElt.querySelectorAll('.focus').length, kept: l.rows[2].classList.contains('focus') };
});
expect('list icon swapped for ours', listResult.swapped, 'common/images/home2skin/icn/IcnListAddRecipient_En.png');
expect('contact photo left alone', listResult.photo, './data/contact_photo_12.jpg');
expect('brand logo left as Mazda drew it', listResult.brand, 'common/images/icons/IcnListPandora_En.png');
expect('only one row keeps the focus mark', [listResult.focused, listResult.kept], [1, true]);

// Rebuilding the home screen does not wrap the system app's handlers twice
await page.evaluate(() => {
  ctrl.cleanUp();
  ctrl.divElt.parentNode.removeChild(ctrl.divElt);
  window.ctrl = new MainMenuCtrl('system', document.getElementById('tmpl'), 'MainMenuCtrl1', { selectCallback: function() {} });
  sysApp._handled = 0;
  setStatus({ call: true });
});
await wait(1200);
expect('rebuilt: handler runs once', await page.evaluate(() => sysApp._handled), 1);
expect('rebuilt: call shown', await text('.H2Row2 .H2RowTitle'), 'Call in progress');

expect('launcher adds the system skin sheet', await page.evaluate(() => { const l = document.getElementById('Home2Skin'); return l ? l.getAttribute('href') : null; }), 'common/css/home2skin.css');
expect('font check line off by default', await page.evaluate(() => document.querySelector('.H2FontCheck') === null), true);

// Lost focus and back
await page.evaluate(() => ctrl.handleControllerEvent('lostFocus'));
expect('lostFocus clears highlight', (await state()).highlighted, -1);
await page.evaluate(() => ctrl.handleControllerEvent('acceptFocusFromTop'));
expect('focus restored', (await state()).highlighted >= 0, true);

await page.evaluate(() => ctrl.cleanUp());
console.log(fails ? fails + ' FAILED' : 'ALL CHECKS PASSED');
await browser.close();
if (fails) process.exit(1);
