import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const CDP_PORT = 9226;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class SimpleCdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve(true);
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          this.callbacks.get(msg.id)(msg.result);
          this.callbacks.delete(msg.id);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = this.id++;
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return res?.result?.value;
  }

  async captureScreenshot(filename) {
    const shot = await this.send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      const targetPath = path.join(SCREENSHOT_DIR, filename);
      fs.writeFileSync(targetPath, Buffer.from(shot.data, 'base64'));
      console.log(`📸 Saved screenshot: ${targetPath}`);
      return targetPath;
    }
  }
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('Launching headless Chrome for visual QA verification...');
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,950',
    'http://localhost:3000',
  ]);

  await sleep(4000);

  try {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
    const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!pageTarget) throw new Error('No Chrome page target found');

    const cdp = new SimpleCdp(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1. Authenticate admin and set session
    console.log('Authenticating Admin session...');
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
    });
    const loginData = await loginRes.json();
    const token = loginData?.tokens?.accessToken || loginData?.accessToken;
    const user = loginData?.user;

    // Navigate to homepage first to establish localStorage domain
    await cdp.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2500);

    await cdp.evaluate(`
      localStorage.setItem('askrev_access_token', '${token}');
      localStorage.setItem('askrev_user', JSON.stringify(${JSON.stringify(user)}));
    `);

    // Navigate to /admin
    console.log('Navigating to Admin Operations Center...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/admin' });
    await sleep(4000);

    // Click "Product Catalog" tab button
    console.log('Switching to Product Catalog tab in Admin Operations Center...');
    await cdp.evaluate(`
      const buttons = Array.from(document.querySelectorAll('aside button'));
      const productTab = buttons.find(b => b.textContent.includes('Product Catalog'));
      if (productTab) productTab.click();
    `);
    await sleep(3500);

    // Capture Admin Product Catalog Dashboard
    await cdp.captureScreenshot('admin_product_catalog_dashboard.png');

    // Click "Add New Product" button to open modal
    console.log('Opening Add New Vehicle 5-tab modal...');
    await cdp.evaluate(`
      const addBtns = Array.from(document.querySelectorAll('button'));
      const addBtn = addBtns.find(b => b.textContent.includes('Add New Product'));
      if (addBtn) addBtn.click();
    `);
    await sleep(2500);
    await cdp.captureScreenshot('admin_add_vehicle_modal.png');

    // Close modal
    await cdp.evaluate(`
      const closeBtns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = closeBtns.find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    `);
    await sleep(1500);

    // 2. Capture Homepage with Dynamic EV Lineup
    console.log('Navigating to Homepage...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(4000);
    // Scroll down to EV Lineup
    await cdp.evaluate(`window.scrollTo(0, 1100);`);
    await sleep(2000);
    await cdp.captureScreenshot('homepage_dynamic_catalog.png');

    // 3. Capture Scooters Page
    console.log('Navigating to Electric Scooters page...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/scooters' });
    await sleep(4000);
    await cdp.captureScreenshot('scooters_page_dynamic.png');

    // 4. Capture Thunder Pro Detail Page
    console.log('Navigating to Thunder Pro Vehicle Detail page...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/bikes/thunder-pro' });
    // Allow Next.js on-demand route compilation
    await sleep(6500);
    await cdp.captureScreenshot('thunder_pro_detail_dynamic.png');

    console.log('🎉 Visual QA Verification screenshots completed successfully!');
  } catch (err) {
    console.error('Visual QA error:', err);
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
