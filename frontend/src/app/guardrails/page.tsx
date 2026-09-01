"use client";

export default function Guardrails() {
  return (
    <div className="p-10 max-w-5xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Policy Engine Guardrails</h1>
        <p className="text-gray-400">Metrics on interventions blocked by the 11-gate policy engine.</p>
      </header>

      <div className="bg-[#18181B] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Gate ID</th>
              <th className="p-4 font-medium">Description</th>
              <th className="p-4 font-medium">Blocks (Simulated)</th>
              <th className="p-4 font-medium">Value Protected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            <tr className="hover:bg-gray-800/50">
              <td className="p-4 font-mono text-gray-300">G01_CONSENT</td>
              <td className="p-4 text-gray-400">Opt-out / DND registry enforcement</td>
              <td className="p-4 font-mono text-red-400">12</td>
              <td className="p-4 font-mono text-green-400">Compliance Risk</td>
            </tr>
            <tr className="hover:bg-gray-800/50">
              <td className="p-4 font-mono text-gray-300">G06_AMOUNT_BAND</td>
              <td className="p-4 text-gray-400">Cost exceeds 15% of risk amount</td>
              <td className="p-4 font-mono text-red-400">15</td>
              <td className="p-4 font-mono text-green-400">₹45.00</td>
            </tr>
            <tr className="hover:bg-gray-800/50">
              <td className="p-4 font-mono text-gray-300">G08_ISSUER_HEALTH</td>
              <td className="p-4 text-gray-400">Holding retries during bank downtime</td>
              <td className="p-4 font-mono text-red-400">42</td>
              <td className="p-4 font-mono text-green-400">Attempts Saved</td>
            </tr>
            <tr className="hover:bg-gray-800/50">
              <td className="p-4 font-mono text-gray-300">G09_DUPLICATE_PAYMENT</td>
              <td className="p-4 text-gray-400">Order already paid via another method</td>
              <td className="p-4 font-mono text-red-400">8</td>
              <td className="p-4 font-mono text-green-400">Customer Trust</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
