"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");

  const ask = async () => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setReply(data.reply);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>AI + MCP + MySQL Dashboard</h1>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something..."
        style={{ width: "100%", padding: 10 }}
      />

      <button onClick={ask} style={{ marginTop: 10 }}>
        Ask
      </button>

      <pre style={{ marginTop: 20 }}>{reply}</pre>
    </main>
  );
}

// pie chart, bar chart, line chart, table, etc. based on AI response structure. Use libraries like Chart.js or D3.js for visualization.
