const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway',
    },
  },
});

async function main() {
  const [users, wallets, vouchers, holds, matrixPlacements, binaryPlacements] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        binaryPlacement: true,
        legacyPlacement: true,
      },
    }),
    prisma.walletAccount.findMany(),
    prisma.shoppingVoucher.findMany(),
    prisma.commissionHold.findMany(),
    prisma.legacyMatrixPlacement.findMany(),
    prisma.binaryPlacement.findMany(),
  ]);

  const idToMember = new Map();
  users.forEach((u) => idToMember.set(u.id, u.memberId));

  const matrixIdToMember = new Map();
  matrixPlacements.forEach((m) => {
    matrixIdToMember.set(m.id, idToMember.get(m.userId) || m.userId);
  });

  const binIdToMember = new Map();
  binaryPlacements.forEach((b) => {
    binIdToMember.set(b.id, idToMember.get(b.userId) || b.userId);
    binIdToMember.set(b.userId, idToMember.get(b.userId) || b.userId);
  });

  const walletByUser = new Map();
  wallets.forEach((w) => {
    walletByUser.set(w.userId, w);
  });

  const vouchersByUser = new Map();
  vouchers.forEach((v) => {
    if (!vouchersByUser.has(v.userId)) vouchersByUser.set(v.userId, []);
    vouchersByUser.get(v.userId).push(v);
  });

  const holdsByUser = new Map();
  holds.forEach((h) => {
    const key = h.sponsorId;
    if (!holdsByUser.has(key)) holdsByUser.set(key, []);
    holdsByUser.get(key).push(h);
  });

  console.log('| # | Member ID | Full Name | Package | Sponsor ID | Binary Parent | Leg | Carry L | Carry R | Matrix Parent | Available Wallet | Vouchers (Qty/₹) | Holds (Qty/₹) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');

  users.forEach((u, idx) => {
    const num = idx + 1;
    const mid = u.memberId;
    const name = u.fullName;
    const pkg = u.currentPackage;
    const sponsor = u.sponsorId ? idToMember.get(u.sponsorId) || u.sponsorId : 'ROOT';
    
    let binParent = 'ROOT';
    if (u.binaryPlacement?.parentId) {
      binParent = binIdToMember.get(u.binaryPlacement.parentId) || idToMember.get(u.binaryPlacement.parentId) || u.binaryPlacement.parentId;
    }

    const leg = u.binaryPlacement?.leg || '-';
    const carryL = u.binaryPlacement?.carryLeftPaise ? (Number(u.binaryPlacement.carryLeftPaise) / 100).toFixed(0) : '0';
    const carryR = u.binaryPlacement?.carryRightPaise ? (Number(u.binaryPlacement.carryRightPaise) / 100).toFixed(0) : '0';

    let matParent = 'ROOT';
    if (u.legacyPlacement?.parentId) {
      matParent = matrixIdToMember.get(u.legacyPlacement.parentId) || 'ROOT';
    }

    const uWallet = walletByUser.get(u.id);
    const wallet = uWallet?.availableEarningsPaise ? `₹${(Number(uWallet.availableEarningsPaise) / 100).toLocaleString('en-IN')}` : '₹0';
    
    const uVouchers = vouchersByUser.get(u.id) || [];
    const vCount = uVouchers.length;
    const vSum = uVouchers.reduce((s, v) => s + Number(v.initialValuePaise), 0);
    const vStr = vCount > 0 ? `${vCount} (₹${(vSum / 100).toLocaleString('en-IN')})` : '0 (₹0)';
    
    const uHolds = holdsByUser.get(u.id) || holdsByUser.get(u.memberId) || [];
    const hCount = uHolds.length;
    const hSum = uHolds.reduce((s, h) => s + Number(h.heldAmountPaise), 0);
    const hStr = hCount > 0 ? `${hCount} (₹${(hSum / 100).toLocaleString('en-IN')})` : '0 (₹0)';

    console.log(`| ${num} | \`${mid}\` | ${name} | **${pkg}** | \`${sponsor}\` | \`${binParent}\` | **${leg}** | ${carryL} | ${carryR} | \`${matParent}\` | ${wallet} | ${vStr} | ${hStr} |`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
