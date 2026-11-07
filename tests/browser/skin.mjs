// The Arabic system skin on top of Mazda's own CSS (preview/skin.html). Needs Mazda's GUI files in
// preview/mazda/ (sh tools/copy_mazda_preview.sh <extracted jci/gui>); without them this test is skipped.
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { launch } from './browser.mjs';

const mazda = fileURLToPath(new URL('../../preview/mazda/common/controls/StatusBar/css/StatusBarCtrl.css', import.meta.url));
if (!existsSync(mazda)) {
  console.log('SKIP skin checks: Mazda GUI files not in preview/mazda (see tools/copy_mazda_preview.sh)');
  process.exit(0);
}

const base = new URL('../../preview/skin.html', import.meta.url).href;
const out = fileURLToPath(new URL('../../docs/', import.meta.url));
const browser = await launch();
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGE ERROR', e.message));

async function open(qs) {
  await page.goto(base + '?' + qs, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 300));
}
async function shot(qs, file) {
  await open(qs);
  await page.screenshot({ path: out + file, clip: { x: 0, y: 0, width: 800, height: 480 } });
  console.log('shot', file);
}

await shot('screen=settings', 'skin_ar_settings.png');
await shot('screen=alert&alert=nav', 'skin_ar_alert.png');
await shot('screen=home&focus=btn', 'skin_ar_home.png');
await shot('screen=icons', 'skin_ar_icons.png');
await shot('lang=en&screen=settings', 'skin_en_settings.png');
await shot('lang=en&screen=alert&alert=nav', 'skin_en_alert.png');
await shot('lang=en&screen=home&focus=btn', 'skin_en_home.png');
await shot('lang=en&screen=icons', 'skin_en_icons.png');
await shot('screen=mute', 'skin_ar_mute.png');
await shot('lang=en&screen=mute', 'skin_en_mute.png');
for (const s of ['media', 'fuel', 'dialpad', 'keyboard', 'tabs', 'favorites', 'radio', 'camadjust', 'contacts', 'loading', 'dialog',
                 'calls', 'incall', 'incall2']) {
  await shot('screen=' + s, 'skin_ar_' + s + '.png');
  await shot('lang=en&screen=' + s, 'skin_en_' + s + '.png');
}

let fails = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (want ' + JSON.stringify(want) + ')'));
}
const css = (sel, prop) => page.evaluate((s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }, sel, prop);
const box = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; }, sel);

await open('screen=settings');
expect('title in Tajawal Bold', (await css('.StatusBarCtrlAppName', 'fontFamily')).split(',')[0], '"Home2 Tajawal Bold"');
expect('menu rows in Tajawal Medium', (await css('.ListItem .line1', 'fontFamily')).split(',')[0], '"Home2 Tajawal Medium"');
expect('clock pill at the left edge (24px)', (await box('.StatusBarCtrlClock')).slice(0, 2), [24, 120]);
expect('home pill at the right edge (776px)', (await box('.StatusBarCtrlHomeBtn')).slice(0, 2), [732, 776]);
expect('menu container right edge in line with the bar (776px)', (await box('.List2CtrlMask'))[1], 776);
expect('menu container starts after the back button', (await box('.List2CtrlMask'))[0], 102);
expect('focused row is a rounded pill image (mirrored copy)', (await css('.ListItem.focus', 'backgroundImage')).includes('list_focus_rtl.png'), true);
expect('Arabic rows mirrored (text right, controls left)', (await css('.ListItem.focus', 'transform')).startsWith('matrix(-1'), true);
expect('Arabic row text right-aligned', await css('.ListItem .line1', 'textAlign'), 'right');
expect('row text smaller than stock 35px', await css('.ListItem .line1', 'fontSize'), '26px');
expect('scroll indicator outside the container, after the back button', (await box('.List2CtrlScrollIndicatorWrapper'))[0], 84);
expect('screen icon replaced', (await css('.StatusBarCtrlDomainIcon', 'backgroundImage')).includes('sbn_settings.png'), true);
expect('focused row spans the container', (await box('.ListItem.focus')).slice(0, 2), [68, 800]);
expect('empty icon group hidden', await css('.StatusBarCtrlIconContainer', 'display'), 'none');
expect('icon group with icons is a pill', await page.evaluate(() => getComputedStyle(document.querySelectorAll('.StatusBarCtrlIconContainer')[1]).display), 'inline-block');
expect('battery uses the new icon', (await css('#StatusBar_Batt', 'backgroundImage')).includes('sb_batt_04.png'), true);
expect('signal uses the new icon', (await css('#StatusBar_Bluetooth', 'backgroundImage')).includes('sb_signal_04.png'), true);
expect('back button restyled', (await css('.LeftBtnCtrlBackBtn', 'backgroundImage')).includes('back_en.png'), true);
expect('Mazda right arc hidden', await css('.CommonRightChrome', 'display'), 'none');
expect('Midnight background, mirrored', (await css('.CommonBgImg', 'backgroundImage')).includes('home2skin/bg_rtl.png'), true);

