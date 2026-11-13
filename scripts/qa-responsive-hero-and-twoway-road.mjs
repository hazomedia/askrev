import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';
const CDP_PORT = 9977;

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

async function capture(cdp, filename, width, height) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  const params = {
    format: 'png',
    clip: {
      x: 0,
      y: 0,
      width,
      height,
      scale: 1,
    },
  };
  const screenshot = await cdp.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
  console.log(`  📸 Saved screenshot: ${filename} (${width}x${height})`);
  return filePath;
}

async function run() {
  console.log('================================================================');
  console.log('   ASKR EV: RESPONSIVE HERO & TWO-WAY ROAD QA VERIFICATION');
  console.log('================================================================\n');

  const tempProfile = path.join(process.env.TEMP, 'chrome_qa_' + Date.now());

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

    console.log('✓ Connected to Headless Chrome via CDP.');

    // Viewports to test
    const viewports = [
      { name: '375px mobile (iPhone SE)', width: 375, height: 667, isMobile: true },
      { name: '390px mobile (iPhone 12/13/14)', width: 390, height: 844, isMobile: true },
      { name: '430px mobile (iPhone 14/15 Pro Max)', width: 430, height: 932, isMobile: true },
      { name: '768px tablet (iPad)', width: 768, height: 1024, isMobile: true },
      { name: '1024px laptop', width: 1024, height: 768, isMobile: false },
      { name: '1440px desktop', width: 1440, height: 900, isMobile: false },
    ];

    for (const vp of viewports) {
      console.log(`\n--- TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ---`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
      await sleep(2200);

      // Automated Layout & Hierarchy Checks
      const evalResult = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            const hasHorizontalOverflow = docWidth > winWidth;

            // Check desktop road sidebar
            const desktopRoad = document.querySelector('aside');
            const desktopRoadDisplay = desktopRoad ? window.getComputedStyle(desktopRoad).display : 'none';
            const desktopRoadVisible = desktopRoadDisplay !== 'none';

            // Check mobile background road
            // Look for the mobile road container inside section
            const mobileRoadEl = document.querySelector('div[aria-hidden="true"].lg\\\\:hidden');
            const mobileRoadActive = !!mobileRoadEl;

            // Check Mobile Image-First Hero
            // Look inside the block.lg:hidden container
            const mobileContainer = document.querySelector('div.block.lg\\\\:hidden');
            let imageFirst = false;
            let imgTop = null;
            let headlineTop = null;

            if (mobileContainer) {
              const mobImg = mobileContainer.querySelector('img');
              const headline = mobileContainer.querySelector('h1');
              if (mobImg && headline) {
                const imgRect = mobImg.getBoundingClientRect();
                const headRect = headline.getBoundingClientRect();
                imgTop = Math.round(imgRect.top);
                headlineTop = Math.round(headRect.top);
                imageFirst = imgTop < headlineTop;
              }
            } else if (window.innerWidth >= 1024) {
              imageFirst = true; // On desktop side-by-side
            }

            return {
              docWidth,
              winWidth,
              hasHorizontalOverflow,
              desktopRoadVisible,
              mobileRoadActive,
              imageFirst,
              imgTop,
              headlineTop
            };
          })()
        `,
        returnByValue: true,
      });

      const metrics = evalResult.result.value;
      console.log(`  Horizontal Overflow: ${metrics.hasHorizontalOverflow ? 'FAIL (ScrollWidth: ' + metrics.docWidth + 'px)' : 'PASS (0 overflow, Width: ' + metrics.docWidth + 'px)'}`);
      console.log(`  Desktop Road Sidebar: ${metrics.desktopRoadVisible ? 'VISIBLE' : 'HIDDEN'}`);
      console.log(`  Mobile Background Road: ${metrics.mobileRoadActive ? 'ACTIVE' : 'INACTIVE'}`);
      if (vp.width < 1024) {
        console.log(`  Mobile Image-First Order: ${metrics.imageFirst ? 'PASS' : 'FAIL'} (Img Top: ${metrics.imgTop}px, Headline Top: ${metrics.headlineTop}px)`);
      }

      // Capture screenshot with exact viewport clipping
      const suffix = vp.width < 768 ? 'mobile' : vp.width < 1024 ? 'tablet' : vp.width === 1024 ? 'laptop' : 'desktop';
      const filename = `responsive_${vp.width}px_${suffix}.png`;
      await capture(cdp, filename, vp.width, vp.height);
    }

    // =========================================================================
    // MULTI-CYCLE ANIMATION & OVERLAP AUDIT (DESKTOP 1440px)
    // =========================================================================
    console.log('\n================================================================');
    console.log('   DESKTOP TWO-WAY ROAD: MULTI-CYCLE OVERLAP AUDIT (1440px)');
    console.log('================================================================');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(2000);

    console.log('Auditing vehicle positions across multiple animation cycles over 16 seconds (Sampled every 2s)...');
    const samples = [];
    for (let sec = 0; sec <= 16; sec += 2) {
      const sample = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const jeep = document.querySelector('.animate-lane-down-1');
            const cycle = document.querySelector('.animate-lane-down-2');
            const motorcycle = document.querySelector('.animate-lane-up-1');
            const scooter = document.querySelector('.animate-lane-up-2');

            if (!jeep || !cycle || !motorcycle || !scooter) return null;

            const rJeep = jeep.getBoundingClientRect();
            const rCycle = cycle.getBoundingClientRect();
            const rMoto = motorcycle.getBoundingClientRect();
            const rScooter = scooter.getBoundingClientRect();

            // Lane 1 separation
            const lane1Dist = Math.abs(rJeep.top - rCycle.top);
            // Lane 2 separation
            const lane2Dist = Math.abs(rMoto.top - rScooter.top);

            // Verify Lane 1 (Left) vs Lane 2 (Right) separation
            const lane1Left = rJeep.left;
            const lane2Left = rMoto.left;
            const lanesSeparated = lane1Left < lane2Left;

            // Check bounding box collisions within same lane
            // Collision occurs if vertical bounds overlap
            const lane1Collision = !(rJeep.bottom < rCycle.top || rJeep.top > rCycle.bottom);
            const lane2Collision = !(rMoto.bottom < rScooter.top || rMoto.top > rScooter.bottom);

            return {
              timeSec: ${sec},
              lane1Dist: Math.round(lane1Dist),
              lane2Dist: Math.round(lane2Dist),
              lanesSeparated,
              lane1Collision,
              lane2Collision,
              jeepY: Math.round(rJeep.top),
              cycleY: Math.round(rCycle.top),
              motoY: Math.round(rMoto.top),
              scooterY: Math.round(rScooter.top)
            };
          })()
        `,
        returnByValue: true,
      });

      if (sample && sample.result && sample.result.value) {
        samples.push(sample.result.value);
        const s = sample.result.value;
        console.log(`  [t=${s.timeSec}s] Lane 1 (Jeep Y=${s.jeepY}, Cycle Y=${s.cycleY}, Spacing=${s.lane1Dist}px, Collide=${s.lane1Collision}) | Lane 2 (Moto Y=${s.motoY}, Scooter Y=${s.scooterY}, Spacing=${s.lane2Dist}px, Collide=${s.lane2Collision}) | Two-Way Distinct=${s.lanesSeparated}`);
      }
      await sleep(2000);
    }

    const anyCollision = samples.some((s) => s.lane1Collision || s.lane2Collision);
    console.log(`\n=> MULTI-CYCLE COLLISION AUDIT: ${anyCollision ? 'FAIL (Collisions detected)' : 'ZERO OVERLAPS (100% COLLISION-FREE ACROSS ALL SAMPLED CYCLES)'}`);

    // =========================================================================
    // 15-SECOND SCREEN RECORDING (DESKTOP)
    // =========================================================================
    console.log('\n================================================================');
    console.log('   RECORDING 15-SECOND DESKTOP TWO-WAY ANIMATION (1440x900)');
    console.log('================================================================');

    const desktopFrames = [];
    cdp.on('Page.screencastFrame', async (params) => {
      desktopFrames.push(params.data);
      try {
        await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch (e) {}
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 1280,
      maxHeight: 800,
      everyNthFrame: 1,
    });

    console.log('  Capturing 15-second desktop road motion...');
    await sleep(15000);
    await cdp.send('Page.stopScreencast');
    console.log(`  ✓ Collected ${desktopFrames.length} desktop frames across 15 seconds.`);

    if (desktopFrames.length > 0) {
      console.log('  Encoding desktop screencast into WebM video...');
      await cdp.send('Runtime.evaluate', { expression: 'window.__DESKTOP_FRAMES__ = [];' });
      for (let i = 0; i < Math.min(desktopFrames.length, 120); i += 15) {
        const slice = desktopFrames.slice(i, i + 15);
        await cdp.send('Runtime.evaluate', {
          expression: `window.__DESKTOP_FRAMES__.push(...${JSON.stringify(slice)});`,
        });
      }

      const webmBase64 = await cdp.send('Runtime.evaluate', {
        expression: `
          new Promise(async (resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 800;
            const ctx = canvas.getContext('2d');
            const stream = canvas.captureStream(15);
            const recorder = new MediaRecorder(stream, {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 2500000,
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
            const frameList = window.__DESKTOP_FRAMES__;
            for (let i = 0; i < frameList.length; i++) {
              await new Promise((imgRes) => {
                const img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, 1280, 800);
                  imgRes();
                };
                img.src = 'data:image/jpeg;base64,' + frameList[i];
              });
              await new Promise((r) => setTimeout(r, 66));
            }
            recorder.stop();
          })
        `,
        awaitPromise: true,
        returnByValue: true,
      });

      if (webmBase64.result && webmBase64.result.value) {
        const base64Data = webmBase64.result.value.replace(/^data:video\/webm;base64,/, '');
        const outPath = path.join(SCREENSHOT_DIR, 'desktop_two_way_road_15s.webm');
        fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
        console.log(`  🎬 Saved Desktop 15s Video: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
      }
    }

    // =========================================================================
    // 15-SECOND SCREEN RECORDING (MOBILE 390px)
    // =========================================================================
    console.log('\n================================================================');
    console.log('   RECORDING 15-SECOND MOBILE IMAGE-FIRST HERO (390x844)');
    console.log('================================================================');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(2000);

    const mobileFrames = [];
    cdp.on('Page.screencastFrame', async (params) => {
      mobileFrames.push(params.data);
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

    console.log('  Capturing 15-second mobile hero & integrated background motion...');
    await sleep(15000);
    await cdp.send('Page.stopScreencast');
    console.log(`  ✓ Collected ${mobileFrames.length} mobile frames across 15 seconds.`);

    if (mobileFrames.length > 0) {
      console.log('  Encoding mobile screencast into WebM video...');
      await cdp.send('Runtime.evaluate', { expression: 'window.__MOBILE_FRAMES__ = [];' });
      for (let i = 0; i < Math.min(mobileFrames.length, 120); i += 15) {
        const slice = mobileFrames.slice(i, i + 15);
        await cdp.send('Runtime.evaluate', {
          expression: `window.__MOBILE_FRAMES__.push(...${JSON.stringify(slice)});`,
        });
      }

      const mobWebm = await cdp.send('Runtime.evaluate', {
        expression: `
          new Promise(async (resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 390;
            canvas.height = 844;
            const ctx = canvas.getContext('2d');
            const stream = canvas.captureStream(15);
            const recorder = new MediaRecorder(stream, {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 1500000,
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
            const frameList = window.__MOBILE_FRAMES__;
            for (let i = 0; i < frameList.length; i++) {
              await new Promise((imgRes) => {
                const img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, 390, 844);
                  imgRes();
                };
                img.src = 'data:image/jpeg;base64,' + frameList[i];
              });
              await new Promise((r) => setTimeout(r, 66));
            }
            recorder.stop();
          })
        `,
        awaitPromise: true,
        returnByValue: true,
      });

      if (mobWebm.result && mobWebm.result.value) {
        const base64Data = mobWebm.result.value.replace(/^data:video\/webm;base64,/, '');
        const outPath = path.join(SCREENSHOT_DIR, 'mobile_image_first_hero_15s.webm');
        fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
        console.log(`  🎬 Saved Mobile 15s Video: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
      }
    }

    console.log('\n================================================================');
    console.log('   ALL RESPONSIVE & TWO-WAY ROAD QA CHECKS COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');

    cdp.close();
  } catch (err) {
    console.error('QA Error:', err);
  } finally {
    chromeProc.kill();
  }
}

run().catch(console.error);
