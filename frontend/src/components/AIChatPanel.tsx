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
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl shadow-blue-900/40 transition-all hover:scale-105 no-print"
          title="Open AI Chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          AI Chat
          {conversations.length > 0 && (
            <span className="bg-emerald-500 rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold">
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
          className="w-1.5 cursor-col-resize bg-white/[0.04] hover:bg-blue-500/40 transition-colors shrink-0 select-none"
        />

        {/* Panel body */}
        <div className="flex flex-col flex-1 bg-[#090F1C] border-l border-white/[0.08] overflow-hidden shadow-2xl shadow-black/50">

          {/* Header */}
          <div className="px-4 py-3 bg-[#0B1525] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-slate-200 text-sm font-bold">AI Schedule Assistant</span>
              {analysisId && (
                <span className="text-slate-600 text-[10px] bg-white/[0.05] px-1.5 py-0.5 rounded-md">#{analysisId}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={newChat}
                className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition-all"
              >
                + New Chat
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body: conversations list + messages */}
          <div className="flex flex-1 overflow-hidden">

            {/* Conversation history sidebar */}
            <div className="w-36 shrink-0 border-r border-white/[0.06] flex flex-col bg-[#070C18]/60">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 pt-3 pb-2 shrink-0">History</p>
              <div className="flex-1 overflow-y-auto">
                {loadingConvs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-[10px] text-slate-700 px-3 py-4 text-center leading-relaxed">No conversations yet</p>
                ) : conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group px-3 py-2 cursor-pointer border-b border-white/[0.04] transition-colors relative ${conv.id === activeConvId ? "bg-blue-600/15 border-l-2 border-l-blue-500" : "hover:bg-white/[0.03] border-l-2 border-l-transparent"}`}
                  >
                    <p className="text-[10px] text-slate-400 font-medium leading-tight truncate pr-4">{conv.title}</p>
                    <p className="text-[9px] text-slate-700 mt-0.5">{timeAgo(conv.created_at as string)}</p>
                    <button
                      onClick={(e) => handleDeleteConv(conv.id, e)}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all"
                    >
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
                    <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-4">Ask about this schedule</p>
                    {[
                      "Which activities are most at risk?",
                      "What's causing the delay?",
                      "Summarise the critical path",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="block w-full text-left text-[10px] text-slate-500 hover:text-slate-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3 py-2 rounded-lg transition-all mb-2"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white/[0.06] border border-white/[0.08] text-slate-300 rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.06] border border-white/[0.08] px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/[0.06]">
                <div className="flex gap-2 bg-white/[0.04] border border-white/[0.1] rounded-xl overflow-hidden">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about risks, delays, milestones…"
                    rows={2}
                    disabled={loading}
                    className="flex-1 bg-transparent text-xs text-slate-300 px-3 py-2 outline-none resize-none placeholder-slate-600 disabled:opacity-50"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    className="px-3 text-blue-400 hover:text-blue-300 disabled:text-slate-700 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-[9px] text-slate-700 text-center mt-1">Enter · Shift+Enter for newline</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
