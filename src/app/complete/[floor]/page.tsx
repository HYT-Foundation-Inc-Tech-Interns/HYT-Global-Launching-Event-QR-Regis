"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { getStationById } from "@/lib/stations";
import type { Guest } from "@/lib/types";

/**
 * Floor completion page (/complete/[floor]).
 *
 * This is where a guest lands when they scan a floor's QR poster with their
 * phone's NATIVE camera (the station QR codes encode this URL).
 *
 * We need to know which guest is scanning. We try, in order:
 *   1. ?pid=HYT-2026-0001 in the URL (if present)
 *   2. the Passport ID saved in localStorage (set when they viewed their passport)
 *   3. ask them to type it (shown on their passport)
 *
 * Then they confirm and the floor is stamped via /api/stamp.
 */
export default function CompletePage() {
  const params = useParams<{ floor: string }>();
  const searchParams = useSearchParams();
  const station = getStationById(params.floor);

  const [passportId, setPassportId] = useState("");
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [message, setMessage] = useState("");

  // On mount, try to auto-fill the Passport ID.
  useEffect(() => {
    const fromUrl = searchParams.get("pid");
    if (fromUrl) {
      setPassportId(fromUrl.trim());
      setLoadedFromStorage(true);
      return;
    }
    try {
      const saved = localStorage.getItem("hyt_passport_id");
      if (saved) {
        setPassportId(saved);
        setLoadedFromStorage(true);
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  if (!station) {
    return (
      <main>
        <Header subtitle="Complete floor" />
        <p className="px-4 py-16 text-center text-slate-600">
          Unknown floor: <span className="font-mono">{params.floor}</span>
        </p>
      </main>
    );
  }

  async function submit() {
    const id = passportId.trim();
    if (!id) {
      setError("Please enter your Passport ID (shown on your passport).");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      // Remember for next time on this device.
      try {
        localStorage.setItem("hyt_passport_id", id);
      } catch {
        // ignore
      }

      const res = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportId: id,
          stationId: station!.id,
          scannerPage: "guest-self-scan",
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadyCompleted) {
        setGuest(data.guest || null);
        setMessage(`⚠️ You already completed ${station!.name}.`);
        setDone(true);
      } else if (!res.ok) {
        throw new Error(data.error || "Could not record your stamp.");
      } else {
        setGuest(data.guest);
        setMessage(`✅ ${station!.name} completed!`);
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record your stamp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <Header subtitle={`Floor ${station.floor}`} />
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-5xl">{station.icon}</div>
          <h1 className="mt-2 text-xl font-bold text-slate-800">
            Floor {station.floor}: {station.name}
          </h1>
          <p className="text-sm text-slate-500">{station.activity}</p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {/* After success / already-completed */}
          {done ? (
            <div className="mt-5">
              <div className="rounded-lg bg-slate-50 p-4 text-base font-semibold text-slate-700">
                {message}
              </div>
              {guest && (
                <p className="mt-3 text-sm text-slate-500">
                  Progress: {guest.completedCount}/5 floors completed
                </p>
              )}
              <Link
                href={`/passport/${encodeURIComponent(passportId)}`}
                className="mt-5 inline-block w-full rounded-xl bg-brand-purple px-4 py-3 font-semibold text-white"
              >
                View My Passport
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {!loadedFromStorage && (
                <p className="text-sm text-slate-600">
                  Enter your Passport ID to mark this floor complete:
                </p>
              )}
              <input
                value={passportId}
                onChange={(e) => setPassportId(e.target.value)}
                placeholder="e.g. HYT-2026-0001"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <button
                onClick={submit}
                disabled={busy}
                className="w-full rounded-xl bg-green-600 px-4 py-4 text-lg font-bold text-white shadow transition hover:bg-green-700 disabled:opacity-60"
              >
                {busy ? "Saving..." : `Complete Floor ${station.floor} ✓`}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
