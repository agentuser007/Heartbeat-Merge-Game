const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Capture page logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  await page.setViewport({ width: 1280, height: 800 });

  let url = 'http://localhost:3000/Heartbeat-Merge-Game/';
  try {
    console.log('Trying port 3000...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000 });
  } catch (e) {
    console.log('Port 3000 failed, trying port 3001...');
    url = 'http://localhost:3001/Heartbeat-Merge-Game/';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000 });
  }

  await new Promise(r => setTimeout(r, 2000));

  // Handle language select if it exists
  const langOverlayExists = await page.evaluate(() => !!document.querySelector('#lang-select-overlay'));
  if (langOverlayExists) {
    console.log('Clicking language button...');
    const buttons = await page.$$('.lang-btn');
    if (buttons.length > 0) {
      await buttons[0].click();
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Get dimensions of status bar or the energy countdown
  const info = await page.evaluate(() => {
    const statusBar = document.querySelector('#status-bar');
    const energyContainer = document.querySelector('.energy-container');
    const energyCountdown = document.querySelector('.energy-countdown');
    
    return {
      statusBar: statusBar ? statusBar.getBoundingClientRect().toJSON() : null,
      energyContainer: energyContainer ? energyContainer.getBoundingClientRect().toJSON() : null,
      energyCountdown: energyCountdown ? {
        rect: energyCountdown.getBoundingClientRect().toJSON(),
        text: energyCountdown.textContent.trim(),
        display: window.getComputedStyle(energyCountdown).display,
        visibility: window.getComputedStyle(energyCountdown).visibility,
        opacity: window.getComputedStyle(energyCountdown).opacity
      } : null
    };
  });

  console.log('Layout Info:', JSON.stringify(info, null, 2));

  // Take screenshot of the top portion of the screen
  const screenshotPath = '/Users/dzzzg8/.gemini/antigravity/brain/e255cd4e-4a30-4b73-a869-c2019dbc14f1/scratch/statusBar_screenshot.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
})().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