await open('screen=alert&alert=nav');
expect('alert between clock and right pill', (await box('.SbnCtrl')).slice(0, 2), [130, 722]);
expect('alert text in Tajawal Bold', (await css('.SbnCtrl_Style02_Text1', 'fontFamily')).split(',')[0], '"Home2 Tajawal Bold"');
expect('alert as tall as the pills', (await box('.SbnCtrl')).slice(2, 4), [10, 54]);
expect('alert text size', await css('.SbnCtrl_Style02_Text1', 'fontSize'), '20px');
expect('alert mirrored in Arabic', (await css('.SbnCtrl', 'transform')).startsWith('matrix(-1'), true);
expect('alert text right-aligned in Arabic', await css('.SbnCtrl_Style02_Text1', 'textAlign'), 'right');
expect('navigation alert icon replaced', (await css('.SbnCtrl_Style02_Image1', 'backgroundImage')).includes('sbn_map.png'), true);

await open('screen=mute');
expect('mute box image replaced', (await css('.WinkStyle5Image1', 'backgroundImage')).includes('wink_mute.png'), true);

// Video screens (reversing camera, map, Android Auto) keep their transparent background
await open('screen=camera');
expect('camera / map / Android Auto background stays transparent', await css('#bg', 'backgroundImage'), 'none');
await open('lang=en&screen=camera');
expect('en camera background stays transparent', await css('#bg', 'backgroundImage'), 'none');

// Every redrawn Mazda control image: build an element with Mazda's own classes and check that our image wins
// (keypad keys / back button / panel and the contacts letter column are styled by hand in home2skin.css)
const HAND = /^(DialPad2\/(BtnLeft_|DialKey|DialPadStyle02_Bkgd|Key_)|List2\/IndexedList_(Divider|Focus|Hit))/;
const table = JSON.parse(readFileSync(new URL('../../tools/skin_controls.json', import.meta.url), 'utf8'))
  .filter(e => !HAND.test(e.control + '/' + e.file));
for (const lang of ['ar', 'en']) {
  await open((lang === 'en' ? 'lang=en&' : '') + 'screen=settings');
  const res = await page.evaluate((table) => {
    const host = document.getElementById('controls');
    let ok = 0; const bad = []; let skipped = 0;
    for (const e of table) {
      const sel = e.selectors.find(x => /^[a-zA-Z.\s_0-9-]+$/.test(x));
      if (!sel) { skipped++; continue; }
      let parent = host; let node = null;
      for (const part of sel.trim().split(/\s+/)) {
        const m = part.match(/^([a-z]*)((?:\.[A-Za-z0-9_-]+)*)$/);
        node = document.createElement(m[1] || 'div');
        node.className = m[2].split('.').filter(Boolean).join(' ');
        parent.appendChild(node); parent = node;
      }
      const bg = getComputedStyle(node).backgroundImage;
      if (bg.includes('home2skin/ctl/' + e.control + '_' + e.file)) ok++; else bad.push(e.control + '/' + e.file + ' <- ' + sel);
      host.innerHTML = '';
    }
    return { ok, bad, skipped };
  }, table);
  expect(lang + ': redrawn control images used (' + res.ok + ' of ' + table.length + ', ' + res.skipped + ' need special DOM)', res.bad, []);
}

