import { Suspense } from "react";
import AuthSuccessClient from "./AuthSuccessClient";

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-0 flex items-center justify-center">
          <div className="text-slate-500 text-sm">Loading…</div>
        </div>
      }
    >
      <AuthSuccessClient />
    </Suspense>
  );
}