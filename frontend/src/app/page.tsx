"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Zap, Sparkles, Calendar, HardDrive,
  Mail, FileText, ArrowRight, Shield, Loader2,
} from "lucide-react";
import {
  getChatSessions, deleteSession,
  redirectToGoogleAuth,
  ChatSession,
} from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { useChat } from "@/hooks/useChat";
import Sidebar from "@/components/sidebar/Sidebar";
import MessageBubble, { TypingBubble } from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Calendar, label: "Schedule meetings",  desc: "Create events + Meet links", color: "#4285f4" },
  { icon: HardDrive, label: "Access Drive",       desc: "Read and summarise files",  color: "#34a853" },
  { icon: Mail,      label: "Check emails",       desc: "Summarise your inbox",      color: "#ea4335" },
  { icon: FileText,  label: "Write to Notion",    desc: "Create notes and pages",    color: "#e2e8f0" },
];

const EXAMPLE_PROMPTS = [
  "Create a Google Meet at 7 PM today called 'Team Sync' and invite team@company.com",
  "Fetch my resume from Drive and give me a detailed summary",
  "Summarise my 5 most recent unread emails",
  "Write an 'About Me' page in Notion — I'm a full-stack developer",
  "What meetings do I have this week?",
];

// ─── Login page ───────────────────────────────────────────────────────────────

function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Fetches auth_url from backend then does window.location.href redirect
      await redirectToGoogleAuth("new");
    } catch (err) {
      toast.error("Failed to start Google sign-in. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 mesh-bg flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center shadow-2xl shadow-brand-500/30">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl gradient-text tracking-tight">
            Omni Copilot
          </h1>
        </div>

        {/* Headline */}
        <h2 className="font-display font-bold text-4xl text-white mb-4 leading-tight">
          One chat. Every tool
          <br />
          <span className="gradient-text">you already use.</span>
        </h2>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Control Google Calendar, Drive, Gmail &amp; Notion with plain English
          — no switching tabs, no copy-pasting.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-10">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="glass rounded-xl p-3 text-left"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `${f.color}1a` }}
              >
                <f.icon size={15} style={{ color: f.color }} />
              </div>
              <p className="text-xs font-medium text-slate-300">{f.label}</p>
              <p className="text-xs text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA — button that calls API then redirects */}
        <motion.button
          onClick={handleGoogleLogin}
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="flex items-center justify-center gap-3 w-full py-4 gradient-brand rounded-2xl text-white font-semibold text-base shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Redirecting to Google…
            </>
          ) : (
            <>
              {/* Google logo SVG */}
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>

        <p className="flex items-center justify-center gap-1.5 mt-4 text-xs text-slate-600">
          <Shield size={11} />
          OAuth 2.0 — we never store your Google password
        </p>
      </motion.div>
    </div>
  );
}

// ─── Welcome screen (after login, before first message) ──────────────────────

function WelcomeScreen({
  onPrompt,
  userName,
}: {
  onPrompt: (p: string) => void;
  userName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center min-h-full py-16 px-6 text-center"
    >
      <div className="mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-brand-500/30"
        >
          <Zap size={28} className="text-white" />
        </motion.div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">
          {userName ? `Hello, ${userName.split(" ")[0]} 👋` : "What can I do for you?"}
        </h1>
        <p className="text-slate-400 text-sm max-w-xs">
          Ask me to schedule meetings, read files, check emails, or write to Notion.
        </p>
      </div>

      {/* Feature icons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 w-full max-w-2xl">
        {FEATURES.map((feat, i) => (
          <motion.div
            key={feat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
            className="glass rounded-xl p-3 text-left"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ background: `${feat.color}18` }}
            >
              <feat.icon size={16} style={{ color: feat.color }} />
            </div>
            <p className="text-xs font-medium text-slate-300">{feat.label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{feat.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Example prompts */}
      <div className="w-full max-w-lg space-y-2">
        <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5 justify-center">
          <Sparkles size={12} />
          Try one of these
        </p>
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.06 }}
            onClick={() => onPrompt(prompt)}
            className="w-full text-left px-4 py-2.5 glass rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:border-brand-500/20 transition-all duration-150 flex items-center gap-2 group"
          >
            <ArrowRight
              size={13}
              className="text-brand-500 group-hover:translate-x-0.5 transition-transform shrink-0"
            />
            {prompt}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const {
    userId,
    profile,
    integrations,
    isLoading: userLoading,
    setUserId,
    refreshIntegrations,
    logout,
  } = useUser();

  const {
    messages,
    sessionId,
    isLoading: chatLoading,
    send,
    loadHistory,
    newChat,
  } = useChat(userId);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Load session list whenever a chat completes
  useEffect(() => {
    if (!userId) return;
    getChatSessions(userId).then(setSessions).catch(() => {});
  }, [userId, sessionId]);

  // Handle OAuth redirect params (?user_id=... or ?notion=connected)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const uid = p.get("user_id");
    const name = p.get("name");
    const notion = p.get("notion");

    if (uid) {
      setUserId(uid);
      toast.success(`Welcome${name ? `, ${name}` : ""}! Google connected ✓`);
      window.history.replaceState({}, "", "/");
    }
    if (notion === "connected") {
      toast.success("Notion connected ✓");
      refreshIntegrations();
      window.history.replaceState({}, "", "/");
    }
  }, [setUserId, refreshIntegrations]);

  const handleDeleteSession = useCallback(
    async (sid: string) => {
      if (!userId) return;
      try {
        await deleteSession(userId, sid);
        setSessions((prev) => prev.filter((s) => s.session_id !== sid));
        if (sessionId === sid) newChat();
        toast.success("Chat deleted");
      } catch {
        toast.error("Failed to delete chat");
      }
    },
    [userId, sessionId, newChat]
  );

  // ── render ────────────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={20} className="text-brand-500 animate-spin" />
          <span className="font-display text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!userId) return <LoginPage />;

  return (
    <div className="flex h-screen bg-surface-0 mesh-bg overflow-hidden">
      <Sidebar
        userId={userId}
        profile={profile}
        integrations={integrations}
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={loadHistory}
        onNewChat={newChat}
        onDeleteSession={handleDeleteSession}
        onRefreshIntegrations={refreshIntegrations}
        onLogout={logout}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header bar */}
        <header className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-white/5 glass">
          <div className="flex items-center gap-2">
            {sessionId ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-500 font-mono">
                  {sessionId.slice(0, 8)}…
                </span>
              </>
            ) : (
              <span className="text-sm font-display font-semibold gradient-text">
                Omni Copilot
              </span>
            )}
          </div>
          {/* Integration badges */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {integrations.google && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/15">
                <Calendar size={11} /> Google
              </span>
            )}
            {integrations.notion && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/8 text-slate-400 border border-white/10">
                <FileText size={11} /> Notion
              </span>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.length === 0 && !chatLoading ? (
              <WelcomeScreen onPrompt={send} userName={profile?.name} />
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg._id || i}
                    message={msg}
                    index={i}
                    userPicture={profile?.picture}
                  />
                ))}
                {chatLoading && <TypingBubble />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={send} isLoading={chatLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}