await open('screen=icons');
expect('traffic/roaming group shown', await css('.StatusBarCtrlIconContainer', 'display'), 'inline-block');
expect('traffic uses the new icon', (await css('#StatusBar_Traffic', 'backgroundImage')).includes('sb_traffic.png'), true);
expect('Wi-Fi uses the new icon', (await css('#StatusBar_WifiSignal', 'backgroundImage')).includes('sb_wifi_03.png'), true);

await open('screen=home&focus=btn');
expect('Android Auto pill at the right edge', (await box('.StatusBarCtrlRemoteUIBtn_En')).slice(0, 2), [732, 776]);
expect('Android Auto icon replaced', (await css('.ButtonCtrlIcon_AA', 'backgroundImage')).includes('sb_aa.png'), true);
expect('home clock keeps Tajawal Light', (await css('.H2Time', 'fontFamily')).split(',')[0], '"Home2 Tajawal Light"');
expect('home clock keeps weight 300', await css('.H2Time', 'fontWeight'), '300');
expect('home labels keep Tajawal Bold', (await css('.H2DockLabel', 'fontFamily')).split(',')[0], '"Home2 Tajawal Bold"');

// English: the same skin, left to right (no common_rtl.css)
await open('lang=en&screen=settings');
expect('en title in Tajawal Bold', (await css('.StatusBarCtrlAppName', 'fontFamily')).split(',')[0], '"Home2 Tajawal Bold"');
expect('en menu rows in Tajawal Medium', (await css('.ListItem .line1', 'fontFamily')).split(',')[0], '"Home2 Tajawal Medium"');
expect('en home pill at the left edge (24px)', (await box('.StatusBarCtrlHomeBtn')).slice(0, 2), [24, 68]);
expect('en clock pill at the right edge (776px)', (await box('.StatusBarCtrlClock')).slice(0, 2), [680, 776]);
expect('en title starts after the screen icon', (await box('.StatusBarCtrlAppName'))[0], 124);
expect('en icon pill ends next to the clock pill', await page.evaluate(() => Math.round(document.querySelectorAll('.StatusBarCtrlIconContainer')[1].getBoundingClientRect().right)), 670);
expect('en menu container lines up with the bar', (await box('.List2CtrlMask')).slice(0, 2), [102, 776]);
expect('en focused row is a rounded pill image', (await css('.ListItem.focus', 'backgroundImage')).includes('list_focus.png'), true);
expect('en rows not mirrored', await css('.ListItem.focus', 'transform'), 'none');
expect('en battery uses the new icon', (await css('#StatusBar_Batt', 'backgroundImage')).includes('sb_batt_04.png'), true);
expect('en Midnight background, not mirrored', (await css('.CommonBgImg', 'backgroundImage')).includes('home2skin/bg_ltr.png'), true);
expect('en back button restyled', (await css('.LeftBtnCtrlBackBtn', 'backgroundImage')).includes('back_en.png'), true);
await open('lang=en&screen=alert&alert=nav');
expect('en alert between button and clock', (await box('.SbnCtrl')).slice(0, 2), [78, 670]);
await open('lang=en&screen=home&focus=btn');
expect('en Android Auto pill at the left edge', (await box('.StatusBarCtrlRemoteUIBtn_En')).slice(0, 2), [24, 68]);
expect('en home clock keeps Tajawal Light', (await css('.H2Time', 'fontFamily')).split(',')[0], '"Home2 Tajawal Light"');

