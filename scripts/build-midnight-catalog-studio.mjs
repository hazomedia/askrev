import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VEHICLE_DIR = 'D:\\Projects\\AskrEV\\apps\\web\\public\\images\\vehicles\\dark';
const ROAD_DIR = 'D:\\Projects\\AskrEV\\apps\\web\\public\\images\\road';
const BRAIN_DIR = 'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('================================================================');
  console.log('   ASKR EV MIDNIGHT ELECTRIC STUDIO COMPOSITOR');
  console.log('================================================================');

  const tempProfile = path.join(process.env.TEMP, 'chrome_comp_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9555',
    `--user-data-dir=${tempProfile}`,
    'about:blank',
  ]);

  await sleep(2500);

  try {
    const listRes = await fetch('http://localhost:9555/json');
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

    // -------------------------------------------------------------------------
    // 1. PERFECT JEEP TERRAMAX 4x4 (Clean Grille, Official ASKR, Clean Plate)
    // -------------------------------------------------------------------------
    console.log('\n[1/5] Refining ASKR TerraMax 4x4 (Flawless Grille, Official ASKR Badge)...');
    const origJeepPath = path.join(BRAIN_DIR, 'hero_jeep_dark_1794568278483.jpg');
    if (fs.existsSync(origJeepPath)) {
      const origJeepBase64 = fs.readFileSync(origJeepPath).toString('base64');

      const perfectJeepScript = `
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const w = canvas.width;
            const h = canvas.height;

            // 1. Grille Area: Fill inner mesh rectangle between horizontal light bars
            // In 1920x1080: x: 412 to 645, y: 472 to 528
            const gx = Math.round(w * 0.215);
            const gy = Math.round(h * 0.440);
            const gw = Math.round(w * 0.125);
            const gh = Math.round(h * 0.052);

            // Create rich dark honeycomb/mesh gradient
            const meshGrad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
            meshGrad.addColorStop(0, '#0D1420');
            meshGrad.addColorStop(0.5, '#121B2A');
            meshGrad.addColorStop(1, '#0A0F18');
            ctx.fillStyle = meshGrad;
            ctx.fillRect(gx, gy, gw, gh);

            // Subtle dark horizontal slats for authentic automotive grille
            ctx.strokeStyle = '#182438';
            ctx.lineWidth = 1.5;
            for (let y = gy + 6; y < gy + gh - 4; y += 6) {
              ctx.beginPath();
              ctx.moveTo(gx + 4, y);
              ctx.lineTo(gx + gw - 4, y);
              ctx.stroke();
            }

            // Official ASKR Illuminated Grille Badge
            ctx.save();
            ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#E0F2FE';
            ctx.shadowColor = '#38BDF8';
            ctx.shadowBlur = 12;
            ctx.fillText('ASKR', gx + gw / 2, gy + gh / 2 + 1);
            ctx.shadowBlur = 4;
            ctx.fillText('ASKR', gx + gw / 2, gy + gh / 2 + 1);
            ctx.restore();

            // 2. License Plate: Clean dark showroom plate
            const px = Math.round(w * 0.218);
            const py = Math.round(h * 0.575);
            const pw = Math.round(w * 0.088);
            const ph = Math.round(h * 0.046);

            const plateGrad = ctx.createLinearGradient(px, py, px, py + ph);
            plateGrad.addColorStop(0, '#111827');
            plateGrad.addColorStop(1, '#0B0F17');
            ctx.fillStyle = plateGrad;
            ctx.fillRect(px, py, pw, ph);

            // Subtle silver border
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

            // Plate text: "ASKR EV"
            ctx.save();
            ctx.font = 'bold 13px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#94A3B8';
            ctx.fillText('ASKR EV', px + pw / 2, py + ph / 2);
            ctx.restore();

            // 3. Fender Badge: Seamlessly heal using clean panel sample
            const fx = Math.round(w * 0.556);
            const fy = Math.round(h * 0.418);
            const fw = Math.round(w * 0.038);
            const fh = Math.round(h * 0.022);
            // Copy slice from clean fender panel 25px above
            ctx.drawImage(canvas, fx, fy - 26, fw, fh, fx, fy, fw, fh);

            resolve(canvas.toDataURL('image/jpeg', 0.94));
          };
          img.src = 'data:image/jpeg;base64,${origJeepBase64}';
        });
      `;

      const perfectJeepUri = (await send('Runtime.evaluate', {
        expression: perfectJeepScript,
        awaitPromise: true,
        returnByValue: true,
      })).result.value;

      const jeepBuffer = Buffer.from(perfectJeepUri.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(VEHICLE_DIR, 'hero-jeep-dark.jpg'), jeepBuffer);
      fs.writeFileSync(path.join(VEHICLE_DIR, 'terramax-4x4.jpg'), jeepBuffer);
      console.log(`  ✓ Perfected hero-jeep-dark.jpg & terramax-4x4.jpg (${(jeepBuffer.length / 1024).toFixed(1)} KB)`);
    }

    // -------------------------------------------------------------------------
    // 2. SCOOTER S1 AIR: COMPOSITING DISTINCT SCOOTER MODEL ONTO DARK STUDIO
    // -------------------------------------------------------------------------
    console.log('\n[2/5] Creating distinct ASKR S1 Air (Distinct Dual-Lamp Model on Dark Studio Floor)...');
    const origAirPath = path.join(BRAIN_DIR, 'scooter_hero_1794562151122.jpg');
    if (fs.existsSync(origAirPath)) {
      const airBase64 = fs.readFileSync(origAirPath).toString('base64');

      const studioScooterScript = `
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');

            // 1. Dark Automotive Studio Backdrop
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
            bgGrad.addColorStop(0, '#080B12');
            bgGrad.addColorStop(0.55, '#0E1422');
            bgGrad.addColorStop(0.56, '#101726'); // Horizon floor line
            bgGrad.addColorStop(1, '#070A10');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Ambient Directional Cyan/Blue Studio Spotlight
            const spotGrad = ctx.createRadialGradient(960, 520, 80, 960, 520, 650);
            spotGrad.addColorStop(0, 'rgba(38, 125, 255, 0.28)');
            spotGrad.addColorStop(0.5, 'rgba(80, 217, 255, 0.10)');
            spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spotGrad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Studio Wall Architectural Vertical Light Slits
            ctx.fillStyle = 'rgba(80, 217, 255, 0.06)';
            ctx.fillRect(240, 60, 4, 480);
            ctx.fillRect(1680, 60, 4, 480);

            // 2. Extract Scooter Pixels & Draw Realistic Tire Ground Shadow
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(img, 0, 0);

            const imgData = tCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const minVal = Math.min(r, g, b);

              // Seamless antialiased background extraction
              if (minVal > 246) {
                data[i + 3] = 0;
              } else if (minVal > 218) {
                data[i + 3] = Math.round(((246 - minVal) / 28) * 255);
              }
            }
            tCtx.putImageData(imgData, 0, 0);

            // 3. Dense Ground Contact Shadows beneath Front & Rear Tires
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
            ctx.beginPath();
            // Center of shadow stage: x: 960, y: 880
            ctx.ellipse(960, 885, 420, 36, 0, 0, Math.PI * 2);
            ctx.filter = 'blur(16px)';
            ctx.fill();

            // Core tire contact patches
            ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
            ctx.filter = 'blur(6px)';
            ctx.beginPath();
            ctx.ellipse(660, 890, 90, 16, 0, 0, Math.PI * 2); // Front tire contact
            ctx.ellipse(1260, 890, 100, 18, 0, 0, Math.PI * 2); // Rear tire contact
            ctx.fill();
            ctx.restore();

            // 4. Draw Extracted Vehicle onto Stage
            // Fit nicely: scaled to ~1360px wide, centered
            const dw = 1420;
            const dh = Math.round((dw / img.width) * img.height);
            const dx = Math.round((1920 - dw) / 2);
            const dy = 160;

            ctx.drawImage(tempCanvas, dx, dy, dw, dh);

            resolve(canvas.toDataURL('image/jpeg', 0.94));
          };
          img.src = 'data:image/jpeg;base64,${airBase64}';
        });
      `;

      const studioScooterUri = (await send('Runtime.evaluate', {
        expression: studioScooterScript,
        awaitPromise: true,
        returnByValue: true,
      })).result.value;

      const airBuffer = Buffer.from(studioScooterUri.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(VEHICLE_DIR, 'scooter-s1-air.jpg'), airBuffer);
      console.log(`  ✓ Generated distinct scooter-s1-air.jpg on dark studio stage (${(airBuffer.length / 1024).toFixed(1)} KB)`);
    }

    // -------------------------------------------------------------------------
    // 3. MOTORCYCLE: SAPPHIRE BLUE CITY CRUISE ON DARK STUDIO FLOOR
    // -------------------------------------------------------------------------
    console.log('\n[3/5] Creating distinct ASKR City Cruise (Sapphire Blue 3/4 Perspective on Dark Studio)...');
    const origMotorPath = path.join(BRAIN_DIR, 'motorcycle_hero_1794562162070.jpg');
    if (fs.existsSync(origMotorPath)) {
      const motorBase64 = fs.readFileSync(origMotorPath).toString('base64');

      const studioMotorScript = `
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');

            // Dark Automotive Studio Backdrop
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
            bgGrad.addColorStop(0, '#080B12');
            bgGrad.addColorStop(0.56, '#0D1424');
            bgGrad.addColorStop(0.57, '#101828');
            bgGrad.addColorStop(1, '#070A10');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Ambient Directional Electric Blue Studio Spotlight
            const spotGrad = ctx.createRadialGradient(960, 530, 80, 960, 530, 700);
            spotGrad.addColorStop(0, 'rgba(38, 125, 255, 0.32)');
            spotGrad.addColorStop(0.5, 'rgba(80, 217, 255, 0.12)');
            spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spotGrad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Extract Motorcycle Pixels
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(img, 0, 0);

            const imgData = tCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const minVal = Math.min(r, g, b);

              if (minVal > 245) {
                data[i + 3] = 0;
              } else if (minVal > 215) {
                data[i + 3] = Math.round(((245 - minVal) / 30) * 255);
              }
            }
            tCtx.putImageData(imgData, 0, 0);

            // Ground Contact Shadows
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
            ctx.filter = 'blur(18px)';
            ctx.beginPath();
            ctx.ellipse(960, 890, 480, 40, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
            ctx.filter = 'blur(6px)';
            ctx.beginPath();
            ctx.ellipse(660, 895, 110, 18, 0, 0, Math.PI * 2); // Front tire
            ctx.ellipse(1280, 895, 120, 20, 0, 0, Math.PI * 2); // Rear tire
            ctx.fill();
            ctx.restore();

            const dw = 1460;
            const dh = Math.round((dw / img.width) * img.height);
            const dx = Math.round((1920 - dw) / 2);
            const dy = 140;

            ctx.drawImage(tempCanvas, dx, dy, dw, dh);

            resolve(canvas.toDataURL('image/jpeg', 0.94));
          };
          img.src = 'data:image/jpeg;base64,${motorBase64}';
        });
      `;

      const studioMotorUri = (await send('Runtime.evaluate', {
        expression: studioMotorScript,
        awaitPromise: true,
        returnByValue: true,
      })).result.value;

      const motorBuffer = Buffer.from(studioMotorUri.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(VEHICLE_DIR, 'city-cruise.jpg'), motorBuffer);
      console.log(`  ✓ Generated distinct city-cruise.jpg (Sapphire Blue) (${(motorBuffer.length / 1024).toFixed(1)} KB)`);
    }

    // -------------------------------------------------------------------------
    // 4. URBAN 4x4: TERRAMAX URBAN ON CLEAN DARK STUDIO FLOOR
    // -------------------------------------------------------------------------
    console.log('\n[4/5] Creating distinct ASKR TerraMax Urban (Clean Titanium Studio Profile)...');
    const origUrbanPath = path.join(BRAIN_DIR, 'jeep_hero_clean_bg_1794562193479.jpg');
    if (fs.existsSync(origUrbanPath)) {
      const urbanBase64 = fs.readFileSync(origUrbanPath).toString('base64');

      const studioUrbanScript = `
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');

            // Dark Automotive Studio Backdrop
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
            bgGrad.addColorStop(0, '#080B12');
            bgGrad.addColorStop(0.55, '#0C1320');
            bgGrad.addColorStop(0.56, '#101726');
            bgGrad.addColorStop(1, '#070A10');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Ambient Directional Ice Blue Studio Spotlight
            const spotGrad = ctx.createRadialGradient(960, 520, 80, 960, 520, 720);
            spotGrad.addColorStop(0, 'rgba(80, 217, 255, 0.22)');
            spotGrad.addColorStop(0.5, 'rgba(38, 125, 255, 0.10)');
            spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spotGrad;
            ctx.fillRect(0, 0, 1920, 1080);

            // Extract Jeep Pixels & Clean "ALPHA" on grille
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(img, 0, 0);

            const imgData = tCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;

            // In 1920x1080: "ALPHA" is on grille x: 300 to 460, y: 440 to 490
            const ax0 = Math.round(img.width * 0.15);
            const ax1 = Math.round(img.width * 0.26);
            const ay0 = Math.round(img.height * 0.42);
            const ay1 = Math.round(img.height * 0.48);

            for (let y = ay0; y < ay1; y++) {
              for (let x = ax0; x < ax1; x++) {
                const idx = (y * img.width + x) * 4;
                if (data[idx] > 140 && data[idx + 1] > 140 && data[idx + 2] > 140) {
                  data[idx] = 18;
                  data[idx + 1] = 22;
                  data[idx + 2] = 28;
                }
              }
            }

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const minVal = Math.min(r, g, b);

              if (minVal > 245) {
                data[i + 3] = 0;
              } else if (minVal > 215) {
                data[i + 3] = Math.round(((245 - minVal) / 30) * 255);
              }
            }
            tCtx.putImageData(imgData, 0, 0);

            // Ground Contact Shadows
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
            ctx.filter = 'blur(20px)';
            ctx.beginPath();
            ctx.ellipse(960, 890, 520, 44, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            const dw = 1480;
            const dh = Math.round((dw / img.width) * img.height);
            const dx = Math.round((1920 - dw) / 2);
            const dy = 145;

            ctx.drawImage(tempCanvas, dx, dy, dw, dh);

            resolve(canvas.toDataURL('image/jpeg', 0.94));
          };
          img.src = 'data:image/jpeg;base64,${urbanBase64}';
        });
      `;

      const studioUrbanUri = (await send('Runtime.evaluate', {
        expression: studioUrbanScript,
        awaitPromise: true,
        returnByValue: true,
      })).result.value;

      const urbanBuffer = Buffer.from(studioUrbanUri.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(VEHICLE_DIR, 'terramax-urban.jpg'), urbanBuffer);
      console.log(`  ✓ Generated distinct terramax-urban.jpg on dark studio stage (${(urbanBuffer.length / 1024).toFixed(1)} KB)`);
    }

    // -------------------------------------------------------------------------
    // 5. PHOTOREALISTIC TOP-CYCLE FOR VERTICAL ROAD (CLEAN ALPHA MASK)
    // -------------------------------------------------------------------------
    console.log('\n[5/5] Refining top-cycle.png with pure transparent alpha mask...');
    const topCycleScript = `
      (() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const cx = 256;

        // Front is at top, Rear is at bottom (matching other top-view vehicles)
        // Soft contact shadow beneath frame
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
        ctx.filter = 'blur(8px)';
        ctx.beginPath();
        ctx.ellipse(cx, 256, 28, 190, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- REAR WHEEL & TIRE ---
        ctx.save();
        ctx.fillStyle = '#111317';
        ctx.beginPath();
        ctx.roundRect(cx - 7, 340, 14, 130, 7);
        ctx.fill();
        // Tread center
        ctx.fillStyle = '#262930';
        ctx.fillRect(cx - 2, 346, 4, 118);
        // Rim
        ctx.fillStyle = '#4B5563';
        ctx.fillRect(cx - 3, 380, 6, 50);
        ctx.restore();

        // --- REAR STAYS ---
        ctx.save();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 12, 400);
        ctx.lineTo(cx - 5, 320);
        ctx.moveTo(cx + 12, 400);
        ctx.lineTo(cx + 5, 320);
        ctx.stroke();
        ctx.restore();

        // --- BOTTOM BRACKET & CRANKSET ---
        ctx.save();
        // Pedals
        ctx.fillStyle = '#4B5563';
        ctx.fillRect(cx - 38, 308, 18, 8);
        ctx.fillRect(cx + 20, 308, 18, 8);
        // Crank arms
        ctx.fillStyle = '#9CA3AF';
        ctx.fillRect(cx - 20, 310, 20, 4);
        ctx.fillRect(cx, 310, 20, 4);
        // Shell
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.arc(cx, 312, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- INTEGRATED BATTERY DOWNTUBE & TOP TUBE ---
        ctx.save();
        // Downtube
        const tubeGrad = ctx.createLinearGradient(cx - 12, 0, cx + 12, 0);
        tubeGrad.addColorStop(0, '#111827');
        tubeGrad.addColorStop(0.35, '#374151');
        tubeGrad.addColorStop(0.7, '#4B5563');
        tubeGrad.addColorStop(1, '#111827');
        ctx.fillStyle = tubeGrad;
        ctx.beginPath();
        ctx.roundRect(cx - 10, 160, 20, 160, 6);
        ctx.fill();

        // Cyan LED Power Stripe
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(cx - 1.5, 175, 3, 75);

        // Power Indicator Dot
        ctx.fillStyle = '#06B6D4';
        ctx.beginPath();
        ctx.arc(cx, 190, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- SADDLE ---
        ctx.save();
        ctx.fillStyle = '#181A1F';
        ctx.beginPath();
        ctx.moveTo(cx, 275);
        ctx.bezierCurveTo(cx - 6, 290, cx - 14, 320, cx - 18, 335);
        ctx.bezierCurveTo(cx - 14, 346, cx + 14, 346, cx + 18, 335);
        ctx.bezierCurveTo(cx + 14, 320, cx + 6, 290, cx, 275);
        ctx.closePath();
        ctx.fill();
        // Red reflector
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(cx - 5, 342, 10, 2.5);
        ctx.restore();

        // --- FRONT WHEEL & TIRE ---
        ctx.save();
        ctx.fillStyle = '#111317';
        ctx.beginPath();
        ctx.roundRect(cx - 7, 45, 14, 130, 7);
        ctx.fill();
        ctx.fillStyle = '#262930';
        ctx.fillRect(cx - 2, 51, 4, 118);
        ctx.fillStyle = '#4B5563';
        ctx.fillRect(cx - 3, 85, 6, 50);

        // Fork crown
        ctx.fillStyle = '#374151';
        ctx.fillRect(cx - 12, 142, 24, 10);
        ctx.restore();

        // --- HANDLEBARS, DISPLAY & GRIPS ---
        ctx.save();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 75, 162);
        ctx.lineTo(cx - 35, 156);
        ctx.lineTo(cx, 155);
        ctx.lineTo(cx + 35, 156);
        ctx.lineTo(cx + 75, 162);
        ctx.stroke();

        // Rubber Grips
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(cx - 75, 162);
        ctx.lineTo(cx - 48, 158);
        ctx.moveTo(cx + 48, 158);
        ctx.lineTo(cx + 75, 162);
        ctx.stroke();

        // Digital LCD Display
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.roundRect(cx - 11, 146, 22, 15, 3);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(cx - 6, 151, 12, 2.5);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(cx - 6, 155, 7, 1.5);
        ctx.restore();

        return canvas.toDataURL('image/png');
      })()
    `;

    const topCycleDataUri = (await send('Runtime.evaluate', {
      expression: topCycleScript,
      returnByValue: true,
    })).result.value;

    const topCycleBuffer = Buffer.from(topCycleDataUri.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(path.join(ROAD_DIR, 'top-cycle.png'), topCycleBuffer);
    console.log(`  ✓ Saved refined top-cycle.png (${(topCycleBuffer.length / 1024).toFixed(1)} KB)`);

    console.log('\n================================================================');
    console.log('   🎉 MIDNIGHT ELECTRIC STUDIO ASSETS REFINED SUCCESSFULLY');
    console.log('================================================================');
  } finally {
    try {
      chromeProc.kill();
    } catch (e) {}
  }
}

main().catch(console.error);
