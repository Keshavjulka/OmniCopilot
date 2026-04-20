"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MessageSquare, Trash2,
  Zap, Calendar, HardDrive, Mail, FileText,
  CheckCircle2, Circle, ExternalLink, LogOut,
  Menu, X, Key, Eye, EyeOff, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, ChatSession, IntegrationStatus, redirectToGoogleAuth, UserProfile } from "@/lib/api";


interface SidebarProps {
  userId: string;
  profile: UserProfile | null;
  integrations: IntegrationStatus;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRefreshIntegrations: () => void;
  onLogout: () => void;
}

const CAPABILITIES = [
  { icon: Calendar, label: "Schedule meetings",  color: "#4285f4" },
  { icon: HardDrive, label: "Read Drive files",  color: "#34a853" },
  { icon: Mail,      label: "Summarise emails",  color: "#ea4335" },
  { icon: FileText,  label: "Write to Notion",   color: "#e2e8f0" },
];

/* ── Notion Token Modal ─────────────────────────────────────────────────── */
function NotionTokenModal({
  userId,
  onSuccess,
  onClose,
}: {
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const trimmed = token.trim();
    if (!trimmed) { toast.error("Please paste your Notion token"); return; }
    if (!trimmed.startsWith("secret_") && !trimmed.startsWith("ntn_")) {
      toast.error("Token must start with 'secret_' or 'ntn_'");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/auth/notion/connect?user_id=${userId}&token=${encodeURIComponent(trimmed)}`);
      toast.success("Notion connected ✓");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to connect Notion";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-strong rounded-2xl p-6 w-full max-w-md border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-white">Connect Notion</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-5">
          <p className="text-sm font-medium text-slate-300">3 quick steps:</p>
          {[
            <>Go to <a href="https://www.notion.so/profile/integrations" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">notion.so/profile/integrations</a></>,
            <>Click <strong className="text-white">New integration</strong>, give it a name, click Create</>,
            <>Copy the <strong className="text-white">Internal Integration Token</strong> (starts with <code className="font-mono text-xs bg-white/10 px-1 rounded">secret_</code> or <code className="font-mono text-xs bg-white/10 px-1 rounded">ntn_</code>) and paste below</>,
          ].map((step, i) => (
            <div key={i} className="flex gap-3 text-sm text-slate-400">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-500/20 text-brand-500 text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* Important note */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5 text-xs text-amber-300">
          <strong>Important:</strong> After creating the integration, open the Notion page where you want content created → click <strong>"..."</strong> menu → <strong>"Add connections"</strong> → select your integration.
        </div>

        {/* Token input */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 border border-white/10 focus-within:border-brand-500/40">
            <Key size={14} className="text-slate-500 shrink-0" />
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="secret_xxx... or ntn_xxx..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none font-mono"
              autoFocus
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-slate-600 hover:text-slate-400 transition-colors"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading || !token.trim()}
            className="flex-1 py-2.5 rounded-xl gradient-brand text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {loading ? "Connecting…" : "Connect"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Sidebar ───────────────────────────────────────────────────────── */
export default function Sidebar({
  userId, profile, integrations, sessions, currentSessionId,
  onSelectSession, onNewChat, onDeleteSession, onRefreshIntegrations, onLogout,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [showNotionModal, setShowNotionModal] = useState(false);

  const connectGoogle = useCallback(async () => {
    setConnectingGoogle(true);
    try {
      // redirectToGoogleAuth fetches the auth_url then does window.location.href
      await redirectToGoogleAuth(userId);
    } catch {
      toast.error("Failed to start Google sign-in");
      setConnectingGoogle(false);
    }
  }, [userId]);

  const disconnectNotion = useCallback(async () => {
    try {
      await api.delete(`/auth/notion/disconnect?user_id=${userId}`);
      onRefreshIntegrations();
      toast.success("Notion disconnected");
    } catch {
      toast.error("Failed to disconnect Notion");
    }
  }, [userId, onRefreshIntegrations]);

  const disconnectGoogle = useCallback(async () => {
    try {
      await api.delete(`/integrations/disconnect/${userId}/google`);
      onRefreshIntegrations();
      toast.success("Google disconnected");
    } catch {
      toast.error("Failed to disconnect Google");
    }
  }, [userId, onRefreshIntegrations]);

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="shrink-0 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg gradient-text tracking-tight">Omni Copilot</span>
        </div>
      </div>

      {/* New Chat */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <button
          onClick={() => { onNewChat(); setMobileOpen(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 text-brand-500 transition-all text-sm font-medium"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
        {sessions.length > 0 && (
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider px-2 pb-1">
            Recent
          </p>
        )}
        <AnimatePresence initial={false}>
          {sessions.map((s) => (
            <motion.div
              key={s.session_id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                currentSessionId === s.session_id
                  ? "bg-brand-500/15 border border-brand-500/20 text-white"
                  : "hover:bg-white/5 text-slate-500 hover:text-slate-200"
              }`}
              onClick={() => { onSelectSession(s.session_id); setMobileOpen(false); }}
            >
              <MessageSquare size={13} className="shrink-0 opacity-60" />
              <span className="flex-1 text-xs truncate">{s.preview}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSession(s.session_id); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Integrations */}
      <div className="shrink-0 border-t border-white/5 px-3 py-3 space-y-2">
        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider px-1">
          Integrations
        </p>

        {/* Google */}
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
          integrations.google
            ? "border-green-500/20 bg-green-500/5"
            : "border-white/5 bg-white/2"
        }`}>
          <Calendar size={14} style={{ color: "#4285f4" }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-300">Google</span>
              {integrations.google
                ? <CheckCircle2 size={11} className="text-green-400" />
                : <Circle size={11} className="text-slate-600" />
              }
            </div>
            <p className="text-xs text-slate-600">Calendar · Drive · Gmail</p>
          </div>
          {integrations.google ? (
            <button onClick={disconnectGoogle} className="text-slate-600 hover:text-red-400 transition-colors" title="Disconnect">
              <X size={12} />
            </button>
          ) : (
            <button
              onClick={connectGoogle}
              disabled={connectingGoogle}
              className="text-xs text-brand-500 hover:text-blue-400 font-medium flex items-center gap-1 disabled:opacity-50"
            >
              {connectingGoogle ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
              {connectingGoogle ? "…" : "Connect"}
            </button>
          )}
        </div>

        {/* Notion */}
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
          integrations.notion
            ? "border-green-500/20 bg-green-500/5"
            : "border-white/5 bg-white/2"
        }`}>
          <FileText size={14} className="text-slate-300" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-300">Notion</span>
              {integrations.notion
                ? <CheckCircle2 size={11} className="text-green-400" />
                : <Circle size={11} className="text-slate-600" />
              }
            </div>
            <p className="text-xs text-slate-600">Pages · Notes</p>
          </div>
          {integrations.notion ? (
            <button onClick={disconnectNotion} className="text-slate-600 hover:text-red-400 transition-colors" title="Disconnect">
              <X size={12} />
            </button>
          ) : (
            <button
              onClick={() => setShowNotionModal(true)}
              className="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1"
            >
              <Key size={11} /> Token
            </button>
          )}
        </div>
      </div>

      {/* Capabilities */}
      <div className="shrink-0 px-3 pb-2">
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-slate-600 font-medium mb-2">What I can do</p>
          <div className="grid grid-cols-2 gap-1">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                <c.icon size={11} style={{ color: c.color }} />
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User */}
      {profile && (
        <div className="shrink-0 border-t border-white/5 px-3 py-3">
          <div className="flex items-center gap-2.5">
            {profile.picture ? (
              <img src={profile.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
            ) : (
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold">
                {profile.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{profile.name}</p>
              <p className="text-xs text-slate-600 truncate">{profile.email}</p>
            </div>
            <button onClick={onLogout} className="text-slate-600 hover:text-red-400 transition-colors">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-col glass-strong border-r border-white/5 h-screen sticky top-0 overflow-hidden">
        {content}
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg border border-white/10"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 glass-strong border-r border-white/5 overflow-hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Notion token modal */}
      <AnimatePresence>
        {showNotionModal && (
          <NotionTokenModal
            userId={userId}
            onSuccess={onRefreshIntegrations}
            onClose={() => setShowNotionModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}