"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Zap, Loader2 } from "lucide-react";

export default function AuthSuccessClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const userId = params.get("user_id");
    const name = params.get("name"); // already URL-decoded by Next.js
    const notion = params.get("notion");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Google sign-in was cancelled or failed: ${decodeURIComponent(error)}`);
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    if (userId) {
      try {
        localStorage.setItem("omni_copilot_user", JSON.stringify({ userId }));
        setMessage(`Welcome${name ? `, ${decodeURIComponent(name)}` : ""}! Google connected ✓`);
        setStatus("success");
      } catch {
        setStatus("error");
        setMessage("Failed to save session. Please allow localStorage.");
      }
    } else if (notion === "connected") {
      setMessage("Notion connected successfully!");
      setStatus("success");
    } else {
      setStatus("error");
      setMessage("Something went wrong during authentication.");
    }

    const t = setTimeout(() => router.replace("/"), 2000);
    return () => clearTimeout(t);
  }, [params, router]);

  return (
    <div className="min-h-screen bg-surface-0 mesh-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-10 text-center max-w-sm w-full mx-4"
      >
        {status === "loading" && (
          <>
            <Loader2 size={40} className="text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Completing authentication…</p>
          </>
        )}
        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
            </motion.div>
            <h2 className="font-display font-bold text-xl text-white mb-2">All set!</h2>
            <p className="text-slate-400 text-sm mb-1">{message}</p>
            <p className="text-slate-600 text-xs">Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-red-400" />
            </div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Sign-in failed</h2>
            <p className="text-slate-400 text-sm">{message}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}