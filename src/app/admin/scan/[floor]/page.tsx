"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import QrScanner from "@/components/QrScanner";
import { getStationById } from "@/lib/stations";
import type { Guest } from "@/lib/types";

/**
 * Staff scanner page.
 *
 * One page handles every floor via the [floor] route segment:
 *   /admin/scan/floor-1 ... /admin/scan/floor-5
 *
 * Flow:
 *  1. Camera scans the guest's QR code (the Passport ID).
 *  2. We fetch and show the guest's details.
 *  3. Staff confirms -> POST /api/stamp marks this floor complete.
 *  4. Duplicate stamps are blocked by the backend (shows a friendly message).
 */

type Phase = "scanning" | "confirming" | "done";

export default function ScannerPage() {
  const params = useParams<{ floor: string }>();
  const stationId = params.floor; // e.g. "floor-2"
  const station = getStationById(stationId);

  const [phase, setPhase] = useState<Phase>("scanning");
  const [scanKey, setScanKey] = useState(0); // bump to remount the scanner
  const [guest, setGuest] = useState<Guest | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  // Guard against an unknown floor in the URL.
  if (!station) {
    return (
      <main>
        <Header subtitle="Staff scanner" />
        <p className="px-4 py-16 text-center text-slate-600">
          Unknown station: <span className="font-mono">{stationId}</span>
        </p>
      </main>
    );
  }

  // Reset back to scanning for the next guest.
  function scanNext() {
    setGuest(null);
    setMessage("");
    setError("");
    setPhase("scanning");
    setScanKey((k) => k + 1);
  }

  // Step 1 -> 2: a QR code was decoded. Look up the guest.
  async function handleScan(passportId: string) {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/passport/${encodeURIComponent(passportId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Guest not found.");
      setGuest(data.guest);
      setPhase("confirming");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
      setPhase("confirming"); // show the error with a "scan again" button
    }
  }

  // Step 3: confirm completion for this floor.
  async function confirmStamp() {
    if (!guest) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportId: guest.passportId,
          stationId: station!.id,
          scannerPage: station!.scannerLink,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadyCompleted) {
        setMessage(`⚠️ ${guest.fullName} already completed this floor.`);
        if (data.guest) setGuest(data.guest);
      } else if (!res.ok) {
        throw new Error(data.error || "Could not record the stamp.");
      } else {
        setGuest(data.guest);
        setMessage(`✅ ${data.guest.fullName} is stamped for ${station!.name}!`);
      }
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the stamp.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main>
      <Header subtitle={`Scanner — Floor ${station.floor}`} />
      <section className="mx-auto max-w-md px-4 py-6">
        {/* Station banner */}
        <div className="mb-5 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-4xl">{station.icon}</div>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            Floor {station.floor}: {station.name}
          </h1>
          <p className="text-sm text-slate-500">{station.activity}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {/* Phase 1: scanning */}
        {phase === "scanning" && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="mb-3 text-center text-sm font-medium text-slate-600">
              Point the camera at the guest&apos;s passport QR code.
            </p>
            <QrScanner key={scanKey} onScan={handleScan} onError={setError} />
          </div>
        )}

        {/* Phase 2 & 3: confirming / done — show guest + action buttons */}
        {(phase === "confirming" || phase === "done") && guest && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Guest
            </p>
            <p className="text-lg font-bold text-slate-800">{guest.fullName}</p>
            <p className="font-mono text-sm text-slate-500">
              {guest.passportId}
            </p>
            <p className="text-sm text-slate-500">{guest.organization}</p>
            <p className="mt-1 text-sm text-slate-500">
              Progress: {guest.completedCount}/{5}
            </p>

            {message && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-sm font-medium text-slate-700">
                {message}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {phase === "confirming" && (
                <button
                  onClick={confirmStamp}
                  disabled={working}
                  className="w-full rounded-xl bg-[#0C005B] px-4 py-4 text-lg font-bold text-white shadow transition hover:bg-[#080046] disabled:opacity-60"
                >
                  {working ? "Saving..." : `Confirm Floor ${station.floor} ✓`}
                </button>
              )}
              <button
                onClick={scanNext}
                className="w-full rounded-xl bg-[#0C005B] px-4 py-3 font-semibold text-white transition hover:bg-[#080046]"
              >
                {phase === "done" ? "Scan Next Guest" : "Cancel / Scan Again"}
              </button>
            </div>
          </div>
        )}

        {/* If lookup failed there is no guest to show. */}
        {phase === "confirming" && !guest && (
          <button
            onClick={scanNext}
            className="w-full rounded-xl bg-[#0C005B] px-4 py-3 font-semibold text-white transition hover:bg-[#080046]"
          >
            Scan Again
          </button>
        )}
      </section>
    </main>
  );
}
