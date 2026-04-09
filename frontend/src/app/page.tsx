"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

const API = "https://neurobrain-api.eastus.cloudapp.azure.com";

type AuditResult = {
  summary: { duration_seconds: number; timesteps: number; accessibility_score: number; average_stress: number; peak_stress: number; high_stress_moments: number; moderate_stress_moments: number; dominant_stressors: Record<string, number> };
  timeline: { time: number; stress: number; visual: number; auditory: number; social: number }[];
  flagged_moments: { time: number; level: string; stress: number; dominant_channel: string; brain_image?: string; video_frame?: string }[];
  suggestions: { title: string; issue: string; action: string; impact: string; priority: string }[];
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.querySelectorAll(".reveal").forEach((c) => c.classList.add("visible")); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function S({ children, id }: { children: ReactNode; id?: string }) {
  const ref = useReveal();
  return <section ref={ref} id={id} className="py-16 px-6">{children}</section>;
}

function Dv() { return <div className="h-px bg-[var(--border)] max-w-[1024px] mx-auto" />; }

export default function Home() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"video" | "text">("video");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/api/audit/video`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) { alert("Audit failed: " + e.message); }
    finally { setLoading(false); }
  };

  const handleTextAudit = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const form = new FormData();
      form.append("text", text);
      const res = await fetch(`${API}/api/audit/text`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) { alert("Audit failed: " + e.message); }
    finally { setLoading(false); }
  };

  const score = result ? Math.round(result.summary.accessibility_score * 100) : 0;
  const scoreColor = score > 70 ? "var(--green)" : score > 40 ? "var(--warning)" : "var(--danger)";

  return (
    <main>
      <Nav />

      {/* Hero */}
      <section className="relative pt-24 pb-12 px-6">
        <div className="absolute w-[500px] h-[300px] rounded-full bg-[#7c6aff] opacity-[0.04] blur-[100px] top-16 right-1/4 pointer-events-none" />
        <div className="relative max-w-[1024px] mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] text-[var(--muted)] tracking-widest uppercase">AI-Powered Sensory Analysis</span>
          </div>
          <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.1] tracking-[-0.03em] font-medium">
            Make any space <span className="gradient-text">autism-friendly</span>
          </h1>
          <p className="text-[15px] text-[var(--muted)] mt-4 max-w-[480px] leading-relaxed font-light">
            Upload a video or describe any environment. Our AI analyzes sensory load across visual, auditory, and social dimensions — and tells you exactly what to fix.
          </p>
        </div>
      </section>

      <Dv />

      {/* Input */}
      <S>
        <div className="max-w-[1024px] mx-auto">
          <div className="card p-6">
            <div className="flex gap-2 mb-6">
              {(["video", "text"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`text-[13px] px-4 py-2 rounded-lg transition ${mode === m ? "bg-white/10 text-white" : "text-[var(--muted)] hover:text-white"}`}>
                  {m === "video" ? "Upload Video" : "Describe Space"}
                </button>
              ))}
            </div>

            {mode === "video" ? (
              <div>
                <p className="text-[13px] text-[var(--muted)] mb-4 font-light">Upload a video walkthrough of any space — office, classroom, hospital, store.</p>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 w-full h-36 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--accent)]/30 bg-[var(--bg)] cursor-pointer transition group"
                >
                  <svg className="w-7 h-7 text-[var(--muted)] group-hover:text-[var(--accent)] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <span className="text-[12px] text-[var(--muted)] group-hover:text-white transition">{fileName || "Click to upload or drag video file"}</span>
                  <span className="text-[10px] text-[var(--muted)]/50">MP4, MOV, AVI &middot; Max 15 seconds analyzed</span>
                </div>
                <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                <button onClick={handleVideoUpload} disabled={loading || !fileName}
                  className="mt-4 w-full py-3 rounded-lg bg-white text-[#050507] font-medium text-[13px] hover:bg-white/90 disabled:opacity-40 transition">
                  {loading ? "Analyzing space..." : "Run Sensory Audit"}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[13px] text-[var(--muted)] mb-4 font-light">Describe the space in detail — lighting, sounds, layout, activity levels.</p>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                  placeholder="Example: Open office with fluorescent lights, 30 people talking, printers running, AC humming. Glass walls, bright monitors. No quiet areas."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 text-[14px] font-light placeholder:text-[var(--muted)]/40 focus:outline-none focus:border-[var(--accent)]/30 resize-none" />
                <button onClick={handleTextAudit} disabled={loading || !text.trim()}
                  className="mt-4 w-full py-3 rounded-lg bg-white text-[#050507] font-medium text-[13px] hover:bg-white/90 disabled:opacity-40 transition">
                  {loading ? "Analyzing..." : "Audit This Space"}
                </button>
              </div>
            )}
          </div>
        </div>
      </S>

      {/* Results */}
      {result && (
        <>
          <Dv />
          {/* Score */}
          <S>
            <div className="max-w-[1024px] mx-auto card p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <div className="score-ring flex-shrink-0" style={{ background: `conic-gradient(${scoreColor} ${score * 3.6}deg, var(--bg) 0deg)` }}>
                  <div className="w-[120px] h-[120px] rounded-full bg-[var(--card)] flex items-center justify-center flex-col">
                    <span className="text-[32px] font-bold" style={{ color: scoreColor }}>{score}</span>
                    <span className="text-[10px] text-[var(--muted)]">/ 100</span>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <h2 className="reveal text-[20px] sm:text-[22px] tracking-tight mb-2 text-center sm:text-left">Accessibility Score</h2>
                  <p className="reveal reveal-delay-1 text-[13px] sm:text-[14px] text-[var(--muted)] font-light mb-5 text-center sm:text-left">
                    {score > 70 ? "This space is reasonably autism-friendly with minor improvements needed."
                      : score > 40 ? "Moderate sensory challenges detected. Several improvements recommended."
                      : "Significant sensory barriers. Major changes needed."}
                  </p>
                  <div className="reveal reveal-delay-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      [result.summary.high_stress_moments, "High Stress", "var(--danger)"],
                      [result.summary.moderate_stress_moments, "Moderate", "var(--warning)"],
                      [`${result.summary.peak_stress.toFixed(0)}%`, "Peak Stress", "var(--text)"],
                      [`${result.summary.timesteps}s`, "Analyzed", "var(--accent)"],
                    ].map(([v, l, c]) => (
                      <div key={String(l)} className="bg-[var(--bg)] rounded-lg p-3 text-center">
                        <div className="text-[18px] font-medium tabular-nums" style={{ color: c as string }}>{v}</div>
                        <div className="text-[10px] text-[var(--muted)] mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </S>

          <Dv />
          {/* Timeline */}
          <S>
            <div className="max-w-[1024px] mx-auto card p-6">
              <div className="reveal flex items-center justify-between mb-4">
                <h3 className="text-[16px] tracking-tight">Sensory Stress Timeline</h3>
                <div className="flex gap-4 text-[10px] text-[var(--muted)]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--green)]" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--warning)]" />Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--danger)]" />High</span>
                </div>
              </div>
              <div className="reveal reveal-delay-1 flex items-end gap-[2px] h-32">
                {result.timeline.map((t, i) => (
                  <div key={i} className="flex-1 rounded-t transition-all" style={{
                    height: `${Math.max(t.stress * 100, 2)}%`,
                    background: t.stress > 0.75 ? "var(--danger)" : t.stress > 0.5 ? "var(--warning)" : "var(--green)",
                    minWidth: "3px",
                  }} title={`t=${t.time}s — ${(t.stress * 100).toFixed(0)}%`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-[var(--muted)] mt-2">
                <span>0s</span><span>{result.timeline.length}s</span>
              </div>
            </div>
          </S>

          {/* Flagged */}
          {result.flagged_moments.length > 0 && (
            <>
              <Dv />
              <S>
                <div className="max-w-[1024px] mx-auto card p-6">
                  <h3 className="reveal text-[16px] tracking-tight mb-4">Flagged Moments ({result.flagged_moments.length})</h3>
                  <div className="space-y-3">
                    {result.flagged_moments.slice(0, 12).map((fm, i) => (
                      <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 3)} flex gap-4 bg-[var(--bg)] rounded-lg p-4`}>
                        {fm.video_frame && <img src={`data:image/jpeg;base64,${fm.video_frame}`} alt="" className="w-36 h-22 rounded-lg object-cover flex-shrink-0" />}
                        {fm.brain_image && <img src={`data:image/png;base64,${fm.brain_image}`} alt="" className="w-36 h-22 rounded-lg object-cover flex-shrink-0 bg-black" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-medium text-white">t = {fm.time}s</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${fm.level === "high" ? "bg-[var(--danger)]/15 text-[var(--danger)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>{fm.level}</span>
                            <span className="text-[11px] text-[var(--muted)] font-mono">{(fm.stress * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-[12px] text-[var(--muted)] font-light">
                            Dominant: <strong className="text-white font-normal capitalize">{fm.dominant_channel}</strong>
                            {fm.dominant_channel === "visual" && " — Bright lights, visual clutter, or rapid movement"}
                            {fm.dominant_channel === "auditory" && " — Loud sounds, overlapping noise, or sudden changes"}
                            {fm.dominant_channel === "social" && " — Social complexity or crowding signals"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </S>
            </>
          )}

          {/* Recommendations */}
          <Dv />
          <S>
            <div className="max-w-[1024px] mx-auto">
              <h2 className="reveal text-[26px] tracking-tight mb-3">Recommendations</h2>
              <p className="reveal reveal-delay-1 text-[14px] text-[var(--muted)] mb-8 font-light">AI-generated suggestions to improve sensory accessibility.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 3)} card p-5`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[13px] font-medium">{s.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        s.priority === "high" ? "bg-[var(--danger)]/10 text-[var(--danger)]" :
                        s.priority === "medium" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                        "bg-[var(--accent)]/10 text-[var(--accent)]"
                      }`}>{s.priority}</span>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] leading-relaxed font-light mb-1"><strong className="text-white font-normal">Issue:</strong> {s.issue}</p>
                    <p className="text-[12px] text-[var(--muted)] leading-relaxed font-light mb-1"><strong className="text-white font-normal">Action:</strong> {s.action}</p>
                    <p className="text-[12px] text-[var(--accent)] font-light"><strong className="font-normal">Impact:</strong> {s.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </S>
        </>
      )}

      <Footer />
    </main>
  );
}

