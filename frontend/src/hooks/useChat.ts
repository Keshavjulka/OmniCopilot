"use client";
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { sendMessage, getChatHistory, ChatMessage, ToolExecution } from "@/lib/api";
import toast from "react-hot-toast";

export function useChat(userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !userId) return;

    const userMsg: ChatMessage = {
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    // Add user message + typing placeholder
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendMessage(content, userId, sessionId || undefined);
      if (!sessionId) setSessionId(response.session_id);

      const assistantMsg: ChatMessage = {
        _id: response.message_id,
        role: "assistant",
        content: response.reply,
        tool_executions: response.tool_executions,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionId, isLoading]);

  const loadHistory = useCallback(async (sid: string) => {
    if (!userId) return;
    try {
      const history = await getChatHistory(userId, sid);
      setMessages(history);
      setSessionId(sid);
    } catch {
      toast.error("Failed to load chat history");
    }
  }, [userId]);

  const newChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return { messages, sessionId, isLoading, send, loadHistory, newChat };
}
