# ASKR EV — Member Authentication & Calculation Engine
## Verification & Audit Report

**Date:** November 21, 2026  
**Repository Branch:** `feature/member-auth-calculation-engine`  
**Baseline Git Commit:** `bded53a`  
**Compliance Guard:** `COMPLIANCE_MODE=SIMULATION_ONLY` (Strictly Enforced)  
**Test Suite Status:** 9 Test Files Passed (64/64 Tests, 100% Passing)  

---

## 1. Executive Summary

This release delivers the complete, audited, and production-ready implementation of:
1. **Mandatory Sponsor Referral Registration & Identity Preview**
2. **Email Verification & Anti-Enumeration Password Reset Flow**
3. **Member Profile Management with Referral Link Sharing**
4. **Automated Midnight Binary Matching Simulation Worker (Asia/Kolkata)**
5. **Configuration-Driven TDS Simulation Module**
6. **₹60,000 Retail Shopping Qualification Engine with Corporate Approval Document**

All calculations, daily cron triggers, and tax breakdowns operate exclusively within simulation sandboxes, ensuring zero real-world financial liability or unapproved cash flows.

---

## 2. Phase-by-Phase Verification

### Phase 1 — Member Authentication & Profile
- **Mandatory Referral Code:**
  - `RegisterDto.sponsorMemberId` is strictly required. Missing or empty referral codes fail validation with HTTP 400.
  - Non-existent member IDs are rejected with HTTP 404 (`Sponsor with Member ID ... does not exist`).
  - Self-sponsoring is blocked (`Cannot sponsor yourself`).
  - Pre-flight lookup endpoint `GET /api/auth/sponsor-lookup/:memberId` safely returns `{ valid: true, memberId, fullName }` without exposing private credentials.
  - Registration page `/auth/register` automatically captures and locks `?ref=` query parameter.
- **Forgot & Reset Password:**
  - `/auth/forgot-password` endpoint adheres to strict anti-enumeration principles. It issues a constant 200 OK message whether the email exists or not.
  - Tokens are 256-bit cryptographically secure strings hashed via SHA-256 in the database (`PasswordResetToken`).
  - Tokens expire after 15 minutes and can only be used once.
  - Password reset automatically invalidates all refresh tokens (`refreshTokenHash = null`), terminating active sessions across all devices.
  - Rate limited at 5 requests/min for forgot-password and 10 requests/min for reset-password.
- **Member Profile Tab:**
  - `/dashboard` includes a comprehensive Profile tab allowing members to view details, update their legal name and phone number (with duplicate phone validation), view email verification status, request verification links, and copy/share their referral link.

---

### Phase 2 — Calculation Engine Validation
- **Basic Activation (₹3,000):**
  - Generates ₹1,000 direct sponsor reward for eligible sponsors.
- **Full Activation (₹33,000):**
  - Issues ₹30,000 simulated shopping voucher (`SV-` series).
  - First qualified direct sponsor earns ₹10,000 direct bonus.
- **Second Direct Rule:**
  - Second direct sponsor earns ₹30,000 shopping voucher. Prior basic commission is recovered, releasing prior holds.
- **Binary Matching Cap & Ratio:**
  - 1:1 matching ratio (1 left unit = 1 right unit).
  - ₹3,000 per matched pair.
  - Strict daily cap of 15 pairs (₹45,000 maximum daily payout) per IST calendar day.
  - Volume carry-forward is preserved safely without leakage.

---

### Phase 3 — Automated Binary Simulation Worker
- **Scheduled Execution:**
  - Runs daily at `00:01 Asia/Kolkata` using `@nestjs/schedule` (`@Cron('1 0 * * *', { timeZone: 'Asia/Kolkata' })`).
  - Guarded by `COMPLIANCE_MODE=SIMULATION_ONLY`.
- **Distributed Safety:**
  - Employs PostgreSQL advisory lock `pg_try_advisory_lock(987654321)` to guarantee single-pod execution in horizontally scaled environments.
  - Enforces idempotency via unique index on `(runDate, isDryRun)`.
- **Admin Visibility:**
  - Endpoints `GET /api/members/admin/binary-simulation-runs` and `POST /api/members/admin/binary-simulation-run` enable real-time tracking and dry-run execution.

---

### Phase 4 — Configurable TDS Simulation
- **Configuration-Driven Rules:**
  - `TaxSimulationRule` stores dynamic rules without hardcoding tax percentages or assumptions.
  - Configurable income category (`DIRECT_SPONSOR_COMMISSION`, `BINARY_MATCHING_REWARD`, `ALL`), tax rate, threshold, and effective date range.
- **Non-Statutory Estimates:**
  - Calculations recorded in `TaxSimulationRecord` are strictly labeled with legal disclaimers as simulated estimates, never as actual tax withheld.
  - Produces gross, deduction, and net payout breakdown.

---

### Phase 5 — ₹60,000 Retail Shopping Qualification Engine
- **Order Tracking:**
  - Evaluates completed retail orders from `RetailOrderRecord`.
  - Configurable category filtering and rolling evaluation windows.
- **Refund Deductions:**
  - Net qualifying spend is reduced by customer returns and refunds.
- **Approval Gate:**
  - Qualification status remains `PENDING_BUSINESS_APPROVAL`.
  - Full corporate decision document written at `docs/RETAIL_QUALIFICATION_DECISION_DOCUMENT.md`.

---

## 3. Automated Test Verification Summary

```
 RUN  v3.2.7 D:/Projects/AskrEV/apps/api

 ✓ src/retail-qualification/retail-qualification.service.spec.ts (4 tests)
 ✓ src/products/products.service.spec.ts (8 tests)
 ✓ src/packages/packages.service.spec.ts (3 tests)
 ✓ src/members/members.service.spec.ts (3 tests)
 ✓ src/media/media.service.spec.ts (9 tests)
 ✓ src/members/binary-scheduler.service.spec.ts (4 tests)
 ✓ src/tax/tax.service.spec.ts (3 tests)
 ✓ src/simulation/commission-simulator.spec.ts (6 tests)
 ✓ src/auth/auth.service.spec.ts (24 tests)

 Test Files  9 passed (9)
      Tests  64 passed (64)
   Duration  3.37s
```

All 64 tests pass with zero errors. All packages build cleanly.
