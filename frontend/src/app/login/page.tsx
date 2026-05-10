"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { setToken, isLoggedIn, getUploadPath } from "@/lib/auth";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) router.replace(getUploadPath());
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      const { access_token, user } = await loginUser(email, password);
      setToken(access_token, user);
      router.replace(user.company_slug ? `/${user.company_slug}` : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-[#070C18]">

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 xl:w-96 bg-[#0A1220] border-r border-white/[0.07] p-10 text-white shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-900/40">P</div>
            <div>
              <p className="font-bold text-sm text-slate-200 leading-tight">Plainview</p>
              <p className="text-slate-600 text-xs">Elise Enterprise</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full mb-4">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-blue-400 font-semibold">Schedule Intelligence Platform</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-slate-200 mb-3">
              Primavera P6<br />Analytics Suite
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Multi-user schedule analytics with AI-powered insights for enterprise project delivery.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "S-Curve · Critical Path · Float Erosion" },
              { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "AI Chat — ask GPT-4o about your data" },
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Full analysis history, any snapshot" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 text-slate-500 text-xs">
                <div className="w-6 h-6 bg-white/[0.04] border border-white/[0.07] rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-700 text-xs border-t border-white/[0.07] pt-6">eliseenterprise.com</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm">Plainview</p>
              <p className="text-slate-600 text-xs">Elise Enterprise</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="peter@eliseenterprise.com" autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
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
              <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-xs">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-blue-900/30 mt-2"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Signing in…</>
              ) : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-700 mt-8">Plainview · Elise Enterprise</p>
        </div>
      </div>
    </main>
  );
}
