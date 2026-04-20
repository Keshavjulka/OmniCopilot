import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolExecution {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  success: boolean;
  duration_ms: number;
}

export interface ChatMessage {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  tool_executions?: ToolExecution[];
  created_at?: string;
  session_id?: string;
}

export interface ChatSession {
  session_id: string;
  preview: string;
  updated_at: string;
  message_count: number;
}

export interface IntegrationStatus {
  google: boolean;
  notion: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  integrations: IntegrationStatus;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendMessage(
  message: string,
  userId: string,
  sessionId?: string
): Promise<{
  reply: string;
  session_id: string;
  tool_executions: ToolExecution[];
  message_id: string;
}> {
  const { data } = await api.post("/chat/message", {
    message,
    user_id: userId,
    session_id: sessionId,
  });
  return data;
}

export async function getChatHistory(
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const { data } = await api.get(`/chat/history/${userId}/${sessionId}`);
  return data.messages;
}

export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  const { data } = await api.get(`/chat/sessions/${userId}`);
  return data.sessions;
}

export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<void> {
  await api.delete(`/chat/session/${userId}/${sessionId}`);
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data } = await api.get(`/auth/me/${userId}`);
  return data;
}

/**
 * Fetch the Google OAuth URL from the backend, then redirect the browser to it.
 * The backend returns { auth_url, state } — we navigate to auth_url directly.
 */
export async function redirectToGoogleAuth(userId: string): Promise<void> {
  const { data } = await api.get(`/auth/google/login?user_id=${userId}`);
  // Full browser redirect to Google's consent screen
  window.location.href = data.auth_url;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export async function getIntegrationStatus(
  userId: string
): Promise<IntegrationStatus> {
  const { data } = await api.get(`/integrations/status/${userId}`);
  return data;
}

export async function disconnectIntegration(
  userId: string,
  service: string
): Promise<void> {
  await api.delete(`/integrations/disconnect/${userId}/${service}`);
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<{
  filename: string;
  text: string;
  char_count: number;
}> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/files/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}