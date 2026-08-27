"use client";

import { flushSync } from "react-dom";
import { useState } from "react";
import Header from "@/components/Header";
import QrScanner from "@/components/QrScanner";
import ScannerBoundary from "@/components/ScannerBoundary";
import type { Guest } from "@/lib/types";
import { extractPassportId, extractPassportIdFromNfcRecord } from "@/lib/passport-id";

export default function AdminScanPage() {
  const [scanKey, setScanKey] = useState(0);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState("");

  async function scanGuest(value: string, source: "qr" | "nfc" = "qr") {
    const passportId = extractPassportId(value);
    setWorking(true);
    setError("");
    setGuest(null);
    setRemaining(null);
    setScannedAt(null);
    try {
      const response = await fetch("/api/admin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passportId, nfcId: source === "nfc" ? passportId : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not process scan.");
      setGuest(data.guest);
      setRemaining(data.remaining);
      setScannedAt(data.scannedAt);
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

    flushSync(() => setNfcReading(true));
    setError("");
    setNfcStatus("Starting NFC reader...");
    const Reader = (window as Window & { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (event: "reading" | "readingerror", handler: (event: { message?: { records: { data: DataView | ArrayBuffer | null; toText?: () => string | null; toUrl?: () => string | null }[] } }) => void) => void } }).NDEFReader;
    const reader = new Reader();
    let handled = false;

    reader.addEventListener("reading", (event) => {
      if (handled) return;
      const records = event.message?.records || [];
      const passportId = records.map(extractPassportIdFromNfcRecord).find(Boolean) || "";
      if (!passportId) {
        setError("This NFC tag has no valid passport URL. Try the HYT passport tag.");
        return;
      }
      handled = true;
      setNfcStatus(`Passport found: ${passportId}`);
      void scanGuest(passportId, "nfc");
    });
    reader.addEventListener("readingerror", () => {
      setError("The NFC tag could not be read. Hold it still near the phone.");
    });

    reader.scan()
      .then(() => {
        setNfcStatus("NFC reader active. Hold the passport tag near the back of the phone.");
      })
      .catch((error: unknown) => {
        setError(error instanceof Error ? error.message : "Could not read the NFC tag.");
        setNfcReading(false);
        setNfcStatus("");
      });
  }

  return (
    <main>
      <Header subtitle="Admin QR scanner" />
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Scan guest QR or NFC</h1>
          <p className="mt-2 text-sm text-slate-500">Each successful scan reduces the guest&apos;s remaining limit by one.</p>
          {!nfcReading && (
            <div className="mt-5 overflow-hidden rounded-xl bg-black">
              <ScannerBoundary>
                <QrScanner key={scanKey} onScan={scanGuest} onError={setError} />
              </ScannerBoundary>
            </div>
          )}

          <button
            type="button"
            onClick={scanNfc}
            disabled={nfcReading || working}
            className="mt-4 w-full rounded-xl border-2 border-[#0C005B] px-4 py-3 font-semibold text-[#0C005B] hover:bg-slate-50 disabled:opacity-60"
          >
            {nfcReading ? "Hold NFC tag near device..." : "Scan NFC tag"}
          </button>
          {nfcStatus && <p className="mt-2 text-xs text-slate-500">{nfcStatus}</p>}

          {working && <p className="mt-4 text-sm font-medium text-slate-600">Processing scan...</p>}
          {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
          {guest && (
            <div className="mt-5 rounded-xl bg-green-50 p-4 text-left ring-1 ring-green-200">
              <p className="text-lg font-bold text-green-800">Scan complete</p>
              <p className="mt-1 text-sm text-slate-700">{guest.fullName}</p>
              <p className="font-mono text-xs text-slate-500">Code: {guest.passportId}</p>
              <p className="text-sm text-slate-700">Position: {guest.guestType}</p>
              {scannedAt && (
                <p className="mt-3 border-t border-green-200 pt-3 text-sm text-green-800">
                  {new Date(scannedAt).toLocaleDateString()} at {new Date(scannedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}