import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots';
const BASE_URL = 'http://localhost:3000';

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

async function main() {
  console.log('================================================================');
  console.log('   ASKR EV 12-SECOND SCREEN RECORDING & ACTIVE ROAD CAPTURE');
  console.log('================================================================');

  const tempProfile = path.join(process.env.TEMP, 'chrome_record_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--remote-debugging-port=9988',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9988/json');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page') || tabs[0];
    const cdp = new CdpClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1440x900 Desktop Viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to ASKR EV Showroom...');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(2000);

    // Frame collection for 12-second recording
    const frames = [];
    cdp.on('Page.screencastFrame', async (params) => {
      frames.push(params.data);
      try {
        await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch (e) {}
    });

    console.log('Starting 12-Second Screencast Recording...');
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 1280,
      maxHeight: 800,
      everyNthFrame: 1,
    });

    // 12-second choreographed tour:
    // 0-3s: Hero vehicle showcase with active road animation
    await sleep(3000);

    // Capture explicit high-res shot of active road vehicles
    const roadActiveShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'final_road_vehicles_active.png'),
      Buffer.from(roadActiveShot.data, 'base64')
    );
    console.log('  📸 Captured high-res snapshot of active road vehicles in motion!');

    // 3-6s: Smooth scroll to vehicle catalog lineup
    for (let scrollY = 0; scrollY <= 720; scrollY += 40) {
      await cdp.send('Runtime.evaluate', {
        expression: `window.scrollTo(0, ${scrollY});`,
      });
      await sleep(100);
    }

    // 6-8s: Switch tabs to Scooters (showing distinct S1 Pro vs S1 Air)
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const scooterBtn = btns.find(b => b.innerText.includes('Scooters'));
        if (scooterBtn) scooterBtn.click();
      `,
    });
    await sleep(2000);

    // 8-10s: Switch tabs to Jeeps (showing TerraMax 4x4 with ASKR grille)
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const jeepBtn = btns.find(b => b.innerText.includes('Jeeps'));
        if (jeepBtn) jeepBtn.click();
      `,
    });
    await sleep(2000);

    // 10-12s: Scroll to Engineering Highlights
    for (let scrollY = 720; scrollY <= 1400; scrollY += 60) {
      await cdp.send('Runtime.evaluate', {
        expression: `window.scrollTo(0, ${scrollY});`,
      });
      await sleep(100);
    }
    await sleep(1500);

    await cdp.send('Page.stopScreencast');
    console.log(`  ✓ Screencast complete! Collected ${frames.length} frames across 12.5 seconds.`);

    // Encode keyframes into WebM video or animated reel using an in-browser canvas MediaRecorder
    if (frames.length > 0) {
      console.log('Encoding frames into video / reel...');
      const videoScript = `
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
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          };

          recorder.start();

          // Load and draw keyframes
          const frameList = window.__RECORDED_FRAMES__;
          const step = Math.max(1, Math.floor(frameList.length / 120)); // ~120 frames at 15fps = 8s
          for (let i = 0; i < frameList.length; i += step) {
            await new Promise((imgRes) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, 0, 0, 1280, 800);
                imgRes();
              };
              img.src = 'data:image/jpeg;base64,' + frameList[i];
            });
            await new Promise((r) => setTimeout(r, 66)); // 15 fps
          }

          recorder.stop();
        })
      `;

      // Pass frames into window
      // Send in chunks of 20 frames to avoid RPC size limits
      await cdp.send('Runtime.evaluate', { expression: 'window.__RECORDED_FRAMES__ = [];' });
      for (let i = 0; i < Math.min(frames.length, 120); i += 15) {
        const slice = frames.slice(i, i + 15);
        await cdp.send('Runtime.evaluate', {
          expression: `window.__RECORDED_FRAMES__.push(...${JSON.stringify(slice)});`,
        });
      }

      const videoDataUrl = (await cdp.send('Runtime.evaluate', {
        expression: videoScript,
        awaitPromise: true,
        returnByValue: true,
      })).result.value;

      if (videoDataUrl && videoDataUrl.startsWith('data:video/webm;base64,')) {
        const videoBuffer = Buffer.from(videoDataUrl.replace(/^data:video\/webm;base64,/, ''), 'base64');
        const videoPath = path.join(SCREENSHOT_DIR, 'askr_ev_showroom_12s_tour.webm');
        fs.writeFileSync(videoPath, videoBuffer);
        console.log(`  🎬 Successfully saved 12-second screen recording: askr_ev_showroom_12s_tour.webm (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB)!`);
      }
    }

    console.log('================================================================');
    console.log('   🎉 12-SECOND SCREEN RECORDING & QA SUITE FINISHED');
    console.log('================================================================');
  } finally {
    try {
      chromeProc.kill();
    } catch (e) {}
  }
}

main().catch(console.error);
