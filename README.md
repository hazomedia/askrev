# ASKR EV — Enterprise EV Mobility & Financial Ledger Platform (Phase 1)

**ASKR EV** is a high-performance, mobile-first web platform and double-entry financial ledger system engineered for Electric Vehicle (EV) booking, multi-tier membership management, shopping voucher liabilities, direct sponsorship tracking, and binary matching tree simulations.

---

## 1. Technology Stack

- **Monorepo Architecture:** Clean pnpm workspace
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** NestJS 10, Passport JWT, class-validator
- **Database & ORM:** PostgreSQL 17, Prisma ORM
- **State & Data Fetching:** TanStack Query, native fetch
- **Testing:** Vitest / Jest
- **Accounting:** Safe integer paise (`BigInt`) double-entry journal balance engine
- **Currency:** INR (₹)
- **Timezone:** Asia/Kolkata

---

## 2. Monorepo Structure

```text
D:\Projects\AskrEV
├── apps
│   ├── web                   # Next.js 15 App Router Frontend (Port 3000)
│   │   ├── src/app/          # App router pages (Home, Auth, Dashboard, Bikes, Simulator, Admin)
│   │   ├── src/components/   # Navbar, UI primitives, cards
│   │   └── src/lib/          # API client & local auth token storage
│   └── api                   # NestJS API Backend (Port 4000)
│       └── src/
│           ├── auth/         # JWT tokens, password hashing, roles guard
│           ├── members/      # Direct team, binary placement tree, admin listing
│           ├── packages/     # Package tiers & upgrade qualification
│           ├── simulation/   # Deterministic commission & binary matching engine
│           ├── vouchers/     # Shopping voucher liabilities & redemptions
│           ├── ev-bikes/     # Demo EV catalog & booking ledger
│           ├── admin/        # Platform liabilities overview & audit logs
│           └── prisma/       # Global Prisma database service
├── packages
│   ├── database              # Prisma schema, migrations, seed script
│   ├── shared                # Shared constants, enums, money utils (paise), DTOs
│   └── ui                    # Reusable design tokens & Tailwind utilities
├── docs
│   └── COMPLIANCE_AND_FINANCIAL_RISKS.md  # Statutory legal risk & compliance posture
├── scripts
│   ├── dev.ps1               # Concurrent dev startup script
│   └── seed.ps1              # Database sync and seed runner
├── docker-compose.yml        # PostgreSQL 17 container definition
├── pnpm-workspace.yaml       # Monorepo workspace configuration
└── README.md
```

---

## 3. Membership Packages & Financial Rules

| Package Tier | Platform Fee | Shopping Voucher | Direct Sponsor Reward | Binary Matching |
| :--- | :--- | :--- | :--- | :--- |
| **Free Registration** | ₹0 | ₹0 | Ineligible | Ineligible |
| **Basic Membership** | ₹3,000 | ₹0 | ₹1,000 (1x ₹1k hold reserve applied) | Ineligible |
| **Full Membership** | ₹3,000 | ₹30,000 | ₹10,000 total entitlement | ₹3,000 / match |
| **Upgrade (Payment)**| ₹30,000 | ₹30,000 | Advances to Full Qualified | Eligible |
| **Upgrade (Shopping)**| ₹60,000 verified retail | ₹0 | *Pending Business & Tax Sign-off* | *Pending* |

---

## 4. Section 5 Direct Sponsor Income Engine

1. **Two Counters per Sponsor:**
   - `Total Activated Directs` (Basic or Full joins)
   - `Total Full Qualified Directs` (Full join or upgraded to Full)
2. **Basic Activation (₹3,000):**
   - Proposes ₹1,000 sponsor commission.
   - Before the 2nd Full Qualified direct, maintains one ₹1,000 sponsor-level hold reserve when sufficient basic commissions are available.
3. **Full Qualification:**
   - **1st Full Qualified Direct:** ₹10,000 total wallet entitlement (deducting prior ₹1,000 basic commission = ₹9,000 net wallet credit).
   - **2nd Full Qualified Direct:**
     - Issues proposed ₹30,000 Shopping Voucher liability (non-withdrawable).
     - Releases the 1x ₹1,000 hold reserve to available earnings payable.
     - Separately recovers the ₹1,000 basic commission previously paid for this direct.
     - **Net cash effect:** ₹0 (+₹1,000 hold release - ₹1,000 recovery) + ₹30,000 shopping voucher.
   - **3rd Full Qualified Direct Onwards:** ₹10,000 total wallet entitlement each (net ₹9,000 if basic was paid).

