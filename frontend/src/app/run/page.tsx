"use client";

import { useState } from "react";
import { runBatch } from "@/lib/api";

export default function LiveBatch() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRun = async () => {
    setRunning(true);
    setResults(null);
    try {
      const res = await runBatch();
      setResults(res);
    } catch (e) {
      console.error(e);
      alert("Failed to run batch");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-10 max-w-5xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Live Batch Execution</h1>
        <p className="text-gray-400">Run the orchestrator across all open cases.</p>
      </header>

      <div className="bg-[#18181B] border border-gray-800 rounded-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white">Execution Pipeline</h2>
            <p className="text-gray-500 text-sm mt-1">Detector → Classifier → Policy Gates → Ladder → LLM → Ledger</p>
          </div>
          <button 
            onClick={handleRun}
            disabled={running}
            className={`px-6 py-2 rounded font-medium ${running ? 'bg-gray-700 text-gray-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {running ? "Processing..." : "Run Batch"}
          </button>
        </div>

        {running && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-400 font-mono">
              <span>Processing cases...</span>
              <span className="animate-pulse text-blue-400">Running</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-8 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
            <h3 className="text-green-400 font-bold mb-2">Batch Complete</h3>
            <div className="text-gray-300 font-mono text-sm">
              Processed in {results.duration_seconds} seconds. <br/>
              Check the Command Center for updated metrics.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
