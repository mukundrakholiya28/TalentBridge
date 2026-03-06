const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:5173/recruiter/settings';
  console.log('Launching headless browser to check:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    // ensure recruiter role is set
    await page.evaluateOnNewDocument(() => localStorage.setItem('userRole', 'recruiter'));
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Status:', resp && resp.status());
    // Wait for a selector that indicates recruiter header
    const found = await page.evaluate(() => {
      return !!document.querySelector('header') && document.body.innerText.includes('CONSOLE - Recruiter');
    });
    console.log('Recruiter header present:', found);
    if (!found) {
      const html = await page.content();
      console.log('Page HTML snapshot (first 2000 chars):\n', html.slice(0, 2000));
      process.exitCode = 2;
    }
  } catch (err) {
    console.error('Puppeteer error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
