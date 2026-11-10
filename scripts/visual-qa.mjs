import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000/api';

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
  console.log('--- Starting ASKR EV Refined Homepage & Product Display Visual QA Suite ---');
  const tempProfile = path.join(process.env.TEMP, 'chrome_qa_profile_' + Date.now());

  // Obtain test authentication credentials
  let memberAuth = null;
  let adminAuth = null;

  try {
    const memberRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member.a@askrev.local', password: 'MemberA@AskREV2026!' }),
    });
    if (memberRes.ok) {
      memberAuth = await memberRes.json();
      console.log('  ✓ Member authentication session acquired');
    }

    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@askrev.local', password: 'SuperAdmin@AskREV2026!' }),
    });
    if (adminRes.ok) {
      adminAuth = await adminRes.json();
      console.log('  ✓ Admin authentication session acquired');
    }
  } catch (err) {
    console.warn('  ⚠ Auth acquisition notice:', err.message);
  }

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
    const versionRes = await fetch('http://localhost:9222/json/version');
    const version = await versionRes.json();
    console.log(`Connected to Chrome via CDP: ${version.Browser}`);

    // Connect to page tab
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
      { name: 'homepage', path: '/', auth: null },
      { name: 'bikes', path: '/bikes', auth: null },
      { name: 'bike_detail', path: '/bikes/ASKR-THUNDER-PRO', auth: null },
      { name: 'login', path: '/auth/login', auth: null },
      { name: 'register', path: '/auth/register', auth: null },
      { name: 'dashboard', path: '/dashboard', auth: memberAuth },
      { name: 'admin', path: '/admin', auth: adminAuth },
    ];

    const results = [];

    // Viewports: Desktop (1440x900) and Mobile (375x812)
    const viewports = [
      { mode: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false },
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

        networkErrors.length = 0;
        consoleLogs.length = 0;

        // First navigate to set origin for localStorage
        if (route.auth) {
          await cdp.send('Page.navigate', { url: BASE_URL });
          await sleep(500);
          await cdp.send('Runtime.evaluate', {
            expression: `(() => {
              localStorage.setItem('askrev_access_token', ${JSON.stringify(route.auth.tokens.accessToken)});
              localStorage.setItem('askrev_user', ${JSON.stringify(JSON.stringify(route.auth.user))});
            })()`,
          });
        } else {
          // Clear session for public views
          await cdp.send('Runtime.evaluate', {
            expression: `(() => {
              localStorage.removeItem('askrev_access_token');
              localStorage.removeItem('askrev_user');
            })()`,
          });
        }

        await cdp.send('Page.navigate', { url: fullUrl });

        // Wait for components and data to render
        await sleep(2200);

        // Inspect computed styles & page content
        const evalResult = await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const body = document.body;
            const bodyStyle = window.getComputedStyle(body);
            const nav = document.querySelector('nav') || document.querySelector('header');
            const navStyle = nav ? window.getComputedStyle(nav) : null;
            const h1 = document.querySelector('h1');
            const bikeLinks = document.querySelectorAll('a[href*="/bikes/"]');
            const membershipLinks = document.querySelectorAll('a[href*="/auth/register"]');

            const isLightBg = bodyStyle.backgroundColor === 'rgb(255, 255, 255)' || 
                              bodyStyle.backgroundColor === 'rgb(247, 249, 252)' ||
                              bodyStyle.backgroundColor === 'rgba(255, 255, 255, 1)';
            const isDarkNavy = bodyStyle.backgroundColor === 'rgb(6, 11, 24)';
            const noHorizontalOverflow = document.documentElement.scrollWidth <= (window.innerWidth + 5);

            return {
              title: document.title,
              h1Text: h1 ? h1.textContent.trim() : null,
              bikeCardsCount: bikeLinks.length,
              bodyBg: bodyStyle.backgroundColor,
              bodyColor: bodyStyle.color,
              fontFamily: bodyStyle.fontFamily.split(',')[0].replace(/['"]/g, ''),
              navBg: navStyle ? navStyle.backgroundColor : 'none',
              isLightBg,
              isDarkNavy,
              noHorizontalOverflow,
            };
          })()`,
          returnByValue: true,
        });

        const styles = evalResult.result.value;

        // Capture screenshot
        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const screenshotFileName = `${route.name}_${vp.mode}.png`;
        const screenshotPath = path.join(ARTIFACT_DIR, screenshotFileName);
        fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

        results.push({
          route: route.path,
          name: route.name,
          mode: vp.mode,
          h1Text: styles.h1Text,
          bikeCardsCount: styles.bikeCardsCount,
          noHorizontalOverflow: styles.noHorizontalOverflow,
          isLightCorporateTheme: styles.isLightBg,
          isDarkThemeEliminated: !styles.isDarkNavy,
          bodyBg: styles.bodyBg,
          bodyColor: styles.bodyColor,
          fontFamily: styles.fontFamily,
          screenshotPath,
          screenshotFile: screenshotFileName,
          networkErrors: [...networkErrors],
          consoleErrors: [...consoleLogs],
        });

        console.log(
          `  ✓ [${vp.mode}] ${route.path.padEnd(26)} | Light: ${styles.isLightBg ? 'YES' : 'NO'} | H1: "${styles.h1Text || 'N/A'}" | Bikes: ${styles.bikeCardsCount} | Shot: ${screenshotFileName}`
        );
      }
    }

    cdp.close();

    console.log('\n--- Classic Corporate Light-Theme Visual QA Complete ---');
    console.log(`All ${results.length} screenshots saved to: ${ARTIFACT_DIR}`);

    // Output JSON report
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
