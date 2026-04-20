"use client";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Zap, User } from "lucide-react";
import { ChatMessage } from "@/lib/api";
import ToolTrace from "./ToolTrace";

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  userPicture?: string;
}

export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start"
    >
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-brand-500/20">
        <Zap size={15} className="text-white" />
      </div>
      <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot" />
        </div>
      </div>
    </motion.div>
  );
}

export default function MessageBubble({ message, index, userPicture }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.04, 0.3),
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-start group`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? "bg-slate-700 ring-1 ring-white/10"
            : "gradient-brand shadow-lg shadow-brand-500/20"
        }`}
      >
        {isUser ? (
          userPicture ? (
            <img
              src={userPicture}
              alt="You"
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <User size={15} className="text-slate-300" />
          )
        ) : (
          <Zap size={15} className="text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] min-w-[60px] flex flex-col gap-1 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-brand-500/20 border border-brand-500/30 rounded-tr-sm text-slate-200"
              : "glass border border-white/6 rounded-tl-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Tool execution trace */}
        {!isUser &&
          message.tool_executions &&
          message.tool_executions.length > 0 && (
            <div className="w-full max-w-xl">
              <ToolTrace executions={message.tool_executions} />
            </div>
          )}

        {/* Timestamp — shown on hover */}
        {message.created_at && (
          <p
            className={`text-xs text-slate-700 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? "text-right" : ""
            }`}
          >
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </motion.div>
  );
}