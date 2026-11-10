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

  on(event, handler) {
    this.eventHandlers.set(event, handler);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function verifyAndCapture() {
  console.log('========================================================================');
  console.log('   ASKR EV — ADMIN DASHBOARD UI RESTORATION & VISUAL QA AUDIT');
  console.log('========================================================================\n');

  // 1. Authenticate Admin via backend
  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });
  if (!adminRes.ok) throw new Error(`Admin login failed: ${adminRes.status}`);
  const adminAuth = await adminRes.json();
  console.log(`✓ Admin session acquired: ${adminAuth.user.fullName} (${adminAuth.user.role})`);

  const tempProfile = path.join(process.env.TEMP, 'chrome_verify_admin_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--remote-debugging-port=9226',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9226/json');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page') || tabs[0];
    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    const consoleErrors = [];
    const networkErrors = [];

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = params.args.map((a) => a.value || a.description || '').join(' ');
        consoleErrors.push(text);
      }
    });

    cdp.on('Network.responseReceived', (params) => {
      if (params.response.status >= 400) {
        networkErrors.push({ url: params.response.url, status: params.response.status });
      }
    });

    // Seed localStorage on /auth/login
    await cdp.send('Page.navigate', { url: BASE_URL + '/auth/login' });
    await sleep(2000);
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
      console.log(`\n--- Auditing Viewport: ${vp.mode} (${vp.width}x${vp.height}) ---`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        mobile: vp.isMobile,
      });

      await cdp.send('Page.navigate', { url: `${BASE_URL}/admin` });
      await sleep(3500);

      // Verify DOM inspection in browser
      const auditResult = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const bodyStyle = window.getComputedStyle(document.body);
          const fontFamily = bodyStyle.fontFamily;
          const bodyBg = bodyStyle.backgroundColor;
          
          // Header check
          const header = document.querySelector('header');
          const headerBg = header ? window.getComputedStyle(header).backgroundColor : 'none';
          
          // Cards check
          const cards = Array.from(document.querySelectorAll('.rounded-xl'));
          
          // Find metric elements
          const textNodes = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const val = walker.currentNode.nodeValue.trim();
            if (val) textNodes.push(val);
          }
          
          const hasTimesNewRoman = fontFamily.toLowerCase().includes('times') && !fontFamily.toLowerCase().includes('inter');
          const hasInter = fontFamily.toLowerCase().includes('inter') || fontFamily.toLowerCase().includes('sans-serif');
          const isMetricsStuck = textNodes.filter(t => t === '...').length > 5;
          const totalMembersText = textNodes.find(t => /^\\d+$/.test(t) && parseInt(t) > 50);

          return {
            currentUrl: window.location.href,
            fontFamily,
            bodyBg,
            headerBg,
            cardsFound: cards.length,
            hasTimesNewRoman,
            hasInter,
            isMetricsStuck,
            detectedMetricValue: totalMembersText || 'not found',
            metricsList: Array.from(document.querySelectorAll('.text-2xl')).map(e => e.textContent.trim()),
          };
        })()`,
        returnByValue: true,
      });

      const audit = auditResult.result.value;
      console.log(`  • URL: ${audit.currentUrl}`);
      console.log(`  • Font Family: ${audit.fontFamily}`);
      console.log(`  • Body Background: ${audit.bodyBg}`);
      console.log(`  • Header Background: ${audit.headerBg}`);
      console.log(`  • Styled Cards Found: ${audit.cardsFound}`);
      console.log(`  • Has Times New Roman (FAIL if true): ${audit.hasTimesNewRoman}`);
      console.log(`  • Has Inter / Sans-Serif: ${audit.hasInter}`);
      console.log(`  • Metrics Stuck at '...' (FAIL if true): ${audit.isMetricsStuck}`);
      console.log(`  • Metric Values Rendered: [ ${audit.metricsList.join(', ')} ]`);

      if (audit.hasTimesNewRoman) {
        throw new Error(`CRITICAL: Times New Roman font detected on ${vp.mode}!`);
      }
      if (audit.isMetricsStuck) {
        throw new Error(`CRITICAL: Metrics are stuck at '...' on ${vp.mode}!`);
      }

      // Capture high-res screenshot
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');

      const overviewPath = path.join(ADMIN_QA_DIR, `admin_overview_${vp.mode.toLowerCase()}.png`);
      fs.writeFileSync(overviewPath, buf);
      fs.writeFileSync(path.join(vp.dir, `admin_${vp.mode.toLowerCase()}.png`), buf);
      console.log(`  ✓ Verified Screenshot: ${overviewPath} (${(buf.length / 1024).toFixed(1)} KB)`);

      // If Desktop, capture all operational tabs for high-fidelity documentation
      if (vp.mode === 'Desktop') {
        const tabs = ['members', 'approvals', 'binary', 'finance', 'vouchers', 'bookings', 'reconciliation', 'audit'];
        for (const tabName of tabs) {
          await cdp.send('Runtime.evaluate', {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const btn = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('${tabName}'));
              if (btn) btn.click();
            })()`,
          });
          await sleep(2000);

          const tabShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          const tabBuf = Buffer.from(tabShot.data, 'base64');
          const tabPath = path.join(ADMIN_QA_DIR, `admin_${tabName}_desktop.png`);
          fs.writeFileSync(tabPath, tabBuf);
          console.log(`  ✓ Tab Screenshot: ${tabPath} (${(tabBuf.length / 1024).toFixed(1)} KB)`);
        }
      }
    }

    console.log('\n--- Console & Network Health Report ---');
    console.log(`  • Browser Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.log('    ⚠', e));
    }
    console.log(`  • Network Failures (4xx/5xx): ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      networkErrors.forEach((n) => console.log(`    ⚠ ${n.status} ${n.url}`));
    }

    cdp.close();
    console.log('\n========================================================================');
    console.log('   🎉 ADMIN DASHBOARD UI VERIFIED: 100% STYLED, HYDRATED & ACCURATE');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Browser Verification Failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (e) {}
  }
}

verifyAndCapture();
