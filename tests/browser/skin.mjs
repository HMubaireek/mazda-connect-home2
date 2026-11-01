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
expect('menu container starts after the back button', (await box('.List2CtrlMask'))[0], 94);
expect('focused row is a rounded pill image', (await css('.ListItem.focus', 'backgroundImage')).includes('list_focus.png'), true);
expect('Arabic rows mirrored (text right, controls left)', (await css('.ListItem.focus', 'transform')).startsWith('matrix(-1'), true);
expect('Arabic row text right-aligned', await css('.ListItem .line1', 'textAlign'), 'right');
expect('row text smaller than stock 35px', await css('.ListItem .line1', 'fontSize'), '26px');
expect('scroll indicator on the left in Arabic', (await box('.List2CtrlScrollIndicatorWrapper'))[0], 102);
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
const table = JSON.parse(readFileSync(new URL('../../tools/skin_controls.json', import.meta.url), 'utf8'));
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
expect('en menu container lines up with the bar', (await box('.List2CtrlMask')).slice(0, 2), [94, 776]);
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

await open('screen=settings&skin=0');
expect('stock look without the skin', (await css('.StatusBarCtrlAppName', 'fontFamily')).includes('Tajawal'), false);

console.log(fails ? fails + ' FAILED' : 'ALL SKIN CHECKS PASSED');
await browser.close();
if (fails) process.exit(1);
