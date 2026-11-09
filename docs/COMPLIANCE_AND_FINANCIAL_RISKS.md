# ASKR EV — Regulatory Compliance, Financial Risk Assessment & Legal Guardrails

**Document Version:** 1.0 (Phase 1 Baseline)  
**Status:** MANDATORY LEGAL NOTICE — SIMULATION & STAGING AUDIT ONLY  
**Jurisdiction:** Republic of India  
**Applicable Frameworks:** Consumer Protection Act, 2019; Consumer Protection (Direct Selling) Rules, 2021; Prize Chits and Money Circulation Schemes (Banning) Act, 1978; Central Goods and Services Tax (CGST) Act, 2017; Income Tax Act, 1961 (Sections 194H, 194R).

---

## 1. Executive Summary & Strict Engineering Controls

This document establishes the mandatory compliance posture and financial risk evaluation for the **ASKR EV Platform**. 

> [!CAUTION]
> **LIVE PAYOUTS, MLM RECRUITMENT COMMISSIONS, AND VOUCHER CASH-OUTS ARE CURRENTLY DISABLED IN SYSTEM CODE.**  
> The system operates strictly in `COMPLIANCE_MODE=SIMULATION_ONLY`. Under no circumstances should real money commissions, automatic withdrawal approvals, or live binary matching payouts be initiated without formal written clearance from qualified Indian legal counsel and chartered accountants.

---

## 2. Indian Legal Framework & Direct Selling Regulations

### 2.1 Consumer Protection (Direct Selling) Rules, 2021
Under the *Consumer Protection (Direct Selling) Rules, 2021*, every direct selling entity must comply with explicit prohibitions:
1. **Ban on Pyramid Schemes (Rule 10(a)):** No direct selling entity or direct seller shall promote a Pyramid Scheme or enroll any person to such scheme or participate in such arrangement in any manner.
2. **Ban on Money Circulation (Rule 10(b)):** Participation in money circulation schemes under the guise of direct selling is strictly illegal under the *Prize Chits and Money Circulation Schemes (Banning) Act, 1978*.
3. **Mandatory Product / Service Retail Delivery (Rule 5(1)):** Direct selling entities must have genuine underlying goods or services with legitimate retail utility. Remuneration must be primarily derived from the sale of goods/services to genuine consumers, **not** from mere enrollment or subscription fees of downline participants.
4. **Mandatory Cooling-off / Refund Period (Rule 5(3)):** Every participant must be granted a cooling-off period during which they can cancel their contract and receive a full refund with no arbitrary deductions.
5. **Buy-Back / Inventory Repurchase Guarantee (Rule 5(4)):** The entity must provide an unconditional repurchase policy for currently marketable inventory or unused service vouchers.

### 2.2 Distinguishing Genuine Commercial Value from Disguised Enrollment Schemes
- **Basic Membership (₹3,000):** If ₹3,000 is charged purely for platform access and immediately triggers a ₹1,000 sponsor distribution without delivery of tangible economic goods/services, regulatory authorities may categorize it as an unlawful money circulation scheme.
- **Full Membership (₹33,000):** Comprises ₹3,000 platform fee and ₹30,000 Shopping Vouchers. For this structure to be legally defendable:
  - The ₹30,000 shopping voucher must be fully redeemable on genuine, fairly priced products/services without deceptive barriers or impossible minimum basket values.
  - EV bikes and accessories must be commercially available at standard market rates.

---

## 3. Financial Sustainability & Mathematical Viability (Unit Economics)

### 3.1 Platform Inflow vs. Maximum Outflow Breakdown
The proposed reward matrix creates significant financial obligations:
1. **Full Membership Inflow:** ₹33,000 (Gross).
2. **Sponsor Direct Commission:**
   - 1st Full Qualified Direct: ₹10,000 cash entitlement.
   - 2nd Full Qualified Direct: ₹30,000 Shopping Voucher liability + ₹1,000 hold release - ₹1,000 recovery.
   - 3rd+ Full Qualified Direct: ₹10,000 cash entitlement each.
3. **Binary Matching Reward:**
   - ₹3,000 per match (1:2 or 2:1 ratio).
   - Daily cap of 15 matches = ₹45,000 maximum daily liability per qualifying distributor.

### 3.2 Vulnerability to System Insolvency
- If 100 members generate 50 matches daily, daily matching expense = ₹1,50,000.
- If platform revenue depends solely on joining fees rather than continuous high-margin retail EV bike sales and service revenues, binary matching incentives will inevitably outpace company reserves, leading to structural insolvency.
- **Mitigation in Phase 1:** Binary matching rewards are modeled as non-disbursing ledger simulations. Flush and carry-forward formulas are isolated in configurable modules pending actuarial review.

---

## 4. Taxation, TDS, and GST Architecture

### 4.1 Goods and Services Tax (GST)
- **18% GST on Platform Fees:** ₹3,000 platform fee attracts 18% GST (₹457.63 tax component). The net platform revenue is ₹2,542.37.
- Paying ₹1,000 commission out of a net ₹2,542.37 represents a 39.3% commission rate on net joining revenue.
- **Vouchers & Actionable Claims:** Under GST Law, vouchers are actionable claims. Tax liability on voucher issuance vs. voucher redemption depends on whether the underlying supply is identifiable at the time of issue (Section 12(4) of the CGST Act).

### 4.2 Tax Deducted at Source (TDS)
- **Section 194H (Commission or Brokerage):** Direct selling commissions paid to resident individuals are subject to 5% TDS when exceeding ₹15,000 in a financial year.
- **Section 194R (Benefit or Perquisite in Business):** Shopping vouchers or promotional incentives provided to distributors may be classified as business perquisites, attracting 10% TDS under Section 194R if exceeding ₹20,000 aggregate per recipient annually.

---

## 5. Shopping Voucher Accounting & Liability Management

- Vouchers **must never be directly converted to cash** or transferred to the withdrawable earnings wallet.
- Outstanding vouchers must be accounted for as **Current Liabilities** (`Account 2100 - Shopping Voucher Liability`) on the platform balance sheet until redeemed or forfeited according to clear statutory expiration terms.
- Expiration dates must comply with the RBI Master Directions on Prepaid Payment Instruments (PPIs) where applicable.

---

## 6. Pre-Requisite Sign-Offs Before Production Activation

Before toggling `ENABLE_LIVE_PAYOUTS=true` or accepting real banking transactions:
1. **Legal Opinion Letter:** Written certification by a practicing High Court / Supreme Court advocate specializing in direct selling law affirming compliance with Rule 10 of Consumer Protection (Direct Selling) Rules 2021.
2. **Chartered Accountant Viability Audit:** Stress-testing of the binary tree matching payouts under worst-case network depth scenarios (actuarial run).
3. **GST Tax Structure Memorandum:** Formal confirmation of tax point timing for ₹30,000 voucher credits.
4. **Bank KYC & Payout Escrow Agreement:** Formal escrow setup with an RBI-licensed payment aggregator.

---

*Authored by Antigravity Engineering & FinTech Architecture Team for ASKR EV.*
