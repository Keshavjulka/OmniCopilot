"use client";
import { useState, useEffect, useCallback } from "react";
import { getUserProfile, getIntegrationStatus, UserProfile, IntegrationStatus } from "@/lib/api";

const STORAGE_KEY = "omni_copilot_user";

export interface UserState {
  userId: string | null;
  profile: UserProfile | null;
  integrations: IntegrationStatus;
  isLoading: boolean;
}

const DEFAULT_INTEGRATIONS: IntegrationStatus = { google: false, notion: false };

export function useUser() {
  const [state, setState] = useState<UserState>({
    userId: null,
    profile: null,
    integrations: DEFAULT_INTEGRATIONS,
    isLoading: true,
  });

  const loadUser = useCallback(async (userId: string) => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      const [profile, integrations] = await Promise.all([
        getUserProfile(userId),
        getIntegrationStatus(userId),
      ]);
      setState({ userId, profile, integrations, isLoading: false });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId }));
    } catch (err) {
      console.error("Failed to load user:", err);
      // User not found in DB — clear stale localStorage
      localStorage.removeItem(STORAGE_KEY);
      setState({ userId: null, profile: null, integrations: DEFAULT_INTEGRATIONS, isLoading: false });
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { userId } = JSON.parse(stored);
        if (userId) {
          loadUser(userId);
          return;
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setState(s => ({ ...s, isLoading: false }));
  }, [loadUser]);

  const refreshIntegrations = useCallback(async () => {
    if (!state.userId) return;
    try {
      const integrations = await getIntegrationStatus(state.userId);
      setState(s => ({ ...s, integrations }));
    } catch (err) {
      console.error("Failed to refresh integrations:", err);
    }
  }, [state.userId]);

  const setUserId = useCallback((userId: string) => {
    loadUser(userId);
  }, [loadUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ userId: null, profile: null, integrations: DEFAULT_INTEGRATIONS, isLoading: false });
  }, []);

  return { ...state, setUserId, refreshIntegrations, logout };
}