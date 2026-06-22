"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Header from "@/components/Header";
import { STATIONS } from "@/lib/stations";

/**
 * Printable station QR codes (/admin/station-codes).
 *
 * Staff print this page and post one QR poster at each floor. A guest scans
 * the poster (with the in-app scanner OR their phone's native camera) to mark
 * that floor complete on their own passport.
 *
 * Each QR encodes a URL like:  https://your-site/complete/floor-2
 */
export default function StationCodesPage() {
  // We build the QR URLs from the live site origin so they work in dev and
  // in production without any config. Computed on the client to be exact.
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(
      process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    );
  }, []);

  return (
    <main>
      {/* Hidden when printing */}
      <div className="print:hidden">
        <Header subtitle="Printable station QR codes" />
      </div>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="print:hidden mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Station QR Codes
            </h1>
            <p className="text-sm text-slate-500">
              Print this page and post one QR at each floor. Guests scan it to
              complete the floor.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-brand-blue px-5 py-3 font-semibold text-white shadow hover:bg-blue-700"
          >
            🖨️ Print
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {STATIONS.map((station) => {
            const url = origin ? `${origin}/complete/${station.id}` : "";
            return (
              <div
                key={station.id}
                className="flex break-inside-avoid flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center"
              >
                <div className="text-4xl">{station.icon}</div>
                <h2 className="mt-2 text-lg font-bold text-slate-800">
                  Floor {station.floor}
                </h2>
                <p className="text-sm font-medium text-slate-700">
                  {station.name}
                </p>
                <p className="mb-4 text-xs text-slate-500">{station.activity}</p>

                {/* The actual scannable code */}
                <div className="rounded-xl border border-slate-200 p-3">
                  {url ? (
                    <QRCodeCanvas value={url} size={200} level="M" />
                  ) : (
                    <div className="h-[200px] w-[200px] animate-pulse bg-slate-100" />
                  )}
                </div>

                <p className="mt-3 text-base font-bold text-brand-purple">
                  Scan to complete this floor
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                  {url}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
