"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, HardDrive, Mail, FileText,
  ChevronDown, CheckCircle2, XCircle, Clock, Zap
} from "lucide-react";
import { ToolExecution } from "@/lib/api";

const TOOL_META: Record<string, { label: string; icon: typeof Calendar; color: string }> = {
  create_calendar_event: { label: "Create Calendar Event", icon: Calendar, color: "#4285f4" },
  list_calendar_events: { label: "List Calendar Events", icon: Calendar, color: "#4285f4" },
  read_drive_file: { label: "Read Drive File", icon: HardDrive, color: "#34a853" },
  list_drive_files: { label: "List Drive Files", icon: HardDrive, color: "#34a853" },
  summarize_emails: { label: "Fetch Emails", icon: Mail, color: "#ea4335" },
  create_notion_page: { label: "Create Notion Page", icon: FileText, color: "#ffffff" },
};

interface ToolTraceProps {
  executions: ToolExecution[];
}

function ToolCard({ exec, index }: { exec: ToolExecution; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[exec.tool_name] || { label: exec.tool_name, icon: Zap, color: "#4f6ef7" };
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl border border-white/6 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left"
      >
        {/* Step number */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {index + 1}
        </div>

        {/* Tool icon + name */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${meta.color}18` }}
        >
          <Icon size={14} style={{ color: meta.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-300">{meta.label}</p>
          <p className="text-xs text-slate-600 font-mono truncate">
            {JSON.stringify(exec.tool_input).slice(0, 60)}...
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <Clock size={11} />
            {exec.duration_ms}ms
          </span>
          {exec.success
            ? <CheckCircle2 size={14} className="text-green-400" />
            : <XCircle size={14} className="text-red-400" />
          }
          <ChevronDown
            size={14}
            className={`text-slate-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
              {/* Input */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Input</p>
                <pre className="text-xs font-mono text-slate-400 bg-black/30 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(exec.tool_input, null, 2)}
                </pre>
              </div>

              {/* Output */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                  {exec.success ? "Output" : "Error"}
                </p>
                <pre className={`text-xs font-mono rounded-lg p-3 overflow-x-auto ${
                  exec.success
                    ? "text-green-400/80 bg-green-500/5"
                    : "text-red-400/80 bg-red-500/5"
                }`}>
                  {JSON.stringify(exec.tool_output, null, 2).slice(0, 800)}
                </pre>
              </div>

              {/* Meet link shortcut */}
              {exec.success && (exec.tool_output as { meet_link?: string }).meet_link && (
                <a
                  href={(exec.tool_output as { meet_link: string }).meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-blue-400 font-medium"
                >
                  <Calendar size={12} />
                  Join Google Meet →
                </a>
              )}
              {exec.success && (exec.tool_output as { page_url?: string }).page_url && (
                <a
                  href={(exec.tool_output as { page_url: string }).page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white font-medium"
                >
                  <FileText size={12} />
                  Open Notion page →
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ToolTrace({ executions }: ToolTraceProps) {
  if (!executions || executions.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={12} className="text-brand-500" />
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Execution Trace ({executions.length} step{executions.length !== 1 ? "s" : ""})
        </p>
      </div>
      {executions.map((exec, i) => (
        <ToolCard key={i} exec={exec} index={i} />
      ))}
    </div>
  );
}
