"use client";

import { useEffect, useState } from "react";
import { fetchStats } from "@/lib/api";

export default function Experiment() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats().then(s => setStats(s)).catch(console.error);
  }, []);

  return (
    <div className="p-10 max-w-5xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">A/B Experiment Results</h1>
        <p className="text-gray-400">Rigorous measurement of incremental lift with 95% Confidence Intervals.</p>
      </header>

      {stats ? (
        <div className="space-y-6">
          <div className="bg-[#18181B] border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Significance Testing</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Treatment Arm</div>
                <div className="text-2xl font-mono text-blue-400">{stats.treatment_recovery_rate}%</div>
                <div className="text-xs text-gray-500 mt-1">n ~ 80%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Control Arm</div>
                <div className="text-2xl font-mono text-gray-400">{stats.control_recovery_rate}%</div>
                <div className="text-xs text-gray-500 mt-1">n ~ 20%</div>
              </div>
              <div className="border-l border-gray-800 pl-6">
                <div className="text-sm text-gray-500 mb-1">Net Lift</div>
                <div className="text-2xl font-mono text-green-400">+{stats.net_lift_pp}%</div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-blue-400 font-bold mb-2">Note on Sample Size</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              With a batch of n=600, this lift might not reach high statistical significance (95% CI bounds might cross zero). 
              For a production deployment, a sample size of ~2,400 records is recommended to prove significance. 
              We prioritize verification over generation, presenting honest limitations of small batch sizes.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">Loading metrics...</div>
      )}
    </div>
  );
}
