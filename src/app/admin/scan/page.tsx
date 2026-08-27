"use client";

import { useState } from "react";
import Header from "@/components/Header";
import QrScanner from "@/components/QrScanner";
import ScannerBoundary from "@/components/ScannerBoundary";
import type { Guest } from "@/lib/types";

export default function AdminScanPage() {
  const [scanKey, setScanKey] = useState(0);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);

  function getPassportId(value: string): string {
    const normalized = value.trim();
    const match = normalized.match(/\/passport\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : normalized;
  }

  async function scanGuest(value: string) {
    const passportId = getPassportId(value);
    setWorking(true);
    setError("");
    setGuest(null);
    setRemaining(null);
    try {
      const response = await fetch("/api/admin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passportId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not process scan.");
      setGuest(data.guest);
      setRemaining(data.remaining);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Could not process scan.");
    } finally {
      setWorking(false);
      setNfcReading(false);
      setScanKey((key) => key + 1);
    }
  }

  async function scanNfc() {
    if (!("NDEFReader" in window)) {
      setError("NFC reading is supported on compatible Android browsers only.");
      return;
    }

    setNfcReading(true);
    setError("");
    try {
      const Reader = (window as Window & { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (event: "reading", handler: (event: { message: { records: { recordType: string; data: ArrayBuffer }[] } }) => void, options?: { once?: boolean }) => void } }).NDEFReader;
      const reader = new Reader();
      reader.addEventListener("reading", (event) => {
        const record = event.message.records[0];
        if (!record) throw new Error("The NFC tag has no passport URL.");
        const value = new TextDecoder().decode(record.data);
        const match = value.match(/\/passport\/([^/?#]+)/);
        if (!match) throw new Error("The NFC tag does not contain a guest passport URL.");
        void scanGuest(value);
      }, { once: true });
      await reader.scan();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read the NFC tag.");
      setNfcReading(false);
    }
  }

  return (
    <main>
      <Header subtitle="Admin QR scanner" />
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Scan guest QR or NFC</h1>
          <p className="mt-2 text-sm text-slate-500">Each successful scan reduces the guest&apos;s remaining limit by one.</p>
          <div className="mt-5 overflow-hidden rounded-xl bg-black">
            <ScannerBoundary>
              <QrScanner key={scanKey} onScan={scanGuest} onError={setError} />
            </ScannerBoundary>
          </div>

          <button
            type="button"
            onClick={scanNfc}
            disabled={nfcReading || working}
            className="mt-4 w-full rounded-xl border-2 border-[#0C005B] px-4 py-3 font-semibold text-[#0C005B] hover:bg-slate-50 disabled:opacity-60"
          >
            {nfcReading ? "Hold NFC tag near device..." : "Scan NFC tag"}
          </button>

          {working && <p className="mt-4 text-sm font-medium text-slate-600">Processing scan...</p>}
          {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
          {guest && (
            <div className="mt-5 rounded-xl bg-green-50 p-4 text-left ring-1 ring-green-200">
              <p className="font-semibold text-green-800">Scan accepted</p>
              <p className="mt-1 text-sm text-slate-700">{guest.fullName}</p>
              <p className="font-mono text-xs text-slate-500">{guest.passportId}</p>
              <p className="mt-3 text-sm font-bold text-green-800">Scans remaining: {remaining}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}