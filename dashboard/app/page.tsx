"use client";

import { useState } from "react";
import CityChart from "@/components/CityChart";
import DataTable from "@/components/DataTable";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [chart, setChart] = useState(false);
  const [loading, setLoading] = useState(false);

  async function askAI() {
    setLoading(true);

    const res = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });

    const json = await res.json();

    setReply(json.reply);
    setData(json.data || []);
    setChart(json.chart);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-300 p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI SQL Dashboard
          </h1>
          <p className="text-gray-500">
            Query your database using natural language
          </p>
        </div>

        {/* Prompt Card */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
          <input
            className="border rounded-lg p-3 w-full"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Show top 10 cities by population from my World Database"
          />

          <button
            onClick={askAI}
            className="bg-black text-white px-5 py-2 rounded-lg"
          >
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>

        {/* AI Response */}
        {reply && (
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="font-semibold mb-2 text-gray-800">AI Explanation</h2>
            <p className="text-gray-700">{reply}</p>
          </div>
        )}

        {/* Data Visualization */}
        {chart ? <CityChart data={data} /> : <DataTable data={data} />}
      </div>
    </main>
  );
}
