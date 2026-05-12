"use client";

interface Props {
  label: string;
  pct: number;
  done: boolean;
  error?: string;
  onClose: () => void;
}

export default function PDFProgressModal({ label, pct, done, error, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,27,62,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(13,27,62,0.2)" }}>

        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: done && !error ? "var(--success)" : error ? "var(--danger)" : "var(--primary)" }} />

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {done && !error ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.2)" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--success)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : error ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--danger)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(30,64,175,0.1)", border: "1px solid rgba(30,64,175,0.15)" }}>
                <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--primary)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-center font-bold mb-1" style={{ fontSize: 15, color: "var(--text-primary)" }}>
            {done && !error ? "PDF Ready!" : error ? "Export Failed" : "Generating PDF…"}
          </h3>
          <p className="text-center mb-5" style={{ fontSize: 12, color: "var(--text-muted)", minHeight: 18 }}>
            {error || label}
          </p>

          {/* Progress bar */}
          {!error && (
            <div className="mb-5">
              <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--bg-raised)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: done ? "var(--success)" : "var(--primary)",
                  }}
                />
              </div>
              <p className="text-right mt-1 font-semibold" style={{ fontSize: 10, color: "var(--text-muted)" }}>{pct}%</p>
            </div>
          )}

          {/* Steps */}
          {!error && (
            <div className="space-y-2 mb-5">
              {[
                { label: "Load library",       threshold: 5  },
                { label: "Capture content",    threshold: 20 },
                { label: "Render charts",      threshold: 45 },
                { label: "Build PDF pages",    threshold: 70 },
                { label: "Save file",          threshold: 90 },
              ].map((step) => {
                const complete = pct >= step.threshold;
                const active   = pct >= step.threshold - 5 && pct < step.threshold + 25 && !done;
                return (
                  <div key={step.label} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: complete ? "rgba(5,150,105,0.1)" : "var(--bg-raised)",
                        border: `1px solid ${complete ? "rgba(5,150,105,0.3)" : "var(--border)"}`,
                      }}>
                      {complete ? (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--success)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : active ? (
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--border-md)" }} />
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: complete ? "var(--text-secondary)" : "var(--text-muted)", fontWeight: complete ? 600 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Close button — only when done or error */}
          {(done || error) && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: error ? "var(--danger)" : "var(--success)",
                color: "#fff",
                boxShadow: error ? "0 4px 12px rgba(220,38,38,0.25)" : "0 4px 12px rgba(5,150,105,0.25)",
              }}>
              {error ? "Close" : "Done"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
