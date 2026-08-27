"use client";

import { useState } from "react";
import { Radio } from "lucide-react";

export default function NfcPassportWriter({ passportId }: { passportId: string }) {
  const [status, setStatus] = useState("");
  const [writing, setWriting] = useState(false);
  const nfcUrl = `https://hyt-passport.hytfoundationinterns-dreamacademy.workers.dev/passport/${encodeURIComponent(passportId)}`;
  async function writeNfc() {
    if (!("NDEFReader" in window)) {
      setStatus("NFC writing is supported on compatible Android browsers only.");
      return;
    }

    setWriting(true);
    setStatus("");
    try {
      const Reader = (window as Window & { NDEFReader: new () => { write: (message: { records: { recordType: string; data: string }[] }) => Promise<void> } }).NDEFReader;
      const reader = new Reader();
      await reader.write({ records: [{ recordType: "url", data: nfcUrl }] });
      setStatus("NFC tag written successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not write the NFC tag.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-brand-purple" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800">NFC passport</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">Write the guest passport URL to an NFC tag.</p>
      <button
        type="button"
        onClick={writeNfc}
        disabled={writing}
        className="mt-3 w-full rounded-lg bg-[#0C005B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#080046] disabled:opacity-60"
      >
        {writing ? "Hold tag near device..." : "Create NFC tag"}
      </button>
      {status && <p className="mt-3 text-xs text-slate-600">{status}</p>}
    </div>
  );
}