"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import type { Guest } from "@/lib/types";

/**
 * Admin dashboard (/admin/dashboard).
 *
 * Shows summary numbers, a searchable guest list, and a "Claim Reward"
 * action for guests who have completed all floors.
 */

interface ApiResponse {
  summary: {
    totalGuests: number;
    completedAll: number;
    rewardsClaimed: number;
    totalFloors: number;
  };
  guests: Guest[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/guests", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load guests.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Filter the guest list by name or passport ID.
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.guests;
    return data.guests.filter(
      (g) =>
        g.fullName.toLowerCase().includes(q) ||
        g.passportId.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function claim(passportId: string) {
    setClaiming(passportId);
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passportId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not claim reward.");
      await load(); // refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not claim reward.");
    } finally {
      setClaiming(null);
    }
  }

  const totalFloors = data?.summary.totalFloors ?? 5;

  return (
    <main>
      <Header subtitle="Admin dashboard" />
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <button
            onClick={load}
            className="rounded-lg bg-[#0C005B] px-4 py-2 text-sm font-medium text-white hover:bg-[#080046]"
          >
            ⟳ Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Registered"
            value={data?.summary.totalGuests ?? "—"}
            color="text-brand-blue"
          />
          <StatCard
            label="Completed All Floors"
            value={data?.summary.completedAll ?? "—"}
            color="text-brand-purple"
          />
          <StatCard
            label="Rewards Claimed"
            value={data?.summary.rewardsClaimed ?? "—"}
            color="text-brand-gold"
          />
        </div>

        {/* Search */}
        <div className="mt-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or Passport ID..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {/* Guest table */}
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Passport ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Floors</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading guests...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No guests found.
                  </td>
                </tr>
              )}

              {filtered.map((g) => (
                <tr key={g.passportId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={g.passportLink}
                      className="text-brand-purple hover:underline"
                    >
                      {g.passportId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {g.fullName}
                    <span className="block text-xs font-normal text-slate-400">
                      {g.organization}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {g.completedCount}/{totalFloors}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="px-4 py-3">
                    {g.completedCount >= totalFloors &&
                    g.status !== "Reward Claimed" ? (
                      <button
                        onClick={() => claim(g.passportId)}
                        disabled={claiming === g.passportId}
                        className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {claiming === g.passportId
                          ? "..."
                          : "Mark Claimed"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Guest["status"] }) {
  const styles: Record<Guest["status"], string> = {
    Incomplete: "bg-slate-100 text-slate-600",
    Completed: "bg-green-100 text-green-700",
    "Reward Claimed": "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
