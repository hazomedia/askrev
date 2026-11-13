import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROAD_DIR = 'D:\\Projects\\AskrEV\\apps\\web\\public\\images\\road';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const tempProfile = path.join(process.env.TEMP, 'chrome_trans_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9333',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9333/json');
    const tabs = await listRes.json();
    const tab = tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((res) => (ws.onopen = res));

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === msgId) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(new Error(data.error.message));
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Runtime.enable');

    const files = ['top-jeep', 'top-motorcycle', 'top-scooter'];

    for (const file of files) {
      const jpgPath = path.join(ROAD_DIR, `${file}.jpg`);
      if (!fs.existsSync(jpgPath)) continue;

      const base64Data = fs.readFileSync(jpgPath).toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64Data}`;

      const evalRes = await send('Runtime.evaluate', {
        expression: `(async () => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);

              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const d = imgData.data;

              // Corner sampling to detect background
              for (let i = 0; i < d.length; i += 4) {
                const r = d[i];
                const g = d[i+1];
                const b = d[i+2];

                // If pixel is near white/light grey, make it transparent
                const brightness = (r + g + b) / 3;
                if (brightness > 230 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
                  const factor = Math.max(0, (brightness - 230) / 25);
                  d[i+3] = Math.round(d[i+3] * (1 - factor));
                }
              }

              ctx.putImageData(imgData, 0, 0);
              resolve(canvas.toDataURL('image/png').split(',')[1]);
            };
            img.src = '${dataUri}';
          });
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });

      const pngBase64 = evalRes.result.value;
      const pngPath = path.join(ROAD_DIR, `${file}.png`);
      fs.writeFileSync(pngPath, Buffer.from(pngBase64, 'base64'));
      console.log(`Saved transparent PNG: ${file}.png (${fs.statSync(pngPath).size} bytes)`);
    }

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);

