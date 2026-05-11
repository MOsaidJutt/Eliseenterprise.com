"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  sendChatMessage, AIMessage, Conversation, ConversationDetail,
  fetchConversations, fetchConversation, deleteConversation,
} from "@/lib/api";

interface Props { analysisId?: number; }

export default function AIChatPanel({ analysisId }: Props) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(420);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | undefined>();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingConvs(true);
    fetchConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const loadConversation = useCallback(async (id: number) => {
    setActiveConvId(id);
    setError("");
    try {
      const detail: ConversationDetail = await fetchConversation(id);
      setMessages(detail.messages);
    } catch { setError("Failed to load conversation"); }
  }, []);

  function newChat() {
    setActiveConvId(undefined);
    setMessages([]);
    setError("");
    setInput("");
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const userMsg: AIMessage = { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await sendChatMessage(text, analysisId, activeConvId);
      setActiveConvId(res.conversation_id);
      const assistantMsg: AIMessage = { id: res.message_id, role: "assistant", content: res.reply, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);
      fetchConversations().then(setConversations).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get response");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConv(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteConversation(id).catch(() => {});
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) newChat();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startW: width };
    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - ev.clientX;
      setWidth(Math.min(600, Math.max(300, resizeRef.current.startW + delta)));
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function timeAgo(iso: string) {
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <>
      {/* Toggle button — only visible when panel is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 font-semibold text-xs text-white px-4 py-2.5 rounded-full transition-all hover:scale-105 no-print"
          style={{
            background: "var(--primary)",
            boxShadow: "0 4px 20px rgba(30,64,175,0.35)",
          }}
          title="Open AI Chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          AI Chat
          {conversations.length > 0 && (
            <span className="rounded-full w-4 h-4 flex items-center justify-center font-bold"
              style={{ fontSize: 9, background: "#059669" }}>
              {conversations.length > 9 ? "9+" : conversations.length}
            </span>
          )}
        </button>
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-30 flex transition-transform duration-300 ease-in-out no-print ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={onResizeMouseDown}
          className="w-1.5 cursor-col-resize shrink-0 select-none transition-colors"
          style={{ background: "var(--border)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--border)")}
        />

        {/* Panel body */}
        <div className="flex flex-col flex-1 overflow-hidden"
          style={{ background: "var(--bg-card)", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 40px rgba(13,27,62,0.1)" }}>

          {/* Header */}
          <div className="px-4 py-3 shrink-0 flex items-center justify-between"
            style={{ background: "var(--bg-nav)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#34D399" }} />
              <span className="font-bold" style={{ fontSize: 13, color: "#F1F5F9" }}>AI Schedule Assistant</span>
              {analysisId && (
                <span className="rounded-md px-1.5 py-0.5" style={{ fontSize: 10, color: "#64748B", background: "rgba(255,255,255,0.06)" }}>
                  #{analysisId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={newChat}
                className="font-medium rounded-lg px-2.5 py-1 transition-all"
                style={{ fontSize: 10, color: "#93C5FD", border: "1px solid rgba(147,197,253,0.2)", background: "rgba(147,197,253,0.06)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(147,197,253,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(147,197,253,0.06)")}>
                + New Chat
              </button>
              <button onClick={() => setOpen(false)} style={{ color: "#64748B" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#CBD5E1")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body: conversations list + messages */}
          <div className="flex flex-1 overflow-hidden">

            {/* Conversation history sidebar */}
            <div className="w-36 shrink-0 flex flex-col" style={{ borderRight: "1px solid var(--border)", background: "var(--bg-card2)" }}>
              <p className="font-bold uppercase tracking-widest px-3 pt-3 pb-2 shrink-0"
                style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em" }}>History</p>
              <div className="flex-1 overflow-y-auto">
                {loadingConvs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-4 h-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="px-3 py-4 text-center leading-relaxed" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    No conversations yet
                  </p>
                ) : conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className="group px-3 py-2 cursor-pointer relative transition-colors"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      borderLeft: `2px solid ${conv.id === activeConvId ? "var(--primary)" : "transparent"}`,
                      background: conv.id === activeConvId ? "var(--primary-light)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (conv.id !== activeConvId) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-raised)"; }}
                    onMouseLeave={(e) => { if (conv.id !== activeConvId) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <p className="font-medium leading-tight truncate pr-4" style={{ fontSize: 10, color: "var(--text-primary)" }}>{conv.title}</p>
                    <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(conv.created_at as string)}</p>
                    <button
                      onClick={(e) => handleDeleteConv(conv.id, e)}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages + input */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ background: "var(--primary-light)", border: "1px solid rgba(30,64,175,0.15)" }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--primary)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="font-medium mb-4" style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ask about this schedule</p>
                    {[
                      "Which activities are most at risk?",
                      "What's causing the delay?",
                      "Summarise the critical path",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="block w-full text-left rounded-lg px-3 py-2 transition-all mb-2"
                        style={{ fontSize: 10, color: "var(--text-secondary)", background: "var(--bg-card2)", border: "1px solid var(--border)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap`}
                      style={msg.role === "user"
                        ? { background: "var(--primary)", color: "#fff", borderBottomRightRadius: 4 }
                        : { background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderBottomLeftRadius: 4 }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1.5"
                      style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--primary)", animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--primary)", animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--primary)", animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                    style={{ background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex gap-2 rounded-xl overflow-hidden"
                  style={{ background: "var(--bg-card2)", border: "1px solid var(--border-md)" }}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about risks, delays, milestones…"
                    rows={2}
                    disabled={loading}
                    className="flex-1 bg-transparent outline-none resize-none"
                    style={{ fontSize: 12, color: "var(--text-primary)", padding: "8px 12px", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    className="px-3 transition-colors shrink-0"
                    style={{ color: !input.trim() || loading ? "var(--text-muted)" : "var(--primary)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-center mt-1" style={{ fontSize: 9, color: "var(--text-muted)" }}>Enter to send · Shift+Enter for newline</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(13,27,62,0.4)" }} onClick={() => setOpen(false)} />
      )}
    </>
  );
}
