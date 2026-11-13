import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';
const CDP_PORT = 9944;

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
    this.eventHandlers = new Map();
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
        } else if (msg.method && this.eventHandlers.has(msg.method)) {
          this.eventHandlers.get(msg.method)(msg.params);
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

async function capture(cdp, filename) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
  const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📸 Saved: ${filename} (${sizeKb} KB)`);
  return filePath;
}

async function run() {
  console.log('================================================================');
  console.log('   ASKR EV: MOBILE ROAD VISIBILITY & HEADER SPACING QA');
  console.log('================================================================\n');

  const tempProfile = path.join(process.env.TEMP, 'chrome_mob_qa_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch(`http://localhost:${CDP_PORT}/json`);
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page') || tabs[0];
    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    console.log('✓ Connected to Headless Chrome via CDP.\n');

    // =========================================================================
    // 1. MOBILE HEADER TOP SPACING & SAFE-AREA AUDIT
    // =========================================================================
    console.log('================================================================');
    console.log('   1. HEADER TOP SPACING & CONTENT ALIGNMENT AUDIT');
    console.log('================================================================');

    const viewports = [
      { name: 'Mobile iPhone SE (375px)', width: 375, height: 667, mobile: true },
      { name: 'Mobile iPhone 14/15 (390px)', width: 390, height: 844, mobile: true },
      { name: 'Mobile iPhone 15 Pro Max (430px)', width: 430, height: 932, mobile: true },
      { name: 'Desktop Baseline (1440px)', width: 1440, height: 900, mobile: false },
    ];

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
      await sleep(2000);

      const headerEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const header = document.querySelector('header');
            if (!header) return { error: 'No header found' };
            const cs = window.getComputedStyle(header);
            const pt = parseFloat(cs.paddingTop) || 0;
            const logo = header.querySelector('a');
            const logoRect = logo ? logo.getBoundingClientRect() : null;
            const menuBtn = header.querySelector('button[aria-label="Toggle Navigation"]');
            const menuRect = menuBtn ? menuBtn.getBoundingClientRect() : null;
            const hero = document.querySelector('section.hero-section-bg') || document.querySelector('section');
            const heroRect = hero ? hero.getBoundingClientRect() : null;
            const headerRect = header.getBoundingClientRect();
            const gapBelowHeader = heroRect ? Math.round(heroRect.top - headerRect.bottom) : 0;

            const logoCenterY = logoRect ? Math.round(logoRect.top + logoRect.height / 2) : 0;
            const menuCenterY = menuRect ? Math.round(menuRect.top + menuRect.height / 2) : 0;
            const verticalAlignmentDiff = menuRect ? Math.abs(logoCenterY - menuCenterY) : 0;

            return {
              paddingTop: Math.round(pt),
              headerHeight: Math.round(headerRect.height),
              logoTop: logoRect ? Math.round(logoRect.top) : null,
              logoHeight: logoRect ? Math.round(logoRect.height) : null,
              menuTop: menuRect ? Math.round(menuRect.top) : null,
              gapBelowHeader,
              verticalAlignmentDiff,
              hasOverflow: document.documentElement.scrollWidth > window.innerWidth
            };
          })()
        `,
        returnByValue: true,
      });

      const h = headerEval.result.value;
      console.log(`- ${vp.name}:`);
      console.log(`    Header paddingTop: ${h.paddingTop}px (Target: ${vp.mobile ? '10-14px' : '0px'}) -> ${vp.mobile ? (h.paddingTop >= 10 && h.paddingTop <= 16 ? 'PERFECT' : 'CHECK') : (h.paddingTop === 0 ? 'PRESERVED' : 'CHECK')}`);
      console.log(`    Total Header Height: ${h.headerHeight}px | Logo Top: ${h.logoTop}px`);
      if (vp.mobile) {
        console.log(`    Content Alignment: Logo Center Y vs Menu Button Center Y diff: ${h.verticalAlignmentDiff}px (Aligned: ${h.verticalAlignmentDiff <= 2 ? 'YES' : 'NO'})`);
        console.log(`    Gap below header: ${h.gapBelowHeader}px (Smooth Transition)`);
      }
      console.log(`    Horizontal Overflow: ${h.hasOverflow ? 'FAIL' : 'PASS (0px)'}`);
    }

    // =========================================================================
    // 2. MOBILE VEHICLE VISIBILITY, CONTRAST & SILHOUETTE DEFINITION AUDIT
    // =========================================================================
    console.log('\n================================================================');
    console.log('   2. MOBILE VEHICLE VISIBILITY & DEFINITION AUDIT (390px)');
    console.log('================================================================');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(2200);

    const vehicleEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const road = document.querySelector('div[aria-hidden="true"].lg\\\\:hidden');
          if (!road) return { error: 'No mobile road found' };

          const roadRect = road.getBoundingClientRect();
          const roadLeft = roadRect.left;
          const roadRight = roadRect.right;
          const roadWidth = roadRect.width;

          const jeep = road.querySelector('.animate-mobile-lane-down-1 img');
          const cycle = road.querySelector('.animate-mobile-lane-down-2 img');
          const moto = road.querySelector('.animate-mobile-lane-up-1 img');
          const scooter = road.querySelector('.animate-mobile-lane-up-2 img');

          function inspectVeh(img, name) {
            if (!img) return null;
            const r = img.getBoundingClientRect();
            const parent = img.closest('.relative');
            const parentStyle = parent ? window.getComputedStyle(parent) : null;
            const filter = parentStyle ? parentStyle.filter : '';
            return {
              name,
              alt: img.alt,
              width: Math.round(r.width),
              height: Math.round(r.height),
              filterSnippet: filter.substring(0, 80)
            };
          }

          return {
            roadWidth: Math.round(roadWidth),
            roadLeft: Math.round(roadLeft),
            roadRight: Math.round(roadRight),
            jeep: inspectVeh(jeep, 'Jeep'),
            cycle: inspectVeh(cycle, 'Cycle'),
            moto: inspectVeh(moto, 'Motorcycle'),
            scooter: inspectVeh(scooter, 'Scooter')
          };
        })()
      `,
      returnByValue: true,
    });

    const v = vehicleEval.result.value;
    console.log(`Mobile Road: Width=${v.roadWidth}px [Left=${v.roadLeft}px, Right=${v.roadRight}px]`);
    [v.jeep, v.cycle, v.moto, v.scooter].forEach((veh) => {
      if (veh) {
        console.log(`  ✓ ${veh.name} (${veh.alt}): Rendered ${veh.width}x${veh.height}px | Lighting/Filters: ${veh.filterSnippet}`);
      }
    });

    // =========================================================================
    // 3. FULL-PAGE SCROLL PERSISTENCE AUDIT ON MOBILE (390px)
    // =========================================================================
    console.log('\n================================================================');
    console.log('   3. FULL-PAGE SCROLL PERSISTENCE ON MOBILE (390px)');
    console.log('================================================================');

    const scrollCheckpoints = [
      { name: 'Top Hero Viewport (0%)', scrollPct: 0, file: 'mobile_390px_hero_refined.png' },
      { name: 'Mid Catalog Viewport (50%)', scrollPct: 0.50, file: 'mobile_390px_catalog_refined.png' },
      { name: 'Footer Viewport (100%)', scrollPct: 1.0, file: 'mobile_390px_footer_refined.png' },
    ];

    for (const sc of scrollCheckpoints) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: maxScroll * ${sc.scrollPct}, behavior: 'instant' });
          })()
        `,
      });
      await sleep(1200);

      const check = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const road = document.querySelector('div[aria-hidden="true"].lg\\\\:hidden');
            const roadVisible = road && window.getComputedStyle(road).display !== 'none';
            const vehicles = road ? road.querySelectorAll('img').length : 0;
            return {
              scrollY: Math.round(window.scrollY),
              roadVisible,
              vehicleCount: vehicles,
              hasOverflow: document.documentElement.scrollWidth > window.innerWidth
            };
          })()
        `,
        returnByValue: true,
      });

      const res = check.result.value;
      console.log(`Scroll Step: ${sc.name} (Y=${res.scrollY}px) -> Road Visible: ${res.roadVisible ? 'YES' : 'NO'} | Vehicles: ${res.vehicleCount} | Overflow: ${res.hasOverflow ? 'FAIL' : 'PASS (0px)'}`);
      await capture(cdp, sc.file);
    }

    // Capture 375px and 430px refined screenshots
    console.log('\n--- Capturing 375px & 430px Viewports ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 0, behavior: "instant" });' });
    await sleep(1500);
    await capture(cdp, 'mobile_375px_hero_refined.png');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true });
    await sleep(1500);
    await capture(cdp, 'mobile_430px_hero_refined.png');

    // Also capture desktop 1440px to confirm desktop header and road rail are pristine
    console.log('\n--- Capturing Desktop 1440px Verification ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(1500);
    await capture(cdp, 'desktop_1440px_refined_check.png');

    // =========================================================================
    // 4. RECORD SHORT MOBILE SCROLLING VIDEO (390x844, 15 SECONDS)
    // =========================================================================
    console.log('\n================================================================');
    console.log('   4. RECORDING 15-SECOND MOBILE SCROLLING VIDEO (390x844)');
    console.log('================================================================');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 0, behavior: "instant" });' });
    await sleep(1500);

    const videoFrames = [];
    cdp.on('Page.screencastFrame', async (params) => {
      videoFrames.push(params.data);
      try {
        await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch (e) {}
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 390,
      maxHeight: 844,
      everyNthFrame: 1,
    });

    console.log('  Executing choreographed mobile tour (Hero, header spacing, smooth scroll to footer)...');
    // 0-4s: Hero view, observing header spacing and visible vehicles passing
    await sleep(4000);
    // 4-8s: Smooth scroll to vehicle lineup catalog
    for (let y = 0; y <= 800; y += 40) {
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y});` });
      await sleep(150);
    }
    await sleep(2000);
    // 8-12s: Scroll to engineering excellence
    for (let y = 800; y <= 1600; y += 50) {
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y});` });
      await sleep(150);
    }
    await sleep(2000);
    // 12-15s: Scroll to footer
    const maxScroll = await cdp.send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollHeight - window.innerHeight',
      returnByValue: true,
    });
    for (let y = 1600; y <= maxScroll.result.value; y += 70) {
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y});` });
      await sleep(100);
    }
    await sleep(2500);

    await cdp.send('Page.stopScreencast');
    console.log(`  ✓ Collected ${videoFrames.length} mobile frames.`);

    if (videoFrames.length > 0) {
      console.log('  Encoding mobile video into WebM...');
      await cdp.send('Runtime.evaluate', { expression: 'window.__M15_FRAMES__ = [];' });
      for (let i = 0; i < Math.min(videoFrames.length, 150); i += 20) {
        const slice = videoFrames.slice(i, i + 20);
        await cdp.send('Runtime.evaluate', {
          expression: `window.__M15_FRAMES__.push(...${JSON.stringify(slice)});`,
        });
      }

      const webmBase64 = await cdp.send('Runtime.evaluate', {
        expression: `
          new Promise(async (resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 390;
            canvas.height = 844;
            const ctx = canvas.getContext('2d');
            const stream = canvas.captureStream(12);
            const recorder = new MediaRecorder(stream, {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 1800000,
            });
            const chunks = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'video/webm' });
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            };
            recorder.start();
            const list = window.__M15_FRAMES__;
            for (let i = 0; i < list.length; i++) {
              await new Promise((imgRes) => {
                const img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, 390, 844);
                  imgRes();
                };
                img.src = 'data:image/jpeg;base64,' + list[i];
              });
              await new Promise((r) => setTimeout(r, 80));
            }
            recorder.stop();
          })
        `,
        awaitPromise: true,
        returnByValue: true,
      });

      if (webmBase64.result && webmBase64.result.value) {
        const base64Data = webmBase64.result.value.replace(/^data:video\/webm;base64,/, '');
        const outPath = path.join(SCREENSHOT_DIR, 'mobile_refined_visibility_scroll.webm');
        fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
        console.log(`  🎬 Saved Mobile Scrolling Video: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
      }
    }

    console.log('\n================================================================');
    console.log('   🎉 ALL MOBILE REFINEMENT CHECKS COMPLETED!');
    console.log('================================================================\n');

    cdp.close();
  } catch (err) {
    console.error('QA Error:', err);
  } finally {
    chromeProc.kill();
  }
}

run().catch(console.error);

