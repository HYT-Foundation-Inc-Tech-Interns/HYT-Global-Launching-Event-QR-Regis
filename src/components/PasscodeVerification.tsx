"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface PasscodeVerificationProps {
  isOpen: boolean;
  action: "enable" | "disable";
  guestName: string;
  onConfirm: (passcode: string) => Promise<void>;
  onCancel: () => void;
}

export default function PasscodeVerification({
  isOpen,
  action,
  guestName,
  onConfirm,
  onCancel,
}: PasscodeVerificationProps) {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !passcode) {
      setError("Please enter your username and passcode.");
      return;
    }
    setLoading(true);
    try {
      await onConfirm(JSON.stringify({ username, passcode }));
      setUsername("");
      setPasscode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify passcode.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setUsername("");
    setPasscode("");
    setError("");
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-full"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold text-slate-800">
            Confirm with Credentials
          </h2>
        </div>

        <div className="mb-6 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-900 mb-2">
            ⚠️ CRITICAL ACTION - TWICE
          </p>
          <p className="text-sm text-red-800 mb-3">
            You are about to <strong>{action}</strong> the account for:
          </p>
          <p className="font-mono text-sm font-semibold text-red-900 bg-white rounded p-2">
            {guestName}
          </p>
          <p className="text-xs text-red-700 mt-3">
            {action === "disable"
              ? "This will BLOCK this intern from scanning any stations. They will not be able to access the event. This action cannot be easily undone."
              : "This will ENABLE this intern account. They will be able to scan unlimited times throughout the event."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-username" className="block text-sm font-semibold text-slate-700 mb-2">
            Admin Username
          </label>
          <input
            id="admin-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:bg-slate-50 mb-4"
          />

          <label htmlFor="admin-passcode" className="block text-sm font-semibold text-slate-700 mb-2">
            Admin Passcode
          </label>
          <input
            id="admin-passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter your passcode"
            disabled={loading}
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:bg-slate-50"
          />

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim() || !passcode}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Verifying..." : action === "disable" ? "Disable Account" : "Enable Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
