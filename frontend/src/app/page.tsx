"use client";

import { useState, useRef } from "react";

const API = "https://neurobrain-api.eastus.cloudapp.azure.com";

type AuditResult = {
  summary: {
    duration_seconds: number;
    timesteps: number;
    accessibility_score: number;
    average_stress: number;
    peak_stress: number;
    high_stress_moments: number;
    moderate_stress_moments: number;
    dominant_stressors: Record<string, number>;
  };
  timeline: { time: number; stress: number; visual: number; auditory: number; social: number }[];
  flagged_moments: {
    time: number;
    level: string;
    stress: number;
    dominant_channel: string;
    brain_image?: string;
    video_frame?: string;
  }[];
  suggestions: { title: string; issue: string; action: string; impact: string; priority: string }[];
};

export default function Home() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"video" | "text">("video");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/api/audit/video`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) {
      alert("Audit failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTextAudit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("text", text);
      const res = await fetch(`${API}/api/audit/text`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) {
      alert("Audit failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-[var(--accent)]">Sensory</span> Audit
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Make any space autism-friendly with AI
            </p>
          </div>
          <span className="text-xs text-[var(--muted)]">Powered by TRIBE v2 + ABIDE</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Input Section */}
        <div className="glass p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode("video")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === "video" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
              }`}
            >
              Upload Video
            </button>
            <button
              onClick={() => setMode("text")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === "text" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
              }`}
            >
              Describe Space
            </button>
          </div>

          {mode === "video" ? (
            <div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Upload a video walkthrough of any space (office, classroom, hospital, store)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="w-full bg-[var(--bg)] border border-white/10 rounded-xl p-4 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:text-white"
              />
              <button
                onClick={handleVideoUpload}
                disabled={loading}
                className="mt-4 w-full py-3 bg-[var(--accent)] rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                {loading ? "Analyzing space... (this takes a few minutes)" : "Run Sensory Audit"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Describe the space in detail: lighting, sounds, layout, activity
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Example: Open office with fluorescent overhead lights, 30 people talking, printers running, air conditioning humming. Glass walls, bright monitors everywhere. No quiet areas."
                className="w-full bg-[var(--bg)] border border-white/10 rounded-xl p-4 text-sm placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)] resize-none"
              />
              <button
                onClick={handleTextAudit}
                disabled={loading || !text.trim()}
                className="mt-4 w-full py-3 bg-[var(--accent)] rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                {loading ? "Analyzing..." : "Audit This Space"}
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Score Card */}
            <div className="glass p-6">
              <div className="flex items-center gap-8">
                <div
                  className="score-ring"
                  style={{
                    background: `conic-gradient(${
                      result.summary.accessibility_score > 0.7
                        ? "var(--accent)"
                        : result.summary.accessibility_score > 0.4
                          ? "var(--warning)"
                          : "var(--danger)"
                    } ${result.summary.accessibility_score * 360}deg, var(--bg) 0deg)`,
                  }}
                >
                  <div className="w-[120px] h-[120px] rounded-full bg-[var(--card)] flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold">
                      {Math.round(result.summary.accessibility_score * 100)}
                    </span>
                    <span className="text-xs text-[var(--muted)]">/ 100</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">Accessibility Score</h2>
                  <p className="text-sm text-[var(--muted)] mb-4">
                    {result.summary.accessibility_score > 0.7
                      ? "This space is reasonably autism-friendly with minor improvements needed."
                      : result.summary.accessibility_score > 0.4
                        ? "This space has moderate sensory challenges. Several improvements recommended."
                        : "This space has significant sensory barriers. Major changes needed."}
                  </p>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-[var(--bg)] rounded-lg p-2">
                      <div className="text-lg font-bold text-[var(--warning)]">{result.summary.high_stress_moments}</div>
                      <div className="text-xs text-[var(--muted)]">High Stress</div>
                    </div>
                    <div className="bg-[var(--bg)] rounded-lg p-2">
                      <div className="text-lg font-bold text-[var(--accent2)]">{result.summary.moderate_stress_moments}</div>
                      <div className="text-xs text-[var(--muted)]">Moderate</div>
                    </div>
                    <div className="bg-[var(--bg)] rounded-lg p-2">
                      <div className="text-lg font-bold">{result.summary.peak_stress.toFixed(0)}%</div>
                      <div className="text-xs text-[var(--muted)]">Peak Stress</div>
                    </div>
                    <div className="bg-[var(--bg)] rounded-lg p-2">
                      <div className="text-lg font-bold">{result.summary.timesteps}s</div>
                      <div className="text-xs text-[var(--muted)]">Analyzed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stress Timeline */}
            <div className="glass p-6">
              <h3 className="text-lg font-semibold mb-4">Sensory Stress Timeline</h3>
              <div className="flex items-end gap-[2px] h-32">
                {result.timeline.map((t, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${t.stress * 100}%`,
                      background:
                        t.stress > 0.75 ? "var(--danger)" :
                        t.stress > 0.5 ? "var(--warning)" : "var(--accent)",
                      minWidth: "4px",
                    }}
                    title={`t=${t.time}s stress=${(t.stress * 100).toFixed(0)}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-[var(--muted)] mt-2">
                <span>0s</span>
                <span className="flex gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[var(--accent)]" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[var(--warning)]" />Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[var(--danger)]" />High</span>
                </span>
                <span>{result.timeline.length}s</span>
              </div>
            </div>

            {/* Flagged Moments */}
            {result.flagged_moments.length > 0 && (
              <div className="glass p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Flagged Moments ({result.flagged_moments.length})
                </h3>
                <div className="space-y-4">
                  {result.flagged_moments.map((fm, i) => (
                    <div key={i} className="flex gap-4 bg-[var(--bg)] rounded-xl p-4">
                      {/* Video frame */}
                      {fm.video_frame && (
                        <img
                          src={`data:image/jpeg;base64,${fm.video_frame}`}
                          alt={`Frame at ${fm.time}s`}
                          className="w-40 h-24 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      {/* Brain image */}
                      {fm.brain_image && (
                        <img
                          src={`data:image/png;base64,${fm.brain_image}`}
                          alt={`Brain at ${fm.time}s`}
                          className="w-40 h-24 rounded-lg object-cover flex-shrink-0 bg-black"
                        />
                      )}
                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">t = {fm.time}s</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: fm.level === "high" ? "var(--danger)" : "var(--warning)",
                              color: "white",
                            }}
                          >
                            {fm.level} stress
                          </span>
                        </div>
                        <p className="text-sm text-[var(--muted)]">
                          Stress score: {(fm.stress * 100).toFixed(0)}% — Dominant: <strong>{fm.dominant_channel}</strong>
                        </p>
                        <p className="text-xs text-[var(--muted)] mt-1">
                          {fm.dominant_channel === "visual" && "Bright lights, visual clutter, or rapid movement detected"}
                          {fm.dominant_channel === "auditory" && "Loud sounds, background noise, or sudden audio changes detected"}
                          {fm.dominant_channel === "social" && "Social complexity or crowding signals detected"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            <div className="glass p-6">
              <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="bg-[var(--bg)] rounded-xl p-4 border-l-4" style={{
                    borderColor: s.priority === "high" ? "var(--danger)" : s.priority === "medium" ? "var(--warning)" : "var(--accent)",
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{s.title}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: s.priority === "high" ? "rgba(239,68,68,0.15)" : s.priority === "medium" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                        color: s.priority === "high" ? "var(--danger)" : s.priority === "medium" ? "var(--warning)" : "var(--accent)",
                      }}>
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-1"><strong>Issue:</strong> {s.issue}</p>
                    <p className="text-xs text-[var(--muted)] mb-1"><strong>Action:</strong> {s.action}</p>
                    <p className="text-xs text-[var(--accent)]"><strong>Impact:</strong> {s.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