### Canonical Scenario Verification (A sponsors B, C, D, E)

- **Initial State:**
  - B (Basic): ₹1,000 released
  - C (Basic): ₹1,000 held in reserve
  - D (Basic): ₹1,000 released
  - E (Basic): ₹1,000 released
- **D Upgrades First (1st Full Qualified):**
  - A receives ₹9,000 additional wallet credit. (Available: ₹12,000, Hold: ₹1,000)
- **E Upgrades Second (2nd Full Qualified):**
  - A receives ₹30,000 Shopping Voucher.
  - C's ₹1,000 hold is released.
  - E's previously paid ₹1,000 commission is separately recovered.
  - Net cash effect = ₹0.
  - Final State: Available Earnings = **₹12,000**, Hold = **₹0**, Voucher = **₹30,000**, Pending Recovery = **₹0**.
  - All journal entries strictly balanced: `Sum(Debits) === Sum(Credits)`.

---

## 5. Binary Matching Engine

- **Ratio:** 1:1
- **Match Reward:** ₹3,000 per match
- **Daily Cap:** 15 matches / ₹45,000 maximum daily liability per distributor
- **Carry Forward:** Unused leg volume carries forward
- **Status:** Non-disbursing simulation mode pending actuarial verification.

---

## 6. Demo Accounts & Seed Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@askrev.com` | `Admin@123456` | Full platform & audit control |
| **Operations Admin** | `ops@askrev.com` | `Admin@123456` | Member and booking management |
| **Finance Controller**| `finance@askrev.com`| `Admin@123456` | Ledger liabilities review |
| **Primary Sponsor A**| `rahul.sponsor@askrev.com` | `Member@123456` | Member ID: `ASKR-100001` (Full Qualified) |
| **Direct B** | `b.patel@askrev.com` | `Member@123456` | Member ID: `ASKR-100002` (Basic) |
| **Direct C** | `c.kumar@askrev.com` | `Member@123456` | Member ID: `ASKR-100003` (Basic) |
| **Direct D** | `d.singh@askrev.com` | `Member@123456` | Member ID: `ASKR-100004` (Basic) |
| **Direct E** | `e.joshi@askrev.com` | `Member@123456` | Member ID: `ASKR-100005` (Basic) |

---

## 7. Quick Start & Setup

### Prerequisites
- Node.js 20+ (Node v24 tested)
- pnpm 12+
- PostgreSQL 17 running on `localhost:5432` (or via Docker Compose: `docker-compose up -d`)

### Installation & Database Initialization

```bash
# 1. Install dependencies across monorepo
pnpm install

# 2. Push Prisma schema to PostgreSQL & generate client
pnpm db:push

# 3. Seed demo accounts, referrals, and EV bike catalog
pnpm db:seed

# 4. Run automated test suite
pnpm test

# 5. Build full monorepo
pnpm build
```

### Running Locally

```bash
# Terminal 1 - Start NestJS API Backend (Port 4000)
pnpm dev:api

# Terminal 2 - Start Next.js Frontend (Port 3000)
pnpm dev:web
```

- **Frontend URL:** `http://localhost:3000`
- **Backend API URL:** `http://localhost:4000/api`

---

## 8. Compliance & Legal Guardrails

All live real-money payouts, bank settlements, and MLM matching distributions are **disabled** in Phase 1 via environment configuration:
- `COMPLIANCE_MODE=SIMULATION_ONLY`
- `ENABLE_LIVE_PAYOUTS=false`
- `ENABLE_LIVE_MATCHING=false`
- `ENABLE_DIRECT_VOUCHER_CASH_CONVERSION=false`

Detailed compliance notes regarding the Consumer Protection (Direct Selling) Rules, 2021, Prize Chits Act, 1978, GST Sections, and TDS Sections 194H/194R can be found in [`docs/COMPLIANCE_AND_FINANCIAL_RISKS.md`](docs/COMPLIANCE_AND_FINANCIAL_RISKS.md).
