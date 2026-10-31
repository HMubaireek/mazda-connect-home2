// The Arabic system skin on top of Mazda's own CSS (preview/skin.html). Needs Mazda's GUI files in
// preview/mazda/ (sh tools/copy_mazda_preview.sh <extracted jci/gui>); without them this test is skipped.
import { existsSync } from 'fs';
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
expect('focused row fills the row', await css('.ListItem.focus', 'backgroundColor'), 'rgba(190, 205, 255, 0.22)');
expect('focused row spans the container', (await box('.ListItem.focus')).slice(0, 2), [68, 800]);
expect('empty icon group hidden', await css('.StatusBarCtrlIconContainer', 'display'), 'none');
expect('icon group with icons is a pill', await page.evaluate(() => getComputedStyle(document.querySelectorAll('.StatusBarCtrlIconContainer')[1]).display), 'inline-block');
expect('battery uses the new icon', (await css('#StatusBar_Batt', 'backgroundImage')).includes('sb_batt_04.png'), true);
expect('signal uses the new icon', (await css('#StatusBar_Bluetooth', 'backgroundImage')).includes('sb_signal_04.png'), true);
expect('back button restyled', (await css('.LeftBtnCtrlBackBtn', 'backgroundImage')).includes('back_en.png'), true);
expect('Mazda right arc hidden', await css('.CommonRightChrome', 'display'), 'none');
expect('Midnight background', (await css('.CommonBgImg', 'backgroundImage')).includes('home2skin/bg.png'), true);

await open('screen=alert&alert=nav');
expect('alert between clock and right pill', (await box('.SbnCtrl')).slice(0, 2), [130, 722]);
expect('alert text in Tajawal Bold', (await css('.SbnCtrl_Style02_Text1', 'fontFamily')).split(',')[0], '"Home2 Tajawal Bold"');

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

await open('screen=settings&skin=0');
expect('stock look without the skin', (await css('.StatusBarCtrlAppName', 'fontFamily')).includes('Tajawal'), false);

console.log(fails ? fails + ' FAILED' : 'ALL SKIN CHECKS PASSED');
await browser.close();
if (fails) process.exit(1);
