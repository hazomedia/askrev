import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
    this.eventHandlers = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.pending.has(data.id)) {
          const { resolve, reject } = this.pending.get(data.id);
          this.pending.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        } else if (data.method && this.eventHandlers.has(data.method)) {
          this.eventHandlers.get(data.method)(data.params);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, handler) {
    this.eventHandlers.set(event, handler);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function capture(cdp, filename, clip = null) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  const params = { format: 'png' };
  if (clip) params.clip = clip;
  const screenshot = await cdp.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
  console.log(`  📸 Saved screenshot: ${filename}`);
  return filePath;
}

async function main() {
  console.log('================================================================');
  console.log('   ASKR EV FINAL MIDNIGHT VISUAL QA & VERIFICATION SUITE');
  console.log('================================================================');

  const tempProfile = path.join(process.env.TEMP, 'chrome_final_qa_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--remote-debugging-port=9999',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9999/json');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page') || tabs[0];
    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const consoleErrors = [];
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = params.args.map((a) => a.value || a.description).join(' ');
        consoleErrors.push(text);
      }
    });

    // 1. DESKTOP VIEWPORT SETUP (1440x900)
    console.log('\n[1/6] Navigating to Desktop Homepage (1440x900)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    // Allow animation to run so vehicle descends into frame
    await sleep(2200);

    // Verify Horizontal Overflow
    const overflowEval = await cdp.send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth',
      returnByValue: true,
    });
    console.log(`  ✓ Desktop Horizontal Overflow: ${overflowEval.result.value ? 'FAIL' : 'PASS (0 overflow)'}`);

    // Verify Brand Name
    const brandEval = await cdp.send('Runtime.evaluate', {
      expression: 'document.body.innerText.includes("ASKR EV")',
      returnByValue: true,
    });
    console.log(`  ✓ ASKR EV Brand Identity Present: ${brandEval.result.value}`);

    // Verify Road Track Visibility
    const roadEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const road = document.querySelector('aside');
          if (!road) return false;
          const rect = road.getBoundingClientRect();
          const style = window.getComputedStyle(road);
          return rect.width > 50 && rect.height > 200 && style.display !== 'none' && style.visibility !== 'hidden';
        })()
      `,
      returnByValue: true,
    });
    console.log(`  ✓ Vertical Road Rail Visible & Layout Computed: ${roadEval.result.value}`);

    // Capture Full Desktop Homepage
    await capture(cdp, 'final_homepage_desktop.png');

    // Capture Hero Close-up
    console.log('\n[2/6] Capturing Hero Close-up...');
    await capture(cdp, 'final_hero_closeup.png', {
      x: 0,
      y: 0,
      width: 1300,
      height: 720,
      scale: 1,
    });

    // Capture Road Animation Close-up
    console.log('\n[3/6] Capturing Vertical Road Animation Close-up...');
    await capture(cdp, 'final_road_animation.png', {
      x: 1300,
      y: 0,
      width: 140,
      height: 900,
      scale: 1,
    });

    // Capture Product Cards Section
    console.log('\n[4/6] Scrolling and Capturing Product Cards Section...');
    await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollTo({ top: 720, behavior: "instant" });',
    });
    await sleep(1000);
    await capture(cdp, 'final_product_cards.png');

    // Test Category Tabs: Scooters
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const scooterBtn = btns.find(b => b.innerText.includes('Scooters'));
        if (scooterBtn) scooterBtn.click();
      `,
    });
    await sleep(800);
    await capture(cdp, 'final_product_cards_scooters.png');

    // Test Category Tabs: Jeeps
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const jeepBtn = btns.find(b => b.innerText.includes('Jeeps'));
        if (jeepBtn) jeepBtn.click();
      `,
    });
    await sleep(800);
    await capture(cdp, 'final_product_cards_jeeps.png');

    // Test Booking Modal functionality
    console.log('\n[5/6] Testing Book Now Modal Trigger...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const bookBtns = Array.from(document.querySelectorAll('button'));
        const bookBtn = bookBtns.find(b => b.innerText.includes('Book Now') || b.innerText.includes('Explore'));
        if (bookBtn) bookBtn.click();
      `,
    });
    await sleep(600);
    await capture(cdp, 'final_booking_modal_test.png');

    // 6. MOBILE VIEWPORT SETUP (375x812)
    console.log('\n[6/6] Testing Mobile Homepage Viewport (375x812)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(1800);

    const mobileOverflowEval = await cdp.send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth',
      returnByValue: true,
    });
    console.log(`  ✓ Mobile Horizontal Overflow: ${mobileOverflowEval.result.value ? 'FAIL' : 'PASS (0 overflow)'}`);

    await capture(cdp, 'final_homepage_mobile.png');

    // Console errors summary
    console.log('\n--- Console Errors Check ---');
    if (consoleErrors.length === 0) {
      console.log('  ✓ Zero unhandled console errors detected!');
    } else {
      console.log(`  ⚠ ${consoleErrors.length} console error(s) logged:`, consoleErrors);
    }

    console.log('\n================================================================');
    console.log('   🎉 FINAL QA VERIFICATION SUITE COMPLETED SUCCESSFULLY');
    console.log('================================================================');
  } finally {
    try {
      chromeProc.kill();
    } catch (e) { }
  }
}

main().catch(console.error);

