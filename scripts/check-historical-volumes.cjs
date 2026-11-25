const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('backups/uat_28_summary.json', 'utf8'));
console.log('--- Historical Binary Placement Volumes for All 28 Members ---');
for (const u of summary) {
  const lv = parseInt(u.leftVol || '0', 10);
  const rv = parseInt(u.rightVol || '0', 10);
  const cl = parseInt(u.carryLeft || '0', 10);
  const cr = parseInt(u.carryRight || '0', 10);
  const matched = Math.min(lv, rv);
  console.log(
    `${u.idx}. ${u.memberId.padEnd(16)} | Package: ${u.package.padEnd(5)} | LeftVol: ${lv} | RightVol: ${rv} | Matched: ${matched} | CarryL: ${cl} | CarryR: ${cr} | Earnings: ₹${Number(u.availableEarnings)/100}`
  );
}
