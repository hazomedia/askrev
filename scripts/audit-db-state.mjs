import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function auditDb() {
  console.log('=== DATABASE STATE & ROW COUNTS AUDIT ===');

  const tables = [
    'User',
    'WalletAccount',
    'ShoppingVoucher',
    'VoucherTransaction',
    'JournalEntry',
    'JournalLine',
    'EvBike',
    'EvBooking',
    'BinaryPlacement',
    'BinaryMatchEvent',
    'MembershipRequest',
    'CommissionHold',
    'PendingRecovery',
    'QualificationEvent',
    'AuditLog',
  ];

  for (const table of tables) {
    try {
      const count = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].count();
      console.log(`Table: ${table.padEnd(22)} | Rows: ${count}`);
    } catch (e) {
      console.log(`Table: ${table.padEnd(22)} | Error: ${e.message}`);
    }
  }

  console.log('\n=== SEEDED & CORE USERS CHECK ===');
  const coreUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'admin@askrev.com',
          'ops@askrev.com',
          'finance@askrev.com',
          'rahul.sponsor@askrev.com',
          'b.patel@askrev.com',
          'c.kumar@askrev.com',
          'd.singh@askrev.com',
          'e.joshi@askrev.com',
        ],
      },
    },
    select: {
      memberId: true,
      email: true,
      role: true,
      currentPackage: true,
      isFullQualified: true,
      wallet: {
        select: {
          availableEarningsPaise: true,
          heldCommissionsPaise: true,
          pendingRecoveryPaise: true,
          shoppingVoucherBalancePaise: true,
        },
      },
    },
  });

  for (const u of coreUsers) {
    console.log(`User: ${u.memberId} (${u.email}) | Role: ${u.role} | Pkg: ${u.currentPackage} | FullQual: ${u.isFullQualified} | Wallet: Avail=₹${Number(u.wallet?.availableEarningsPaise || 0n)/100}, Vchr=₹${Number(u.wallet?.shoppingVoucherBalancePaise || 0n)/100}`);
  }

  console.log('\n=== EV BIKES CHECK ===');
  const bikes = await prisma.evBike.findMany();
  for (const b of bikes) {
    console.log(`Bike: ${b.modelCode} | Name: ${b.name} | Booking: ₹${Number(b.bookingAmountPaise)/100} | VoucherLimit: ₹${Number(b.voucherRedeemLimitPaise)/100} | Available: ${b.isAvailable}`);
  }
}

auditDb().then(() => prisma.$disconnect());
