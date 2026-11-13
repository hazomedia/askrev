import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_PATH = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\screenshots\\production_live_desktop.png';
const TARGET_URL = 'https://askrev-sigma.vercel.app';
const CDP_PORT = 9225;

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
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    TARGET_URL,
  ]);

  await sleep(4000);

  try {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
    const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!pageTarget) throw new Error('No page target found');

    const cdp = new SimpleCdp(pageTarget.webSocketDebuggerUrl);
    const connected = await cdp.connect();
    if (!connected) {
      chrome.kill();
      return;
    }

    await cdp.send('Page.enable');
    await sleep(3000);

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(shot.data, 'base64'));
      console.log('Saved production screenshot to:', SCREENSHOT_PATH);
    }
  } catch (err) {
    console.error('CDP error:', err.message);
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
