"use client";

import { useEffect, useState } from "react";
import { fetchStats } from "@/lib/api";

export default function CommandCenter() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(s => {
      setStats(s);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Loading Command Center...</div>;
  if (!stats) return <div className="p-8 text-red-400">Failed to load stats. Is the backend running?</div>;

  return (
    <div className="p-10 max-w-5xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Command Center</h1>
        <p className="text-gray-400">System-wide overview of recovery performance and anomalies.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard title="At Risk" value={`₹${stats.at_risk_rupees.toLocaleString()}`} color="text-red-400" />
        <StatCard title="Recovered" value={`₹${stats.recovered_rupees.toLocaleString()}`} color="text-green-400" />
        <StatCard title="Net Lift" value={`+${stats.net_lift_pp}%`} color="text-blue-400" sub="vs Control" />
        <StatCard title="ROI" value={`${stats.roi.toFixed(1)}x`} color="text-purple-400" sub={`Cost: ₹${stats.intervention_cost_rupees.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#18181B] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">A/B Test Outcomes</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Treatment Recovery Rate</span>
                <span className="font-mono">{stats.treatment_recovery_rate}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.treatment_recovery_rate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Control Recovery Rate (Baseline)</span>
                <span className="font-mono">{stats.control_recovery_rate}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div className="bg-gray-600 h-2 rounded-full" style={{ width: `${stats.control_recovery_rate}%` }}></div>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-gray-800">
              <div className="text-sm text-gray-400">Incremental Revenue</div>
              <div className="text-2xl font-mono text-green-400">₹{stats.incremental_rupees.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="bg-[#18181B] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Issuer Health Watch</h2>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800 mb-2">
            <span className="text-gray-300">HDFC Bank</span>
            <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">Degraded Window (Simulated)</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800 mb-2">
            <span className="text-gray-300">ICICI Bank</span>
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">Healthy</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800">
            <span className="text-gray-300">SBI</span>
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">Healthy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, sub }: { title: string, value: string, color: string, sub?: string }) {
  return (
    <div className="bg-[#18181B] border border-gray-800 rounded-lg p-5">
      <div className="text-gray-400 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold font-mono tracking-tighter ${color}`}>{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-2">{sub}</div>}
    </div>
  );
}
