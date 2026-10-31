// Headless browser for the tests: a local Chrome/Edge when CHROME_PATH is set (e.g. on Windows),
// otherwise the bundled Linux Chromium from @sparticuz/chromium.
import puppeteer from 'puppeteer-core';

export async function launch() {
  const opts = { headless: true, defaultViewport: { width: 900, height: 600 } };
  if (process.env.CHROME_PATH) {
    return puppeteer.launch({ ...opts, executablePath: process.env.CHROME_PATH, args: ['--allow-file-access-from-files'] });
  }
  const chromium = (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({ ...opts, executablePath: await chromium.executablePath(), args: chromium.args });
}
