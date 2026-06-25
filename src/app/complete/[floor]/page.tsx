"use client";

import { useEffect, useRef, useState } from "react";
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
 * Goal: zero typing. We figure out who is scanning, in order:
 *   1. ?pid=HYT-2026-0001 in the URL (if present)
 *   2. the Passport ID saved in localStorage (set when they viewed their
 *      passport on this device)
 * If we find an ID either way, we stamp this floor IMMEDIATELY on load — the
 * guest just sees "✅ completed". Only if we cannot identify them do we fall
 * back to asking them to type their Passport ID.
 */
export default function CompletePage() {
  const params = useParams<{ floor: string }>();
  const searchParams = useSearchParams();
  const station = getStationById(params.floor);

  const [passportId, setPassportId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [message, setMessage] = useState("");
  // Make sure the automatic stamp only ever fires once, even across the
  // re-renders / double-invoked effects of React 18 strict mode.
  const autoStampStarted = useRef(false);

  /**
   * Send the stamp for a known Passport ID. Shared by the automatic stamp on
   * load and the manual fallback button.
   */
  async function stampWith(rawId: string) {
    const id = rawId.trim();
    if (!id || !station) {
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
        // ignore (private mode, etc.)
      }

      const res = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportId: id,
          stationId: station.id,
          scannerPage: "guest-self-scan",
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadyCompleted) {
        setGuest(data.guest || null);
        setMessage(`⚠️ You already completed ${station.name}.`);
        setDone(true);
      } else if (!res.ok) {
        throw new Error(data.error || "Could not record your stamp.");
      } else {
        setGuest(data.guest);
        setMessage(`✅ ${station.name} completed!`);
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record your stamp.");
    } finally {
      setBusy(false);
    }
  }

  // On mount: find the Passport ID and, if we have one, stamp immediately.
  useEffect(() => {
    if (autoStampStarted.current) return;

    let id = (searchParams.get("pid") || "").trim();
    if (!id) {
      try {
        id = (localStorage.getItem("hyt_passport_id") || "").trim();
      } catch {
        // ignore
      }
    }

    if (id) {
      autoStampStarted.current = true;
      setPassportId(id);
      void stampWith(id);
    }
    // We only want this to run once, keyed on the incoming URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          {done ? (
            /* Success / already-completed */
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
          ) : busy ? (
            /* Auto-stamping in progress — guest did nothing but scan. */
            <div className="mt-6 flex flex-col items-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand-blue" />
              <p className="mt-4 text-base font-semibold text-slate-700">
                Stamping your passport…
              </p>
            </div>
          ) : (
            /* Fallback: we could not identify the guest on this device. */
            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-600">
                Enter your Passport ID to mark this floor complete:
              </p>
              <input
                value={passportId}
                onChange={(e) => setPassportId(e.target.value)}
                placeholder="e.g. HYT-2026-0001"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <button
                onClick={() => stampWith(passportId)}
                disabled={busy}
                className="w-full rounded-xl bg-green-600 px-4 py-4 text-lg font-bold text-white shadow transition hover:bg-green-700 disabled:opacity-60"
              >
                {`Complete Floor ${station.floor} ✓`}
              </button>
              <p className="pt-1 text-xs text-slate-400">
                Tip: open your passport and tap{" "}
                <span className="font-semibold">“📷 Scan Station QR”</span> to
                stamp floors without typing your ID each time.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
