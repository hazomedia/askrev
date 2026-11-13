import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';
const CDP_PORT = 9955;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve(true);
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const tempProfile = path.join(process.env.TEMP, 'chrome_scapt_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2000);

  try {
    const listRes = await fetch(`http://localhost:${CDP_PORT}/json`);
    const tabs = await listRes.json();
    const cdp = new CdpClient(tabs[0].webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');

    // 1. Desktop 1440px Scroll Viewports
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(2500);

    const desktopTargets = [
      { name: 'desktop_1440px_top.png', y: 0 },
      { name: 'desktop_1440px_25pct.png', y: 600 },
      { name: 'desktop_1440px_mid.png', y: 1200 },
      { name: 'desktop_1440px_75pct.png', y: 1800 },
      { name: 'desktop_1440px_footer.png', y: 2400 },
    ];

    for (const target of desktopTargets) {
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${target.y});` });
      await sleep(1000);
      const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(SCREENSHOT_DIR, target.name);
      fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
      console.log(`Captured ${target.name} at Y=${target.y}: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
    }

    // 2. Mobile 390px Scroll Viewports
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(2500);

    const mobileTargets = [
      { name: 'mobile_390px_top.png', y: 0 },
      { name: 'mobile_390px_mid.png', y: 1500 },
      { name: 'mobile_390px_footer.png', y: 3500 },
    ];

    for (const mTarget of mobileTargets) {
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${mTarget.y});` });
      await sleep(1000);
      const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(SCREENSHOT_DIR, mTarget.name);
      fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
      console.log(`Captured ${mTarget.name} at Y=${mTarget.y}: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
    }

    cdp.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(console.error);

