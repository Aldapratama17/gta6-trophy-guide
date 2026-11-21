const puppeteer = require('puppeteer');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
  // Start the dev server on port 8811 (where python server is running)
  const server = spawn('python3', ['-m', 'http.server', '8811'], { cwd: path.join(__dirname, 'app') });
  await new Promise(resolve => setTimeout(resolve, 1500));

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/root/.cache/puppeteer/chrome/linux-157.0.8103.78/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Screenshot 1: 1-guide-detail.png - checklist with guide open
  console.log('Taking screenshot 1: Guide detail...');
  await page.goto('http://localhost:8811', { waitUntil: 'networkidle0' });
  await sleep(1500);
  
  await page.waitForSelector('.trophy-item');
  await page.click('.trophy-item');
  await sleep(800);
  
  await page.screenshot({ path: path.join(screenshotsDir, '1-guide-detail.png') });

  // Screenshot 2: 2-checklist.png - checklist overview
  console.log('Taking screenshot 2: Checklist...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(e => e.textContent.toLowerCase().includes('back to list'));
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(500);
  
  await page.screenshot({ path: path.join(screenshotsDir, '2-checklist.png') });

  // Screenshot 3: 3-roadmap.png - roadmap expanded
  console.log('Taking screenshot 3: Roadmap...');
  await page.waitForSelector('#btnRoadmap');
  await page.click('#btnRoadmap');
  await sleep(800);
  
  // Try to expand collapsible sections
  await page.evaluate(() => {
    const toggles = document.querySelectorAll('.roadmap-panel summary, .roadmap-panel button[aria-expanded], .roadmap-panel .toggle, .roadmap-stage summary, .stage-header');
    toggles.forEach(t => t.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  });
  await sleep(500);
  
  await page.screenshot({ path: path.join(screenshotsDir, '3-roadmap.png') });

  // Screenshot 4: 4-spoiler-mode.png - spoiler mode on with missable filter
  console.log('Taking screenshot 4: Spoiler mode...');
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
  server.kill();
  console.log('Screenshots captured successfully');
})();
