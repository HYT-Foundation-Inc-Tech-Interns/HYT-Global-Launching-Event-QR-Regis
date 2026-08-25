"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { savePassportProfile } from "@/components/ProfileMenu";
import { PartyPopper } from "lucide-react";

/**
 * Guest registration page (/register).
 *
 * Collects the guest details, posts them to /api/register, and then sends the
 * guest straight to their brand-new digital passport at /passport/[id].
 *
 * Guests reach this page by scanning the entrance QR poster and register on
 * their own phones, so the form is sized for one-handed use on a small screen.
 */

// The roles offered in the dropdown. Edit freely for your event.
const GUEST_TYPES = ["Trainee", "Trainor", "Industry Partner", "VIP", "Visitor"];
// Add the trainee course names here when they are provided.
const COURSE_OPTIONS = [
  "Barista NC II",
  "Hilot (Wellness) Massage NC II",
  "Events Management Services NC III",
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    guestType: GUEST_TYPES[0],
    course: "",
    purpose: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Stays true from a successful submit until the passport page takes over,
  // so the form never flashes back while the navigation is in flight.
  const [redirecting, setRedirecting] = useState(false);

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
        savePassportProfile({
          passportId: data.guest.passportId,
          fullName: data.guest.fullName,
        });
      } catch {
        // localStorage may be unavailable (private mode); safe to ignore.
      }
      setRedirecting(true);
      router.push(`/passport/${encodeURIComponent(data.guest.passportId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setSubmitting(false);
    }
  }

  // Registration succeeded — hold this screen until the passport page loads.
  if (redirecting) {
    return (
      <main>
        <Header subtitle="Registration complete" />
        <section className="mx-auto max-w-md px-4 py-16">
          <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <PartyPopper className="h-12 w-12 text-brand-gold" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-bold text-slate-800">
              You&apos;re registered!
            </h1>
            <div className="mt-6 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand-blue" />
            <p className="mt-4 text-sm text-slate-500">
              Opening your digital passport…
            </p>
          </div>
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
                Role
              </label>
              <select
                value={form.guestType}
                onChange={(e) => {
                  update("guestType", e.target.value);
                  if (e.target.value !== "Trainee") update("course", "");
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {GUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {form.guestType === "Trainee" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Course
                </label>
                <select
                  value={form.course}
                  onChange={(e) => update("course", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">
                    {COURSE_OPTIONS.length ? "Select a course" : "Courses coming soon"}
                  </option>
                  {COURSE_OPTIONS.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Field
              label="Purpose"
              value={form.purpose}
              onChange={(v) => update("purpose", v)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0C005B] px-4 py-3 text-base font-semibold text-white shadow transition hover:bg-[#080046] disabled:opacity-60"
            >
              {submitting ? "Registering..." : "Register & Get My QR Pass"}
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
