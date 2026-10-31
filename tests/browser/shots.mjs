import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const base = new URL('../../preview/index.html', import.meta.url).href;
const out = new URL('../../docs/', import.meta.url).pathname;
const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: chromium.args,
  headless: true,
  defaultViewport: { width: 900, height: 600 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });

async function shot(qs, file) {
  await page.goto(base + '?' + qs, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { const f = document.querySelector('.H2FontCheck'); if (f) f.style.display = 'none'; });
  const el = await page.$('#screen');
  await el.screenshot({ path: out + file });
  console.log('shot', file);
}

await shot('lang=ar_SA&phone=androidauto&fmt=12hrs&focus=0', 'shot_ar_androidauto.png');
await shot('lang=ar_SA&phone=none&fmt=12hrs&focus=4', 'shot_ar_nophone.png');
await shot('lang=ar_SA&phone=carplay&fmt=12hrs&focus=3', 'shot_ar_carplay.png');
await shot('lang=en_US&phone=androidauto&fmt=12hrs&focus=0', 'shot_en_androidauto.png');

// ---- behaviour checks ----
async function focusIndex() {
  return page.evaluate(() => {
    const items = ctrl._items.map(i => i.div.classList.contains('H2Focus'));
    return { focus: ctrl._focus, highlighted: items.indexOf(true), log: document.getElementById('log').textContent };
  });
}
async function key(k) { await page.keyboard.press(k); await new Promise(r => setTimeout(r, 50)); }

let fails = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (want ' + JSON.stringify(want) + ')'));
}

// English, phone connected: starts on phone card
await page.goto(base + '?lang=en_US&phone=androidauto', { waitUntil: 'load' });
expect('en start focus', (await focusIndex()).focus, 0);
await key(']'); expect('en rotate cw', (await focusIndex()).focus, 1);
await key('ArrowRight'); expect('en tilt right', (await focusIndex()).focus, 2);
await key('ArrowUp'); expect('en up to phone card', (await focusIndex()).focus, 0);
await key('ArrowUp'); expect('en up from card -> status bar', (await focusIndex()).log, 'giveFocusUp (focus moves to the status bar)');
await key('Enter'); expect('en select phone card', (await focusIndex()).log, 'sendEventToMmui(system, SelectAndroidAuto)');
await new Promise(r => setTimeout(r, 1100));
await key('ArrowDown'); expect('en down into dock', (await focusIndex()).focus, 1);
await key('Enter'); expect('en select nav', (await focusIndex()).log, 'selectCallback icon=nav');
await new Promise(r => setTimeout(r, 1100));
for (let i = 0; i < 8; i++) await key(']');
expect('en clamp at end', (await focusIndex()).focus, 5);

// Arabic: tilt right moves visually right = previous item
await page.goto(base + '?lang=ar_SA&phone=carplay', { waitUntil: 'load' });
await key(']'); await key(']'); // focus 2
await key('ArrowRight'); expect('ar tilt right (mirrored)', (await focusIndex()).focus, 1);
await key('ArrowLeft'); expect('ar tilt left (mirrored)', (await focusIndex()).focus, 2);

// Touch on a dock tile (Settings = item 4)
await page.goto(base + '?lang=en_US&phone=none', { waitUntil: 'load' });
expect('no phone start on Navigation', (await focusIndex()).focus, 1);
const box = await (await page.$('.H2Dock4')).boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await new Promise(r => setTimeout(r, 100));
expect('touch settings', (await focusIndex()).log, 'selectCallback icon=set');
await new Promise(r => setTimeout(r, 1100));
expect('no phone: card hidden', await page.evaluate(() => getComputedStyle(document.querySelector('.H2Hero')).display), 'none');
for (let i = 0; i < 4; i++) await key('[');
expect('no phone: knob cannot reach hidden card', (await focusIndex()).focus, 1);
await key('ArrowUp'); expect('no phone: up from dock -> status bar', (await focusIndex()).log, 'giveFocusUp (focus moves to the status bar)');

// Phone connects while on screen
await page.evaluate(() => { framework.common._remoteUiBtns.system = { appName: 'carplay' }; });
await new Promise(r => setTimeout(r, 1200));
expect('live phone change', await page.evaluate(() => document.querySelector('.H2HeroTitle').textContent), 'Apple CarPlay');
expect('card appears when phone connects', await page.evaluate(() => getComputedStyle(document.querySelector('.H2Hero')).display), 'block');
await key('ArrowUp'); expect('phone connected: up from dock -> card', (await focusIndex()).focus, 0);
await page.evaluate(() => { framework.common._remoteUiBtns.system = null; });
await new Promise(r => setTimeout(r, 1200));
expect('phone unplugged while card focused -> focus moves to dock', (await focusIndex()).focus, 1);
await new Promise(r => setTimeout(r, 1200));
expect('font check line off by default', await page.evaluate(() => document.querySelector('.H2FontCheck') === null), true);

// Lost focus and back
await page.evaluate(() => ctrl.handleControllerEvent('lostFocus'));
expect('lostFocus clears highlight', (await focusIndex()).highlighted, -1);
await page.evaluate(() => ctrl.handleControllerEvent('acceptFocusFromTop'));
expect('focus restored', (await focusIndex()).highlighted >= 0, true);

// cleanUp leaves no timers running
await page.evaluate(() => ctrl.cleanUp());
console.log(fails ? fails + ' FAILED' : 'ALL CHECKS PASSED');
await browser.close();