// Contacts: the letter column has its own strip, the rows stop before it (v1.6.0, contact pictures overlapped letters)
for (const lang of ['ar', 'en']) {
  await open((lang === 'en' ? 'lang=en&' : '') + 'screen=contacts');
  const mask = await box('.List2CtrlMask');
  const letters = await box('.List2CtrlLetterIndexWrapper');
  expect(lang + ' letter strip beside the rows, not under them', lang === 'ar' ? letters[1] <= mask[0] : letters[0] >= mask[1], true);
  expect(lang + ' contact photo round', await page.evaluate(() => getComputedStyle(document.querySelectorAll('.ListItem .image1')[2]).borderTopLeftRadius), '50%');
  expect(lang + ' Mazda icons not rounded', await page.evaluate(() => getComputedStyle(document.querySelectorAll('.ListItem .image1')[1]).borderTopLeftRadius), '0px');
}
await open('screen=contacts');
expect('ar letter strip on the left', (await box('.List2CtrlLetterIndexWrapper')).slice(0, 2), [102, 202]);
expect('ar focused contact row uses the shorter mirrored pill', (await css('.ListItem.focus', 'backgroundImage')).includes('list_focus_li_rtl.png'), true);

// Call history: time and date fit inside the container
for (const lang of ['ar', 'en']) {
  await open((lang === 'en' ? 'lang=en&' : '') + 'screen=calls');
  const fits = await page.evaluate(() => {
    const m = document.querySelector('.List2CtrlMask').getBoundingClientRect();
    return [...document.querySelectorAll('.ListItem .label2')].every(l => {
      const r = document.createRange(); r.selectNodeContents(l); const t = r.getBoundingClientRect();
      return t.left >= m.left - 0.5 && t.right <= m.right + 0.5 && l.scrollWidth <= l.clientWidth;
    });
  });
  expect(lang + ' call date fits (was cut to "نوفم")', fits, true);
}

// Keypad and call screen
for (const lang of ['ar', 'en']) {
  await open((lang === 'en' ? 'lang=en&' : '') + 'screen=dialpad');
  expect(lang + ' keypad keys in Tajawal Light', (await css('.DialPad2Ctrl .btn5', 'fontFamily')).split(',')[0], '"Home2 Tajawal Light"');
  expect(lang + ' keypad call button is the round image', (await css('.callBtn', 'backgroundImage')).includes('dp_call_en.png'), true);
  expect(lang + ' keypad keys inside the container', [(await box('.btn1'))[0] >= 102, (await box('.btn3'))[1] <= (await box('.callBtn'))[0]], [true, true]);
  await open((lang === 'en' ? 'lang=en&' : '') + 'screen=incall');
  expect(lang + ' call screen contact picture round', await css('.H2CallPhoto', 'borderTopLeftRadius'), '50%');
  expect(lang + ' call screen name centred', await css('.InCall2ContactName', 'textAlign'), 'center');
  expect(lang + ' call picture centred', (await box('.InCall2ContactImageFrame')).slice(0, 2), [344, 456]);
}
await open('screen=incall2');
const c1 = await box('.InCall2Contact1 .InCall2ContactImageFrame');
const t1 = await box('.InCall2Contact1 .InCall2ContactElapsedTime');
expect('ar two calls: picture on the right, time on the left', c1[0] > t1[1], true);
await open('lang=en&screen=incall2');
expect('en two calls: picture on the left, time on the right', (await box('.InCall2Contact1 .InCall2ContactImageFrame'))[1] < (await box('.InCall2Contact1 .InCall2ContactElapsedTime'))[0], true);

await open('screen=settings&skin=0');
expect('stock look without the skin', (await css('.StatusBarCtrlAppName', 'fontFamily')).includes('Tajawal'), false);

console.log(fails ? fails + ' FAILED' : 'ALL SKIN CHECKS PASSED');
await browser.close();
if (fails) process.exit(1);
