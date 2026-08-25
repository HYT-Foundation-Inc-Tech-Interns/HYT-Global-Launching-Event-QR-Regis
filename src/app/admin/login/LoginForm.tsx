"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Check if username or password is empty
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      setShowPopup(true);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          next: searchParams.get("next"),
        }),
      });

      const result = await response.json().catch(() => null);

      setSubmitting(false);

      if (!response.ok) {
        setError(
          result?.error ?? "Incorrect username or password. Please try again."
        );
        setShowPopup(true);

        // Keep the username, clear only the password
        setPassword("");

        return;
      }

      router.replace(result.destination);
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("Unable to connect. Please try again.");
      setShowPopup(true);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Username */}
        <div>
          <label
            className="block text-left text-sm font-medium text-slate-700"
            htmlFor="admin-username"
          >
            Username
          </label>

          <input
            id="admin-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="Enter your username"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none ring-[#0C005B] focus:ring-2"
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-left text-sm font-medium text-slate-700"
            htmlFor="admin-password"
          >
            Admin password
          </label>

          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none ring-[#0C005B] focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#0C005B] px-4 py-3 font-semibold text-white transition hover:bg-[#ffd301] hover:text-[#0C005B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Open admin"}
        </button>
      </form>

      {/* Error Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="login-error-title"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                !
              </div>

              <h2
                id="login-error-title"
                className="text-lg font-bold text-slate-900"
              >
                Sign-in failed
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="mt-6 w-full rounded-xl bg-[#0C005B] px-4 py-3 font-semibold text-white transition hover:bg-[#ffd301] hover:text-[#0C005B]"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </>
  );
}