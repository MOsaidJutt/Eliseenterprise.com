"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { logEvent, clearLog } from "@/lib/debugLog";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    clearLog();
    logEvent(`login: submitting for ${email}`);
    try {
      const { access_token, user } = await loginUser(email, password);
      logEvent(`login: API ok — role=${user.role} company_slug=${user.company_slug ?? "null"}`);
      setToken(access_token, user);
      logEvent("login: setToken ok");
      // Redirect must be based on the actual role, never inferred from
      // company_slug's presence — a non-admin user with no company assigned
      // is a real (if unusual) account state, not proof of being an admin.
      if (user.role === "admin") {
        logEvent("login: redirecting to /admin");
        router.replace("/admin");
      } else if (user.company_slug) {
        logEvent(`login: redirecting to /${user.company_slug}`);
        router.replace(`/${user.company_slug}`);
      } else {
        logEvent("login: user has no company assigned — showing error instead of redirecting");
        setError("Your account isn't linked to a company yet. Contact your administrator.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      logEvent(`login: FAILED — ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex" style={{ background: "var(--bg-app)" }}>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 xl:w-[420px] shrink-0 p-10"
        style={{ background: "var(--bg-nav)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          {/* Logo */}
          <div className="mb-14">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#1E40AF,#3B82F6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(30,64,175,.45)" }}>P</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#E2E8F0", lineHeight: 1.2 }}>PlainView</p>
                <p style={{ fontSize: 11, color: "#64748B" }}>Elise Enterprise</p>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
              style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#60A5FA" }} />
              <span style={{ fontSize: 11, color: "#93C5FD", fontWeight: 600 }}>Schedule Intelligence Platform</span>
            </div>
            <h1 className="font-bold leading-tight mb-4" style={{ fontSize: 26, color: "#F1F5F9" }}>
              Primavera P6<br />Analytics Suite
            </h1>
            <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.65 }}>
              Multi-user schedule analytics with AI-powered insights for enterprise project delivery.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "S-Curve · Critical Path · Float Erosion" },
              { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "AI Chat — ask GPT-4o about your schedule" },
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Full analysis history, any snapshot" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3" style={{ color: "#64748B", fontSize: 13 }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#94A3B8" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ color: "#334155", fontSize: 12 }}>eliseenterprise.com</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: "var(--bg-app)" }}>
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1E40AF,#3B82F6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff", boxShadow: "0 2px 8px rgba(30,64,175,.4)" }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>PlainView</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-bold" style={{ fontSize: 26, color: "var(--text-primary)" }}>Welcome back</h2>
            <p className="mt-1.5" style={{ color: "var(--text-muted)", fontSize: 14 }}>Sign in to access your schedule dashboard</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(13,27,62,0.08)" }}>
            <div className="h-1 w-full" style={{ background: "var(--primary)" }} />
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              <div>
                <label className="block mb-1.5 font-semibold" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Email address
                </label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" autoComplete="username"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1px solid var(--border-md)", background: "var(--bg-card2)",
                    fontSize: 14, color: "var(--text-primary)", outline: "none",
                    fontFamily: "inherit", transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-md)")}
                />
              </div>

              <div>
                <label className="block mb-1.5 font-semibold" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    style={{
                      width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10,
                      border: "1px solid var(--border-md)", background: "var(--bg-card2)",
                      fontSize: 14, color: "var(--text-primary)", outline: "none",
                      fontFamily: "inherit", transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border-md)")}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-muted)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPw
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-sm mt-2"
                style={{
                  background: loading ? "var(--border-md)" : "var(--primary)",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 14px rgba(30,64,175,0.3)",
                }}
                onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--primary-hover)"; }}
                onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--primary)"; }}
              >
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Signing in…</>
                ) : "Sign In →"}
              </button>
            </form>
          </div>

          <p className="text-center mt-6" style={{ fontSize: 12, color: "var(--text-muted)" }}>PlainView · Elise Enterprise</p>
        </div>
      </div>
    </main>
  );
}
