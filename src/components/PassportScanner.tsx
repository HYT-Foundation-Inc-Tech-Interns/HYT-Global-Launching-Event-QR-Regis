"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "./QrScanner";
import { extractStationId, getStationById } from "@/lib/stations";

/**
 * Guest self-scan panel, shown on the guest's own passport dashboard.
 *
 * The guest taps "Scan Station QR", points their phone at the printed QR
 * code posted at the floor, and the matching floor is marked complete on
 * THEIR passport. We already know who the guest is (passportId) because they
 * are on their own passport page, so no staff is needed.
 */
export default function PassportScanner({ passportId }: { passportId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); // is the camera showing?
  const [scanKey, setScanKey] = useState(0); // bump to restart the scanner
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function startScan() {
    setMessage("");
    setError("");
    setOpen(true);
    setScanKey((k) => k + 1);
  }

  async function handleScan(scannedText: string) {
    setOpen(false); // close the camera as soon as we get a code

    const stationId = extractStationId(scannedText);
    if (!stationId) {
      setError(
        "That doesn't look like an HYT station code. Please scan the QR poster at the floor."
      );
      return;
    }

    const station = getStationById(stationId);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportId,
          stationId,
          scannerPage: "guest-self-scan",
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadyCompleted) {
        setMessage(`⚠️ You already completed ${station?.name}.`);
      } else if (!res.ok) {
        throw new Error(data.error || "Could not record your stamp.");
      } else {
        setMessage(`✅ ${station?.name} completed! Your passport is updated.`);
        router.refresh(); // reload the page so new stamps show
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record your stamp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mb-6 w-full max-w-md rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {!open && (
        <>
          <div className="mb-3 text-center">
            <h2 className="text-base font-bold text-slate-800">
              Complete a floor
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Tap below and scan the QR poster at the floor to stamp it here — no
              typing, and no need to leave this page.
            </p>
          </div>
          <button
            onClick={startScan}
            disabled={busy}
            className="w-full rounded-xl bg-brand-blue px-4 py-4 text-lg font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : "📷 Scan Station QR"}
          </button>
        </>
      )}

      {open && (
        <div>
          <p className="mb-3 text-center text-sm font-medium text-slate-600">
            Point your camera at the QR poster on this floor.
          </p>
          <QrScanner key={scanKey} onScan={handleScan} onError={setError} />
          <button
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-center text-sm font-medium text-slate-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
