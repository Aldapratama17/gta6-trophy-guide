const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/root/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', 
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-file-access-from-files'
    ],
    timeout: 60000,
    dumpio: true,
    protocolTimeout: 60000
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Load the page
  console.log('Loading page...');
  await page.goto('file:///root/makefun/gta6-guide/app/index.html', { waitUntil: 'domcontentloaded' });
  
  // Wait for the app to render - wait for trophy list to be populated
  console.log('Waiting for trophy list to render...');
  await page.waitForSelector('.trophy-item', { timeout: 30000 });
  await sleep(1500);  // Additional wait for full render

  // Screenshot 1: 1-guide-detail.png - one trophy's guide expanded
  console.log('Taking screenshot 1: Guide detail (expanded)...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('.trophy-item');
    if (items.length > 0) {
      // Click the first trophy to expand its guide
      items[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await sleep(800);
  
  await page.screenshot({ path: path.join(screenshotsDir, '1-guide-detail.png') });

  // Screenshot 2: 2-checklist.png - checklist view with some checked
  console.log('Taking screenshot 2: Checklist with some checked...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(e => e.textContent.toLowerCase().includes('back to list'));
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(500);
  
  // Check a few trophies
  await page.evaluate(() => {
    const checkboxes = document.querySelectorAll('.trophy-item input[type="checkbox"]');
    if (checkboxes.length >= 3) {
      checkboxes[0].checked = true;
      checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
      checkboxes[2].checked = true;
      checkboxes[2].dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(500);
  
  await page.screenshot({ path: path.join(screenshotsDir, '2-checklist.png') });

  // Screenshot 3: 3-roadmap.png - roadmap section visible
  console.log('Taking screenshot 3: Roadmap expanded...');
  await page.waitForSelector('#btnRoadmap');
  await page.click('#btnRoadmap');
  await sleep(800);
  
  // Expand the first roadmap stage
  await page.evaluate(() => {
    const headers = document.querySelectorAll('.stage-header');
    if (headers.length > 0) {
      headers[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await sleep(500);
  
  await page.screenshot({ path: path.join(screenshotsDir, '3-roadmap.png') });

  // Screenshot 4: 4-spoiler-mode.png - spoiler mode on with a filter applied
  console.log('Taking screenshot 4: Spoiler mode on with filter...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(e => e.textContent.toLowerCase().includes('back to list'));
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(500);
  
  await page.evaluate(() => {
    // Enable spoiler mode
    const spoilerCheckbox = document.querySelector('#spoilerCheckbox');
    if (spoilerCheckbox && !spoilerCheckbox.checked) {
      spoilerCheckbox.click();
    }
    // Apply missable filter
    const filterKind = document.querySelector('#filterKind');
    if (filterKind) {
      filterKind.value = 'missable';
      filterKind.dispatchEvent(new Event('change', { bubbles: true }));
    }
    window.scrollTo(0, 0);
  });
  await sleep(800);
  
  await page.screenshot({ path: path.join(screenshotsDir, '4-spoiler-mode.png') });

  await browser.close();
  console.log('Screenshots captured successfully');
})();
