"use client";
import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Loader2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { uploadFile } from "@/lib/api";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const QUICK_PROMPTS = [
  "What's on my calendar this week?",
  "Summarize my unread emails",
  "List files in my Drive",
  "Create a meeting note in Notion",
];

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [fileContext, setFileContext] = useState<{ name: string; text: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, []);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    // Append file context to message if a file is attached
    const fullMessage = fileContext
      ? `${msg}\n\n[Attached file: ${fileContext.name}]\n${fileContext.text.slice(0, 4000)}`
      : msg;
    onSend(fullMessage);
    setInput("");
    setFileContext(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, isLoading, onSend, fileContext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await uploadFile(file);
      setFileContext({ name: result.filename, text: result.text });
      toast.success(`File loaded: ${result.filename}`);
    } catch {
      toast.error("Failed to process file. Only PDF, DOCX and TXT are supported.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const canSend = input.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="relative">
      {/* Quick prompts — shown when focused and input is empty */}
      <AnimatePresence>
        {showQuickPrompts && !input && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-0 right-0 mb-3 glass-strong rounded-2xl p-3"
          >
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick prompts</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    setShowQuickPrompts(false);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5 hover:border-brand-500/20"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File attachment badge */}
      <AnimatePresence>
        {fileContext && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-0 mb-2"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg border border-brand-500/20 text-xs">
              <FileText size={12} className="text-brand-500" />
              <span className="text-slate-300 font-medium">{fileContext.name}</span>
              <span className="text-slate-600">
                ({Math.round(fileContext.text.length / 1000)}k chars)
              </span>
              <button
                onClick={() => setFileContext(null)}
                className="text-slate-600 hover:text-red-400 ml-1"
              >
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input box */}
      <div
        className={`glass-strong rounded-2xl transition-all duration-200 ${
          canSend ? "border-brand-500/30 glow-brand" : "border-white/8"
        }`}
      >
        <div className="flex items-end gap-2 p-3">
          {/* Attach file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || !!disabled}
            title="Attach PDF, DOCX or TXT"
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-white/6 transition-all disabled:opacity-40"
          >
            {uploadingFile ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Paperclip size={16} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowQuickPrompts(true)}
            onBlur={() => setTimeout(() => setShowQuickPrompts(false), 200)}
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            disabled={!!disabled || isLoading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none leading-relaxed py-2 disabled:opacity-40"
            style={{ minHeight: "36px", maxHeight: "160px" }}
          />

          {/* Send */}
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileTap={{ scale: 0.9 }}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              canSend
                ? "gradient-brand shadow-lg shadow-brand-500/30 text-white"
                : "bg-white/5 text-slate-700"
            }`}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </motion.button>
        </div>

        {/* Status bar */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <p className="text-xs text-slate-700">
            {isLoading ? "AI is thinking…" : "Shift + Enter for new line"}
          </p>
          {input.length > 0 && (
            <p className="text-xs text-slate-700">{input.length} chars</p>
          )}
        </div>
      </div>
    </div>
  );
}