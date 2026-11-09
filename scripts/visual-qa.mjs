import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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

async function runVisualQA() {
  console.log('--- Starting ASKR EV Chrome Headless Visual QA ---');
  const tempProfile = path.join(process.env.TEMP, 'chrome_qa_profile_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2000);

  try {
    const versionRes = await fetch('http://localhost:9222/json/version');
    const version = await versionRes.json();
    console.log(`Connected to Chrome via CDP: ${version.Browser}`);

    // Connect to the page tab
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page') || tabs[0];
    console.log(`Target tab: ${tab.title || tab.url} (${tab.type})`);
    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    const networkErrors = [];
    const consoleLogs = [];

    cdp.on('Network.responseReceived', (params) => {
      if (params.response.status >= 400) {
        networkErrors.push({ url: params.response.url, status: params.response.status });
      }
    });

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        consoleLogs.push(params.args.map((a) => a.value || a.description).join(' '));
      }
    });

    const routes = [
      { name: 'homepage', path: '/' },
      { name: 'login', path: '/auth/login' },
      { name: 'register', path: '/auth/register' },
      { name: 'bikes', path: '/bikes' },
      { name: 'simulator', path: '/simulator' },
      { name: 'dashboard', path: '/dashboard' },
      { name: 'admin', path: '/admin' },
    ];

    const results = [];

    // Viewports: Desktop (1280x900) and Mobile (375x812)
    const viewports = [
      { mode: 'desktop', width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false },
      { mode: 'mobile', width: 375, height: 812, deviceScaleFactor: 2, isMobile: true },
    ];

    for (const vp of viewports) {
      console.log(`\n=== Testing Viewport: ${vp.mode.toUpperCase()} (${vp.width}x${vp.height}) ===`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        mobile: vp.isMobile,
      });

      for (const route of routes) {
        const fullUrl = `${BASE_URL}${route.path}`;

        // Reset errors for page
        networkErrors.length = 0;
        consoleLogs.length = 0;

        await cdp.send('Page.navigate', { url: fullUrl });

        // Wait for page to render
        await sleep(1500);

        // Inspect computed styles
        const evalResult = await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const body = document.body;
            const bodyStyle = window.getComputedStyle(body);
            const card = document.querySelector('.card-gradient');
            const cardStyle = card ? window.getComputedStyle(card) : null;
            const button = document.querySelector('button, a.bg-gradient-to-r');
            const btnStyle = button ? window.getComputedStyle(button) : null;
            const nav = document.querySelector('nav');
            const navStyle = nav ? window.getComputedStyle(nav) : null;

            return {
              title: document.title,
              bodyBg: bodyStyle.backgroundColor,
              bodyColor: bodyStyle.color,
              fontFamily: bodyStyle.fontFamily.split(',')[0],
              hasCardGradient: !!card,
              cardBg: cardStyle ? cardStyle.backgroundImage : 'none',
              cardBorder: cardStyle ? cardStyle.borderColor : 'none',
              cardRadius: cardStyle ? cardStyle.borderRadius : 'none',
              navBg: navStyle ? navStyle.backgroundColor : 'none',
              hasCssLoaded: bodyStyle.backgroundColor === 'rgb(6, 11, 24)' || bodyStyle.backgroundColor === 'rgba(6, 11, 24, 1)',
            };
          })()`,
          returnByValue: true,
        });

        const styles = evalResult.result.value;

        // Take screenshot
        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const screenshotFileName = `${route.name}_${vp.mode}.png`;
        const screenshotPath = path.join(ARTIFACT_DIR, screenshotFileName);
        fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

        const isSuccess = styles.hasCssLoaded && networkErrors.filter((e) => e.url.includes('.css')).length === 0;

        results.push({
          route: route.path,
          name: route.name,
          mode: vp.mode,
          cssApplied: styles.hasCssLoaded,
          bodyBg: styles.bodyBg,
          cardBorder: styles.cardBorder,
          screenshotPath,
          screenshotFile: screenshotFileName,
          networkErrors: [...networkErrors],
          consoleErrors: [...consoleLogs],
        });

        console.log(
          `  ✓ [${vp.mode}] ${route.path.padEnd(16)} | CSS Applied: ${styles.hasCssLoaded ? 'YES' : 'NO'} | Body BG: ${styles.bodyBg} | Card Border: ${styles.cardBorder} | Shot: ${screenshotFileName}`
        );
      }
    }

    cdp.close();

    console.log('\n--- Visual QA Complete ---');
    console.log(`All ${results.length} screenshots saved to: ${ARTIFACT_DIR}`);

    // Output JSON report for parsing
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_summary.json'), JSON.stringify(results, null, 2));

    return results;
  } finally {
    chromeProc.kill('SIGKILL');
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

runVisualQA().catch((e) => {
  console.error('Visual QA Error:', e);
  process.exit(1);
});
