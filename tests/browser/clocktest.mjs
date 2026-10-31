import { launch } from './browser.mjs';
const base = new URL('../../preview/index.html', import.meta.url).href;
const browser = await launch();
const page = await browser.newPage();
let fails = 0;
const t = (n, got, want) => { const ok = got === want; if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + ' -> ' + JSON.stringify(got) + (ok ? '' : ' want ' + JSON.stringify(want))); };
// Car situation: OS clock at 1970, framework cached time = 30 Oct 2026 23:27 local
const cached = new Date(2026, 9, 30, 23, 27).getTime();
await page.evaluateOnNewDocument(() => { const R = Date; const fake = 120000; globalThis.Date = class extends R { constructor(...a) { if (a.length) { super(...a); } else { super(fake); } } static now() { return fake; } }; });
async function read(qs) { await page.goto(base + '?' + qs, { waitUntil: 'load' }); return page.evaluate(() => [document.querySelector('.H2Time').textContent, document.querySelector('.H2AmPm').textContent, document.querySelector('.H2Date').textContent, document.querySelector('.H2Hijri').textContent]); }
let r = await read('lang=en_US&fmt=12hrs&cached=' + cached);
t('time from cached', r[0], '11:27'); t('pm', r[1], 'PM'); t('date', r[2], 'Friday, 30 October'); t('hijri', r[3], '19 Jumada al-Awwal 1448 AH');
r = await read('lang=ar_SA&fmt=12hrs&cached=' + cached);
t('ar time', r[0], '١١:٢٧'); t('ar ampm', r[1], 'م'); t('ar date', r[2], 'الجمعة، ٣٠ أكتوبر'); t('ar hijri', r[3], '١٩ جمادى الأولى ١٤٤٨ هـ');
r = await read('lang=en_US&fmt=24hrs&cached=0');
t('no valid time -> blank, not 1970', r.join('|'), '|||');
console.log(fails ? fails + ' FAILED' : 'ALL CLOCK CHECKS PASSED');
await browser.close();
if (fails) process.exit(1);
