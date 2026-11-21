# ASKR EV — Retail Shopping Qualification (₹60,000 Threshold)
## Business Rule & Corporate Approval Decision Document

**Status:** PENDING CORPORATE & LEGAL APPROVAL  
**Current Operating Mode:** `COMPLIANCE_MODE=SIMULATION_ONLY`  
**Document Version:** 1.0.0  
**Effective Target Date:** TBD upon Executive Sign-Off  

---

## 1. Executive Summary

This document specifies the business rules, eligibility criteria, financial impact, and governance framework for the proposed **₹60,000 Retail Shopping Qualification** mechanism on the ASKR EV platform.

Under the current implementation, all retail orders and qualification events operate strictly in **Simulation Mode** (`COMPLIANCE_MODE=SIMULATION_ONLY`). Qualification events produce an auditable preview and remain in the `PENDING_BUSINESS_APPROVAL` state without releasing or unlocking any live financial liabilities, payouts, or vehicle entitlements until formal written approval is obtained from ASKR EV corporate management and legal counsel.

---

## 2. Seven (7) Unapproved Business Decisions for Corporate Sign-Off

### Decision 1: Eligible Product Categories for Qualification
- **Current Technical Implementation:**
  - Configurable in `RetailQualificationConfig.eligibleCategories`. Default set to `['SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY']`.
- **Options for Corporate Decision:**
  - **Option A (Vehicles Only):** Only completed vehicle reservations and vehicle sales count toward the ₹60,000 threshold. Accessories, spare parts, and merchandise are excluded.
  - **Option B (All Categories):** All retail purchases across vehicles, accessories, charging equipment, and utility add-ons count.
  - **Option C (Vehicle Booking Deposit Only):** Only booking deposits for two-wheelers, four-wheelers, or cycles qualify.
- **Management Recommendation:** Option A (Vehicles Only). High-value items minimize fractional transaction overhead and align with core EV fleet adoption goals.
- **Corporate Decision:** `[ ] Option A    [ ] Option B    [ ] Option C`

---

### Decision 2: Voucher Redemption Inclusion in Spend Calculation
- **Current Technical Implementation:**
  - Configurable via `RetailQualificationConfig.includeVoucherRedemptions` (default: `false`).
- **Options for Corporate Decision:**
  - **Option A (Net Cash Paid Only - Recommended):** Only genuine out-of-pocket customer payments (UPI, Card, Net Banking, Simulated Cash) qualify. Shopping voucher discounts (e.g. ₹30,000 activation vouchers) are deducted.
  - **Option B (Gross Invoice Value):** The full vehicle price counts regardless of voucher redemption.
- **Financial Risk Analysis:**
  - If a member activates for ₹33,000, receives ₹30,000 in shopping vouchers, and buys a ₹60,000 vehicle paying only ₹30,000 cash, Option B would grant qualification on only ₹30,000 net company intake. Option A ensures the company collects ₹60,000 real cash before unlocking qualification benefits.
- **Corporate Decision:** `[ ] Option A (Net Cash)    [ ] Option B (Gross)`

---

### Decision 3: Evaluation Timeframe & Reset Policy
- **Current Technical Implementation:**
  - Configurable via `RetailQualificationConfig.evaluationPeriodDays` (default: `365` days).
- **Options for Corporate Decision:**
  - **Option A (Rolling 365 Days):** Orders placed within the last 365 calendar days are summed. Older orders drop out of the qualifying balance.
  - **Option B (Lifetime Cumulative):** Any order since member registration permanently accumulates toward ₹60,000.
  - **Option C (Annual Calendar Year Reset):** Accumulation resets to ₹0 on March 31 (Indian Financial Year) or December 31.
- **Management Recommendation:** Option A (Rolling 365 Days) provides sustained retail momentum while preventing indefinite lifetime liabilities.
- **Corporate Decision:** `[ ] Option A    [ ] Option B    [ ] Option C`

---

### Decision 4: Handling Returns, Order Cancellations & Refunds
- **Current Technical Implementation:**
  - Handled via `RetailQualificationConfig.allowRefundDeductions: true`.
- **Business Rule Specification:**
  - If a customer cancels an EV reservation or returns merchandise:
    1. The refunded amount is immediately deducted from the member's cumulative qualification spend.
    2. If the member previously reached the ₹60,000 threshold solely due to the refunded order, qualification status transitions from `QUALIFIED` to `PENDING_REQUALIFICATION`.
    3. Any downstream simulation rewards accrued must be clawed back or flagged as void.
- **Corporate Decision:** `[ ] Approved as Proposed    [ ] Custom Rule Required`

---

### Decision 5: Reward & Benefit Structure Upon Qualification
- **Current Technical Implementation:**
  - Status is marked `PENDING_BUSINESS_APPROVAL`. Benefit preview states: `"PREVIEW_ONLY: Unlocking benefits requires separate corporate and legal approval."`
- **Proposed Unlocked Benefits (Subject to Approval):**
  - **Benefit A:** Priority vehicle delivery allocation on new model launches.
  - **Benefit B:** Dedicated EV service concierge and free doorstep pickup.
  - **Benefit C:** Commercial Affiliate tier eligibility (subject to separate affiliate compliance).
  - **Strict Prohibition:** Qualification must NOT automatically unlock direct cash distributions or unverified multi-tier commissions in violation of direct selling guidelines.
- **Corporate Decision:** `[ ] Approve Non-Monetary Privileges (A & B)    [ ] Defer Until Legal Review`

---

### Decision 6: Dual Qualification Interaction (₹33,000 Activation vs ₹60,000 Retail Spend)
- **Problem Statement:**
  - A member can currently achieve Full Qualification through administrative activation of the ₹33,000 package.
  - How does retail shopping qualification interact with package activation?
- **Options for Corporate Decision:**
  - **Alternative Path:** Achieving ₹60,000 retail spend grants Full Qualification status without requiring the ₹33,000 activation request.
  - **Separate Track:** ₹33,000 remains the only path to Full Network Qualification. ₹60,000 retail spend unlocks Retail VIP Customer privileges only.
  - **Hybrid:** Retail spend of ₹60,000 provides a 50% waiver on network activation.
- **Management Recommendation:** Separate Track. Keeps customer commerce strictly segregated from network distribution to maintain regulatory compliance under Direct Selling Guidelines 2021.
- **Corporate Decision:** `[ ] Alternative Path    [ ] Separate Track (Recommended)    [ ] Hybrid`

---

### Decision 7: Corporate Approval & Regulatory Compliance Process
- **Mandatory Requirements Prior to Live Release:**
  1. Formal written approval from ASKR EV Board of Directors.
  2. Legal verification of compliance with Consumer Protection (Direct Selling) Rules, 2021.
  3. Tax audit review regarding Section 194R (perquisites/benefits) and Section 194H (commission/brokerage).
  4. System environment variable update from `COMPLIANCE_MODE=SIMULATION_ONLY` to approved production status only after explicit authorization.

---

## 3. Decision Sign-Off Matrix

| Role | Name | Signature | Date | Decision |
|---|---|---|---|---|
| Chief Executive Officer (CEO) | _____________________ | _____________________ | ____________ | Approved / Rejected / Deferred |
| Chief Financial Officer (CFO) | _____________________ | _____________________ | ____________ | Approved / Rejected / Deferred |
| Head of Legal & Compliance | _____________________ | _____________________ | ____________ | Approved / Rejected / Deferred |
| Chief Technology Officer (CTO) | _____________________ | _____________________ | ____________ | Implemented in Simulation |
