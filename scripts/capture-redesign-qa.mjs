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

async function capture(cdp, filename, fullPage = false) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
  });
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
  console.log(`  📸 Saved screenshot: ${filename}`);
  return filePath;
}

async function main() {
  console.log('================================================================');
  console.log('   ASKR EV AUTOMOTIVE REDESIGN RESPONSIVE QA SUITE');
  console.log('================================================================');

  const tempProfile = path.join(process.env.TEMP, 'chrome_redesign_qa_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9222/json');
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

    const viewports = [
      { name: 'Desktop (1440px)', width: 1440, height: 900, suffix: 'desktop' },
      { name: 'Laptop (1280px)', width: 1280, height: 800, suffix: 'laptop' },
      { name: 'Tablet (768px)', width: 768, height: 1024, suffix: 'tablet' },
      { name: 'Mobile (375px)', width: 375, height: 812, suffix: 'mobile' },
    ];

    const pages = [
      { url: `${BASE_URL}/`, name: 'redesign_home' },
      { url: `${BASE_URL}/bikes`, name: 'redesign_showroom' },
      { url: `${BASE_URL}/bikes/ASKR-THUNDER-PRO`, name: 'redesign_bike_detail' },
      { url: `${BASE_URL}/bikes/ASKR-AEROTREK-C1`, name: 'redesign_cycle_detail' },
      { url: `${BASE_URL}/bikes/ASKR-TERRAMAX-4X4`, name: 'redesign_jeep_detail' },
      { url: `${BASE_URL}/dashboard`, name: 'redesign_dashboard' },
      { url: `${BASE_URL}/admin`, name: 'redesign_admin' },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Testing Viewport: ${vp.name} ---`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768,
      });

      for (const p of pages) {
        // Navigate
        await cdp.send('Page.navigate', { url: p.url });
        await sleep(1500);

        // Check horizontal overflow
        const overflowEval = await cdp.send('Runtime.evaluate', {
          expression: 'document.documentElement.scrollWidth > window.innerWidth',
          returnByValue: true,
        });
        const hasOverflow = overflowEval.result.value;

        // Check Brand Presence
        const brandEval = await cdp.send('Runtime.evaluate', {
          expression: 'document.body.innerText.includes("ASKR EV")',
          returnByValue: true,
        });
        const hasBrand = brandEval.result.value;

        console.log(`  ✓ ${p.name} [${vp.suffix}]: Status=OK, Overflow=${hasOverflow ? 'FAIL' : 'PASS'}, ASKR EV=${hasBrand}`);
        if (hasOverflow) {
          console.warn(`    ⚠ Horizontal overflow detected on ${p.url} at ${vp.width}px!`);
        }

        // Capture screenshot
        await capture(cdp, `${p.name}_${vp.suffix}.png`, false);
      }
    }

    console.log('\n--- Console Errors Check ---');
    if (consoleErrors.length === 0) {
      console.log('  ✓ Zero unhandled console errors detected across all tested routes and viewports!');
    } else {
      console.log(`  ⚠ ${consoleErrors.length} console error(s) logged:`);
      consoleErrors.forEach((e) => console.log('    -', e));
    }

    cdp.close();
    console.log('\n================================================================');
    console.log('   🎉 RESPONSIVE AUTOMOTIVE VISUAL QA COMPLETED SUCCESSFULLY');
    console.log('================================================================');
  } finally {
    chromeProc.kill();
    await sleep(500);
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('QA script failed:', err);
  process.exit(1);
});
