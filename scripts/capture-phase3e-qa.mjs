import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000/api';
const QA_DIR = path.resolve('QA-Screenshots');
const ADMIN_QA_DIR = path.join(QA_DIR, 'Phase3E-Admin');
const DESKTOP_DIR = path.join(QA_DIR, 'Desktop');
const MOBILE_DIR = path.join(QA_DIR, 'Mobile');
const TABLET_DIR = path.join(QA_DIR, 'Tablet');

fs.mkdirSync(ADMIN_QA_DIR, { recursive: true });
fs.mkdirSync(DESKTOP_DIR, { recursive: true });
fs.mkdirSync(MOBILE_DIR, { recursive: true });
fs.mkdirSync(TABLET_DIR, { recursive: true });

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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function capture() {
  console.log('========================================================================');
  console.log('   ASKR EV — PHASE 3E RESPONSIVE ADMIN VISUAL QA SCREENSHOT SUITE');
  console.log('========================================================================\n');

  // Authenticate Admin
  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });
  if (!adminRes.ok) throw new Error(`Admin login failed: ${adminRes.status}`);
  const adminAuth = await adminRes.json();
  console.log(`✓ Admin authenticated: ${adminAuth.user.fullName} (${adminAuth.user.role})`);

  const tempProfile = path.join(process.env.TEMP, 'chrome_qa_phase3e_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--remote-debugging-port=9223',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9223/json');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page') || tabs[0];
    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    // Seed session in localStorage
    await cdp.send('Page.navigate', { url: BASE_URL });
    await sleep(600);
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.setItem('askrev_access_token', ${JSON.stringify(adminAuth.tokens.accessToken)});
        localStorage.setItem('askrev_user', ${JSON.stringify(JSON.stringify(adminAuth.user))});
      })()`,
    });

    const viewports = [
      { mode: 'Desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, dir: DESKTOP_DIR },
      { mode: 'Tablet', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, dir: TABLET_DIR },
      { mode: 'Mobile', width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, dir: MOBILE_DIR },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Capturing Viewport: ${vp.mode} (${vp.width}x${vp.height}) ---`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        mobile: vp.isMobile,
      });

      // 1. Admin Overview
      await cdp.send('Page.navigate', { url: `${BASE_URL}/admin` });
      await sleep(2200);

      const shotOverview = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const bufOverview = Buffer.from(shotOverview.data, 'base64');

      const overviewPath = path.join(ADMIN_QA_DIR, `admin_overview_${vp.mode.toLowerCase()}.png`);
      fs.writeFileSync(overviewPath, bufOverview);
      fs.writeFileSync(path.join(vp.dir, `admin_${vp.mode.toLowerCase()}.png`), bufOverview);
      console.log(`  ✓ Saved: ${overviewPath} (${(bufOverview.length / 1024).toFixed(1)} KB)`);

      // If desktop, capture additional operational tabs for high-fidelity documentation
      if (vp.mode === 'Desktop') {
        const tabsToCapture = [
          { tabId: 'members', label: 'members' },
          { tabId: 'approvals', label: 'approvals' },
          { tabId: 'binary', label: 'binary' },
          { tabId: 'finance', label: 'finance' },
          { tabId: 'vouchers', label: 'vouchers' },
          { tabId: 'reconciliation', label: 'reconciliation' },
        ];

        for (const t of tabsToCapture) {
          // Switch tab via DOM click in browser
          await cdp.send('Runtime.evaluate', {
            expression: `(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const target = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('${t.tabId}'));
              if (target) target.click();
            })()`,
          });
          await sleep(1500);

          const shotTab = await cdp.send('Page.captureScreenshot', { format: 'png' });
          const bufTab = Buffer.from(shotTab.data, 'base64');
          const tabPath = path.join(ADMIN_QA_DIR, `admin_${t.label}_desktop.png`);
          fs.writeFileSync(tabPath, bufTab);
          console.log(`  ✓ Saved: ${tabPath} (${(bufTab.length / 1024).toFixed(1)} KB)`);
        }
      }
    }

    cdp.close();
    console.log('\n========================================================================');
    console.log('   ✓ ALL RESPONSIVE QA SCREENSHOTS CAPTURED & SAVED SUCCESSFULLY');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Screenshot capture failed:', err);
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (e) {}
  }
}

capture();