function Nav() {
  const [s, setS] = useState(false);
  useEffect(() => { const h = () => setS(window.scrollY > 40); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${s ? "bg-[#050507]/80 backdrop-blur-xl border-b border-[var(--border)]" : ""}`}>
      <div className="max-w-[1024px] mx-auto px-6 h-14 flex items-center justify-between">
        <a href="https://mind.new" className="flex items-center gap-2">
          <span className="text-[15px] font-medium tracking-tight">
            <span className="gradient-text">Sensory</span>
            <span className="text-[var(--text)]"> Audit</span>
          </span>
        </a>
        <div className="hidden md:flex items-center gap-7 text-[13px] text-[var(--muted)]">
          <a href="https://mind.new" className="hover:text-white transition">Home</a>
          <a href="https://neuro.mind.new" className="hover:text-white transition">NeuroBrain</a>
          <a href="https://mind.new/paper" className="hover:text-white transition">Paper</a>
        </div>
        <span className="text-[13px] px-4 py-1.5 rounded-full border border-white/10 text-[var(--muted)]">sensory.mind.new</span>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-5 px-6">
      <div className="max-w-[1024px] mx-auto flex items-center justify-between text-[11px] text-[var(--muted)]">
        <span>Sensory Audit by Leeza Care</span>
        <a href="https://mind.new" className="hover:text-white transition">mind.new</a>
      </div>
    </footer>
  );
}
