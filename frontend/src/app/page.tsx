"use client";

import { useState, useRef, useEffect } from "react";

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

/* ─── Scroll reveal hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.querySelectorAll(".reveal").forEach((c) => c.classList.add("visible")); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function Home() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"video" | "text">("video");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  };

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
      const data = await res.json();
      setResult(data);
      scrollToResults();
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
      const data = await res.json();
      setResult(data);
      scrollToResults();
    } catch (e: any) {
      alert("Audit failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const score = result ? Math.round(result.summary.accessibility_score * 100) : 0;
  const scoreColor = score > 70 ? "var(--accent)" : score > 40 ? "var(--warning)" : "var(--danger)";

  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute w-[400px] h-[250px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px] top-20 right-1/4 pointer-events-none" />
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] text-[var(--muted)] tracking-widest uppercase">AI-Powered Sensory Analysis</span>
          </div>
          <h1 className="text-[clamp(1.8rem,4vw,3rem)] leading-[1.1] tracking-[-0.03em] font-medium">
            Make any space{" "}
            <span className="gradient-text">autism-friendly</span>
          </h1>
          <p className="text-[15px] text-[var(--muted)] mt-4 max-w-[480px] leading-relaxed font-light">
            Upload a video or describe any environment. Our AI analyzes sensory load across visual, auditory, and social dimensions — and tells you exactly what to fix.
          </p>
        </div>
      </section>

      <div className="divider max-w-[900px] mx-auto" />

      {/* Input Section */}
      <section className="py-12 px-6">
        <div className="max-w-[900px] mx-auto">
          <div className="card p-6">
            {/* Mode tabs */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setMode("video")} className={`tab-btn ${mode === "video" ? "active" : ""}`}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Upload Video
                </span>
              </button>
              <button onClick={() => setMode("text")} className={`tab-btn ${mode === "text" ? "active" : ""}`}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                  Describe Space
                </span>
              </button>
            </div>

            {mode === "video" ? (
              <div>
                <p className="text-[13px] text-[var(--muted)] mb-4 font-light">
                  Upload a video walkthrough of any space — office, classroom, hospital, store, restaurant.
                </p>
                {/* Drop zone */}
                <label
                  className="flex flex-col items-center justify-center gap-3 w-full h-40 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)]/30 bg-[var(--bg)] cursor-pointer transition-all group"
                  onClick={() => fileRef.current?.click()}
                >
                  <svg className="w-8 h-8 text-[var(--muted)] group-hover:text-[var(--accent)] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-[13px] text-[var(--muted)] group-hover:text-[var(--text)] transition">
                    {fileName || "Click to upload or drag video file"}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]/60">MP4, MOV, AVI • Max 15 seconds analyzed</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
                <button onClick={handleVideoUpload} disabled={loading || !fileName} className="btn-primary w-full mt-4">
                  {loading ? <LoadingText text="Analyzing sensory environment" /> : "Run Sensory Audit"}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[13px] text-[var(--muted)] mb-4 font-light">
                  Describe the space in detail — lighting, sounds, layout, activity levels, textures.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Example: Open-plan office with fluorescent overhead lights, 30 people talking, printers running, air conditioning humming. Glass walls, bright monitors everywhere. No quiet areas or dimming options."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-[14px] font-light text-[var(--text)] placeholder:text-[var(--muted)]/40 focus:outline-none focus:border-[var(--accent)]/30 transition resize-none leading-relaxed"
                />
                <button onClick={handleTextAudit} disabled={loading || !text.trim()} className="btn-primary w-full mt-4">
                  {loading ? <LoadingText text="Analyzing space description" /> : "Audit This Space"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      {result && (
        <div ref={resultsRef}>
          <div className="divider max-w-[900px] mx-auto" />

          {/* Score Card */}
          <ResultSection>
            <div className="card p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Score ring */}
                <div
                  className="score-ring flex-shrink-0"
                  style={{
                    background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(255,255,255,0.03) 0deg)`,
                  }}
                >
                  <div className="w-[136px] h-[136px] rounded-full bg-[var(--bg)] flex items-center justify-center flex-col">
                    <span className="text-[36px] font-bold tracking-tight" style={{ color: scoreColor }}>{score}</span>
                    <span className="text-[10px] text-[var(--muted)] -mt-1">/ 100</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="reveal">
                    <h2 className="text-[22px] tracking-tight mb-2">Accessibility Score</h2>
                    <p className="text-[14px] text-[var(--muted)] font-light leading-relaxed mb-5">
                      {score > 70
                        ? "This space is reasonably autism-friendly. Minor improvements can make it even better."
                        : score > 40
                          ? "This space has moderate sensory challenges. Several targeted improvements are recommended."
                          : "This space presents significant sensory barriers. Substantial changes are needed for accessibility."}
                    </p>
                  </div>
                  <div className="reveal reveal-delay-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox value={result.summary.high_stress_moments} label="High Stress" color="var(--danger)" />
                    <StatBox value={result.summary.moderate_stress_moments} label="Moderate" color="var(--warning)" />
                    <StatBox value={`${result.summary.peak_stress.toFixed(0)}%`} label="Peak Stress" color="var(--text)" />
                    <StatBox value={`${result.summary.timesteps}s`} label="Analyzed" color="var(--accent)" />
                  </div>
                </div>
              </div>
            </div>
          </ResultSection>

          {/* Stress Timeline */}
          <ResultSection>
            <div className="card p-6">
              <div className="reveal flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[16px] tracking-tight">Sensory Stress Timeline</h3>
                  <p className="text-[12px] text-[var(--muted)] mt-1 font-light">Second-by-second sensory load analysis</p>
                </div>
                <div className="flex gap-4 text-[10px] text-[var(--muted)]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--accent)]" />Low</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--warning)]" />Moderate</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--danger)]" />High</span>
                </div>
              </div>
              <div className="reveal reveal-delay-1 flex items-end gap-[2px] h-36 px-1">
                {result.timeline.map((t, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(t.stress * 100, 2)}%`,
                      background:
                        t.stress > 0.75 ? "var(--danger)" :
                        t.stress > 0.5 ? "var(--warning)" : "var(--accent)",
                      minWidth: "3px",
                      opacity: 0.85,
                      animation: `bar-grow 0.6s ease-out ${i * 0.02}s both`,
                      transformOrigin: "bottom",
                    }}
                    title={`t=${t.time}s — ${(t.stress * 100).toFixed(0)}% stress`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-[var(--muted)] mt-2 px-1">
                <span>0s</span>
                <span>{result.timeline.length}s</span>
              </div>
            </div>
          </ResultSection>

          {/* Flagged Moments */}
          {result.flagged_moments.length > 0 && (
            <ResultSection>
              <div className="card p-6">
                <div className="reveal flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[16px] tracking-tight">Flagged Moments</h3>
                    <p className="text-[12px] text-[var(--muted)] mt-1 font-light">
                      {result.flagged_moments.length} moments exceeded the stress threshold
                    </p>
                  </div>
                  <span className="text-[11px] px-3 py-1 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/15">
                    {result.flagged_moments.length} flagged
                  </span>
                </div>
                <div className="space-y-3">
                  {result.flagged_moments.slice(0, 12).map((fm, i) => (
                    <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 4)} flex gap-4 bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]`}>
                      {/* Media */}
                      <div className="flex gap-2 flex-shrink-0">
                        {fm.video_frame && (
                          <img
                            src={`data:image/jpeg;base64,${fm.video_frame}`}
                            alt={`Frame at ${fm.time}s`}
                            className="w-36 h-22 rounded-lg object-cover"
                          />
                        )}
                        {fm.brain_image && (
                          <img
                            src={`data:image/png;base64,${fm.brain_image}`}
                            alt={`Brain at ${fm.time}s`}
                            className="w-36 h-22 rounded-lg object-cover bg-black/50"
                          />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[13px] font-medium text-white">t = {fm.time}s</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${fm.level === "high" ? "priority-high" : "priority-medium"}`}>
                            {fm.level}
                          </span>
                          <span className="text-[11px] text-[var(--muted)] font-mono">{(fm.stress * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ChannelIcon channel={fm.dominant_channel} />
                          <span className="text-[12px] text-[var(--text)] font-medium capitalize">{fm.dominant_channel}</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] font-light leading-relaxed">
                          {fm.dominant_channel === "visual" && "Bright lights, visual clutter, or rapid movement patterns detected"}
                          {fm.dominant_channel === "auditory" && "Loud sounds, overlapping noise, or sudden audio changes detected"}
                          {fm.dominant_channel === "social" && "Social complexity, crowding, or interpersonal signals detected"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ResultSection>
          )}

          {/* Recommendations */}
          <ResultSection>
            <div className="card p-6">
              <div className="reveal mb-5">
                <h3 className="text-[16px] tracking-tight">Recommendations</h3>
                <p className="text-[12px] text-[var(--muted)] mt-1 font-light">AI-generated suggestions to improve sensory accessibility</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`reveal reveal-delay-${Math.min(i + 1, 4)} bg-[var(--bg)] rounded-xl p-5 border-l-[3px] border border-[var(--border)]`}
                    style={{
                      borderLeftColor: s.priority === "high" ? "var(--danger)" : s.priority === "medium" ? "var(--warning)" : "var(--accent)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-medium text-white">{s.title}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium priority-${s.priority}`}>
                        {s.priority}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[11px] font-light leading-relaxed">
                      <p className="text-[var(--muted)]"><span className="text-[var(--text)] font-normal">Issue:</span> {s.issue}</p>
                      <p className="text-[var(--muted)]"><span className="text-[var(--text)] font-normal">Action:</span> {s.action}</p>
                      <p style={{ color: s.priority === "high" ? "var(--danger)" : s.priority === "medium" ? "var(--warning)" : "var(--accent)" }}>
                        <span className="font-normal">Impact:</span> {s.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResultSection>

          {/* Footer spacer */}
          <div className="h-20" />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-5 px-6">
        <div className="max-w-[900px] mx-auto flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>Sensory Audit by Leeza Care</span>
          <a href="https://leeza.app" className="hover:text-white transition">About</a>
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]" : ""}`}>
      <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--cyan)] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#050507]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <span className="text-[15px] font-medium tracking-tight">
            <span className="gradient-text">Sensory</span>
            <span className="text-[var(--text)]"> Audit</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
          </span>
          <span className="text-[11px] text-[var(--accent)]">Online</span>
        </div>
      </div>
    </nav>
  );
}

function ResultSection({ children }: { children: React.ReactNode }) {
  const ref = useReveal();
  return <section ref={ref} className="py-4 px-6"><div className="max-w-[900px] mx-auto">{children}</div></section>;
}

function StatBox({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[var(--bg)] rounded-xl p-3 text-center border border-[var(--border)]">
      <div className="text-[18px] font-semibold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[var(--muted)] mt-0.5">{label}</div>
    </div>
  );
}

function LoadingText({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}...
    </span>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const cls = "w-3.5 h-3.5 text-[var(--muted)]";
  if (channel === "visual") return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
  if (channel === "auditory") return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m6.364-2.636a9 9 0 000-6.728" /></svg>;
  return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
