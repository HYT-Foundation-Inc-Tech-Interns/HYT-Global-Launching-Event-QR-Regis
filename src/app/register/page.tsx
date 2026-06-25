"use client";

import { useState } from "react";
import Header from "@/components/Header";
import PassportCard from "@/components/PassportCard";
import type { Guest } from "@/lib/types";

/**
 * Guest registration page (/register).
 *
 * Collects the guest details, posts them to /api/register, and then shows
 * the guest's brand-new digital passport.
 *
 * Designed to work well on registration tablets: large inputs and buttons.
 */

// The guest types offered in the dropdown. Edit freely for your event.
const GUEST_TYPES = ["Student", "Teacher", "Industry Partner", "VIP", "Visitor"];

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    guestType: GUEST_TYPES[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      // Remember this guest on THIS device immediately, so when they later
      // scan a floor poster with their camera, the floor is stamped without
      // any typing. (Previously this only happened on the /passport page.)
      try {
        localStorage.setItem("hyt_passport_id", data.guest.passportId);
      } catch {
        // localStorage may be unavailable (private mode); safe to ignore.
      }
      setGuest(data.guest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // After a successful registration, show the passport.
  if (guest) {
    return (
      <main>
        <Header subtitle="Registration complete" />
        <section className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-center text-green-800 ring-1 ring-green-200">
            🎉 You&apos;re registered! Here is your digital passport. Save it or
            take a screenshot, and bring it to each floor.
          </div>
          <PassportCard guest={guest} />
          <p className="mt-6 text-center text-sm text-slate-500">
            Your passport link:{" "}
            <a
              href={guest.passportLink}
              className="font-mono text-brand-purple hover:underline"
            >
              {guest.passportLink}
            </a>
          </p>
        </section>
      </main>
    );
  }

  // The registration form.
  return (
    <main>
      <Header subtitle="Guest registration" />
      <section className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Register</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in your details to receive your HYT Digital Passport.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field
              label="Full Name"
              required
              value={form.fullName}
              onChange={(v) => update("fullName", v)}
            />
            <Field
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(v) => update("email", v)}
            />
            <Field
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
            />
            <Field
              label="School / Company"
              value={form.organization}
              onChange={(v) => update("organization", v)}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Guest Type
              </label>
              <select
                value={form.guestType}
                onChange={(e) => update("guestType", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {GUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0C005B] px-4 py-3 text-base font-semibold text-white shadow transition hover:bg-[#080046] disabled:opacity-60"
            >
              {submitting ? "Registering..." : "Register & Get My Passport"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

/** Small labelled text input used by the form. */
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
      />
    </div>
  );
}
