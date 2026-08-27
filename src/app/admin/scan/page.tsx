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
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);

  function getPassportId(value: string): string {
    const match = value.trim().match(/\bHYT-[A-Z0-9-]+\b/i);
    return match ? match[0] : "";
  }

  function getPassportIdFromNfcRecord(record: {
    data: DataView | ArrayBuffer | null;
    toText?: () => string | null;
    toUrl?: () => string | null;
  }): string {
    if (record.toUrl) {
      const url = record.toUrl();
      if (url) return getPassportId(url);
    }
    if (record.toText) {
      const text = record.toText();
      if (text) return getPassportId(text);
    }
    if (!record.data) return "";
    const data = record.data instanceof DataView
      ? new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength)
      : new Uint8Array(record.data);
    const decoder = new TextDecoder();
    const candidates = [decoder.decode(data)];
    if (data.length > 1) {
      const languageLength = data[0] & 0x3f;
      candidates.push(decoder.decode(data.slice(languageLength + 1)));
    }
    return candidates.map(getPassportId).find(Boolean) || "";
  }

  async function scanGuest(value: string, source: "qr" | "nfc" = "qr") {
    const passportId = getPassportId(value);
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

    setNfcReading(true);
    setError("");
    try {
      const Reader = (window as Window & { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (event: "reading" | "readingerror", handler: (event: { message?: { records: { data: DataView | ArrayBuffer | null; toText?: () => string | null; toUrl?: () => string | null }[] } }) => void, options?: { once?: boolean }) => void } }).NDEFReader;
      const reader = new Reader();
      reader.addEventListener("reading", (event) => {
        const records = event.message?.records || [];
        const passportId = records.map(getPassportIdFromNfcRecord).find(Boolean) || "";
        if (!/^HYT-[A-Z0-9-]+$/i.test(passportId)) {
          setError("The NFC tag has no valid passport ID.");
          setNfcReading(false);
          return;
        }
        void scanGuest(passportId, "nfc");
      }, { once: true });
      reader.addEventListener("readingerror", () => {
        setError("The NFC tag could not be read. Hold it still near the phone.");
        setNfcReading(false);
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
              <p className="text-lg font-bold text-green-800">Scan accepted</p>
              <p className="mt-1 text-sm text-slate-700">{guest.fullName}</p>
              <p className="font-mono text-xs text-slate-500">{guest.passportId}</p>
              {scannedAt && (
                <div className="mt-3 border-t border-green-200 pt-3 text-sm text-green-800">
                  <p className="font-semibold">date and time</p>
                  <p>{new Date(scannedAt).toLocaleDateString()} at {new Date(scannedAt).toLocaleTimeString()}</p>
                </div>
              )}
              <p className="mt-3 text-sm font-bold text-green-800">Scans remaining: {remaining}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}