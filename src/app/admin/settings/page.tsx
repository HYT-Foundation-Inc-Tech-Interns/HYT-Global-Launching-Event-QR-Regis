"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import type { CourseSetting } from "@/lib/types";

const DEFAULT_COURSES = [
  "Barista NC II",
  "Hilot (Wellness) Massage NC II",
  "Events Management Services NC III",
];

function emptySetting(course = ""): CourseSetting {
  return { course, scanLimitDays: null, validUntil: "", active: true };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<CourseSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load settings.");
        setSettings(data.settings.length ? data.settings : DEFAULT_COURSES.map(emptySetting));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  function update(index: number, patch: Partial<CourseSetting>) {
    setSettings((current) => current.map((setting, settingIndex) =>
      settingIndex === index ? { ...setting, ...patch } : setting,
    ));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings.");
      setSettings(data.settings);
      setMessage("Settings saved. They will apply to new registrations.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <Header subtitle="Administrator settings" />
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Course settings</h1>
            <p className="mt-1 text-sm text-slate-500">Set the defaults copied into each new guest account.</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm font-medium text-brand-purple hover:underline">Dashboard</Link>
        </div>

        {message && <p className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}

        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Course</th><th className="px-4 py-3">Scan limit (days)</th><th className="px-4 py-3">Valid until</th><th className="px-4 py-3">Active</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading settings...</td></tr> : settings.map((setting, index) => (
                <tr key={`${index}-${setting.course}`}>
                  <td className="px-4 py-3"><input value={setting.course} onChange={(event) => update(index, { course: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                  <td className="px-4 py-3"><input type="number" min="0" value={setting.scanLimitDays ?? ""} onChange={(event) => update(index, { scanLimitDays: event.target.value === "" ? null : Number(event.target.value) })} className="w-32 rounded-lg border border-slate-300 px-3 py-2" /></td>
                  <td className="px-4 py-3"><input type="date" value={setting.validUntil} onChange={(event) => update(index, { validUntil: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" /></td>
                  <td className="px-4 py-3"><input type="checkbox" checked={setting.active} onChange={(event) => update(index, { active: event.target.checked })} className="h-5 w-5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => setSettings((current) => [...current, emptySetting()])} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Add course</button>
          <button onClick={save} disabled={loading || saving} className="rounded-lg bg-[#0C005B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save settings"}</button>
        </div>

      </section>
    </main>
  );
}