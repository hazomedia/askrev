'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Receipt,
  GitBranch,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';

export default function SimulatorPage() {
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Binary Match Simulator Inputs
  const [leftUnits, setLeftUnits] = useState(12);
  const [rightUnits, setRightUnits] = useState(25);
  const [prevCarryLeft, setPrevCarryLeft] = useState(0);
  const [prevCarryRight, setPrevCarryRight] = useState(0);
  const [binaryResult, setBinaryResult] = useState<any>(null);

  useEffect(() => {
    runCanonicalSimulation();
    calculateBinaryMatching();
  }, []);

  const runCanonicalSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await fetchApi('/simulation/canonical-scenario');
      setSimulationResult(data);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  };

  const calculateBinaryMatching = async () => {
    try {
      const res: any = await fetchApi('/simulation/binary-matching', {
        method: 'POST',
        body: JSON.stringify({
          leftUnits: Number(leftUnits),
          rightUnits: Number(rightUnits),
          previousCarryLeft: Number(prevCarryLeft),
          previousCarryRight: Number(prevCarryRight),
          isBeneficiaryQualified: true,
          todayMatchesAlreadySettled: 0,
        }),
      });
      setBinaryResult(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#253247] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              <span>Internal Verification Testbench</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#253247] mt-2">
              Commission Ledger & Binary Matching Simulator
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Simulates hold reserves, upgrade reconciliations, and double-entry accounting in SIMULATION_ONLY mode.
            </p>
          </div>

          <button
            onClick={runCanonicalSimulation}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{loading ? 'Simulating...' : 'Re-Run Canonical Scenario (A → B, C, D, E)'}</span>
          </button>
        </div>

        {/* Compliance Advisory */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <span className="font-bold">Compliance & Safety Safeguard:</span> All calculations below are internal mathematical simulations. Live payouts, network commissions, and banking releases are strictly disabled under the Consumer Protection (Direct Selling) Rules, 2021.
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium">
            {error}
          </div>
        )}

        {/* SECTION 1: Master Prompt Section 5 Results */}
        {simulationResult && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                  Scenario Execution
                </span>
                <h2 className="text-base font-bold text-[#253247] mt-0.5">
                  Sponsor A Sponsoring 4 Members (B, C, D, E) & Upgrades
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center gap-1.5 self-start">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Double-Entry Balanced: 100%</span>
              </span>
            </div>

            {/* Final State Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Available Earnings</div>
                <div className="text-xl font-bold text-[#15803D] mt-1">
                  ₹{simulationResult.finalWalletState.availableEarningsINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹3k base + ₹9k D upgrade</div>
              </div>

              <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Hold Reserve Balance</div>
                <div className="text-xl font-bold text-amber-600 mt-1">
                  ₹{simulationResult.finalWalletState.heldCommissionsINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹1,000 released on 2nd direct</div>
              </div>

              <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Shopping Voucher</div>
                <div className="text-xl font-bold text-[#165DAD] mt-1">
                  ₹{simulationResult.finalWalletState.shoppingVoucherINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Issued on E upgrade</div>
              </div>

              <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Pending Recovery</div>
                <div className="text-xl font-bold text-slate-700 mt-1">
                  ₹{simulationResult.finalWalletState.pendingRecoveryINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Fully reconciled (₹0 left)</div>
              </div>
            </div>

            {/* Step-by-Step Journal Timeline */}
            <div>
              <h3 className="text-sm font-bold text-[#253247] mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#165DAD]" />
                <span>Step-by-Step Ledger Journal Entries</span>
              </h3>

              <div className="space-y-3">
                {simulationResult.events.map((evt: any) => (
                  <div key={evt.step} className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-[#165DAD] font-bold flex items-center justify-center text-[10px] border border-blue-200">
                          {evt.step}
                        </span>
                        <span className="font-bold text-[#253247]">{evt.description}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-500">Wallet: ₹{evt.resultingWalletState.availableEarningsINR}</span>
                        <span>•</span>
                        <span className="text-amber-700">Hold: ₹{evt.resultingWalletState.heldCommissionsINR}</span>
                        <span>•</span>
                        <span className="text-[#165DAD]">Voucher: ₹{evt.resultingWalletState.shoppingVoucherINR}</span>
                      </div>
                    </div>

                    {/* Double-entry lines */}
                    <div className="overflow-x-auto pt-1">
                      <table className="w-full text-left text-[11px]">
                        <thead className="text-slate-500 border-b border-slate-200 bg-white">
                          <tr>
                            <th className="py-1 px-2 font-semibold">Account</th>
                            <th className="py-1 px-2 font-semibold">Description</th>
                            <th className="py-1 px-2 font-semibold text-right">Debit (₹)</th>
                            <th className="py-1 px-2 font-semibold text-right">Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[#253247]">
                          {evt.journalLines.map((line: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1 px-2 font-mono text-[#165DAD]">{line.account}</td>
                              <td className="py-1 px-2 text-slate-600">{line.description}</td>
                              <td className="py-1 px-2 text-right font-mono font-medium text-[#15803D]">
                                {line.debitINR > 0 ? `₹${line.debitINR.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="py-1 px-2 text-right font-mono font-medium text-amber-700">
                                {line.creditINR > 0 ? `₹${line.creditINR.toLocaleString('en-IN')}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Binary Matching Simulator */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                Algorithm Testbench
              </span>
              <h2 className="text-base font-bold text-[#253247] mt-0.5">
                Binary Matching & Daily Capping Simulator
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Ratio: 1:2 or 2:1
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Left Units</label>
              <input
                type="number"
                min={0}
                value={leftUnits}
                onChange={(e) => setLeftUnits(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-slate-200 text-[#253247] text-xs focus:outline-none focus:border-[#165DAD] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Right Units</label>
              <input
                type="number"
                min={0}
                value={rightUnits}
                onChange={(e) => setRightUnits(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-slate-200 text-[#253247] text-xs focus:outline-none focus:border-[#165DAD] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Previous Left Carry</label>
              <input
                type="number"
                min={0}
                value={prevCarryLeft}
                onChange={(e) => setPrevCarryLeft(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-slate-200 text-[#253247] text-xs focus:outline-none focus:border-[#165DAD] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Previous Right Carry</label>
              <input
                type="number"
                min={0}
                value={prevCarryRight}
                onChange={(e) => setPrevCarryRight(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-slate-200 text-[#253247] text-xs focus:outline-none focus:border-[#165DAD] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={calculateBinaryMatching}
              className="px-4 py-2 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors"
            >
              Calculate Matching Units
            </button>
          </div>

          {binaryResult && (
            <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Matches Consumed</div>
                <div className="text-xl font-bold text-[#165DAD] mt-0.5">
                  {binaryResult.matchesConsumed} matches
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Cap: 15/day ({binaryResult.cappedOutMatches} capped)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Proposed Reward</div>
                <div className="text-xl font-bold text-[#15803D] mt-0.5">
                  ₹{binaryResult.proposedRewardINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹3,000 / match</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">New Left Carry</div>
                <div className="text-xl font-bold text-[#253247] mt-0.5">
                  {binaryResult.newCarryLeft} units
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Used: {binaryResult.leftUnitsUsed}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">New Right Carry</div>
                <div className="text-xl font-bold text-[#253247] mt-0.5">
                  {binaryResult.newCarryRight} units
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Used: {binaryResult.rightUnitsUsed}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}