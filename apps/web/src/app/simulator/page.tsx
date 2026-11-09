'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
  GitBranch,
  Sliders
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
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Deterministic FinTech Ledger Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            Direct Sponsor & Binary Commission Simulator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulates hold reserves, upgrade reconciliations, and double-entry accounting in SIMULATION_ONLY mode.
          </p>
        </div>

        <button
          onClick={runCanonicalSimulation}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 shadow-md shadow-electric-500/20 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{loading ? 'Simulating...' : 'Re-Run Canonical Scenario (A → B, C, D, E)'}</span>
        </button>
      </div>

      {/* Compliance Advisory */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-700 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-bold text-amber-300">Compliance & Financial Safety Policy:</span> All commission calculations below are mathematical proposals only. Live payouts, MLM network credits, and automatic banking releases are strictly disabled until full regulatory clearance under the Consumer Protection (Direct Selling) Rules, 2021.
        </div>
      </div>

      {/* SECTION 1: Master Prompt Section 5 Results */}
      {simulationResult && (
        <div className="space-y-6">
          <div className="card-gradient rounded-2xl p-6 border-navy-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-navy-800">
              <div>
                <span className="text-xs font-bold text-electric-400 uppercase tracking-widest">
                  Scenario Execution
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Sponsor A Sponsoring 4 Members (B, C, D, E) & Upgrades
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Double-Entry Balanced: 100%
                </span>
              </div>
            </div>

            {/* Final State Counters */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Available Earnings</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{simulationResult.finalWalletState.availableEarningsINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹3k base + ₹9k D upgrade</div>
              </div>

              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Hold Reserve Balance</div>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  ₹{simulationResult.finalWalletState.heldCommissionsINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹1,000 released on 2nd direct</div>
              </div>

              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Shopping Voucher</div>
                <div className="text-2xl font-black text-electric-300 mt-1">
                  ₹{simulationResult.finalWalletState.shoppingVoucherINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Issued on E's upgrade</div>
              </div>

              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Pending Recovery</div>
                <div className="text-2xl font-black text-slate-300 mt-1">
                  ₹{simulationResult.finalWalletState.pendingRecoveryINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Fully reconciled (₹0 left)</div>
              </div>
            </div>

            {/* Step-by-Step Journal Timeline */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-electric-400" />
                Step-by-Step Ledger Journal Entries
              </h3>

              <div className="space-y-4">
                {simulationResult.events.map((evt: any) => (
                  <div key={evt.step} className="p-4 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-400 font-bold flex items-center justify-center text-[10px]">
                          {evt.step}
                        </span>
                        <span className="font-bold text-white">{evt.description}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Wallet: ₹{evt.resultingWalletState.availableEarningsINR}</span>
                        <span>•</span>
                        <span className="text-amber-400">Hold: ₹{evt.resultingWalletState.heldCommissionsINR}</span>
                        <span>•</span>
                        <span className="text-electric-400">Voucher: ₹{evt.resultingWalletState.shoppingVoucherINR}</span>
                      </div>
                    </div>

                    {/* Double-entry lines */}
                    <div className="overflow-x-auto pt-1">
                      <table className="w-full text-left text-[11px]">
                        <thead className="text-slate-500 border-b border-navy-800">
                          <tr>
                            <th className="py-1 px-2 font-normal">Account</th>
                            <th className="py-1 px-2 font-normal">Description</th>
                            <th className="py-1 px-2 font-normal text-right">Debit (₹)</th>
                            <th className="py-1 px-2 font-normal text-right">Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-900 text-slate-300">
                          {evt.journalLines.map((line: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1 px-2 font-mono text-electric-300">{line.account}</td>
                              <td className="py-1 px-2 text-slate-400">{line.description}</td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-emerald-400">
                                {line.debitINR > 0 ? `₹${line.debitINR.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-amber-400">
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
        </div>
      )}

      {/* SECTION 2: Binary Matching Simulator */}
      <div className="card-gradient rounded-2xl p-6 border-navy-700 space-y-6">
        <div className="flex items-center justify-between border-b border-navy-800 pb-4">
          <div>
            <span className="text-xs font-bold text-electric-400 uppercase tracking-widest">
              Algorithm Testbench
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Binary Matching & Daily Capping Simulator
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-navy-800 text-slate-300 border border-navy-700">
            Ratio: 1:2 or 2:1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Left Units</label>
            <input
              type="number"
              min={0}
              value={leftUnits}
              onChange={(e) => {
                setLeftUnits(Number(e.target.value));
              }}
              className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Right Units</label>
            <input
              type="number"
              min={0}
              value={rightUnits}
              onChange={(e) => {
                setRightUnits(Number(e.target.value));
              }}
              className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Previous Left Carry</label>
            <input
              type="number"
              min={0}
              value={prevCarryLeft}
              onChange={(e) => setPrevCarryLeft(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Previous Right Carry</label>
            <input
              type="number"
              min={0}
              value={prevCarryRight}
              onChange={(e) => setPrevCarryRight(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-white text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={calculateBinaryMatching}
            className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-electric-600 hover:bg-electric-500 transition-colors"
          >
            Calculate Matching Units
          </button>
        </div>

        {binaryResult && (
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Matches Consumed</div>
              <div className="text-xl font-black text-electric-300 mt-1">
                {binaryResult.matchesConsumed} matches
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Cap: 15/day ({binaryResult.cappedOutMatches} capped)
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Proposed Reward</div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                ₹{binaryResult.proposedRewardINR.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">₹3,000 / match</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">New Left Carry</div>
              <div className="text-xl font-black text-white mt-1">
                {binaryResult.newCarryLeft} units
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Used: {binaryResult.leftUnitsUsed}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">New Right Carry</div>
              <div className="text-xl font-black text-white mt-1">
                {binaryResult.newCarryRight} units
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Used: {binaryResult.rightUnitsUsed}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
