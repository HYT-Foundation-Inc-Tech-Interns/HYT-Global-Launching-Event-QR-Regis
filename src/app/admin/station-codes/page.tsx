 "use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import Header from "@/components/Header";
import { Download, FilePenLine } from "lucide-react";
import { STATIONS } from "@/lib/stations";
import StampIcon from "@/components/StampIcon";

/**
 * Staff-only station QR images (/admin/station-codes).
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
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setOrigin(
      process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    );
  }, []);

  async function downloadCode(id: string, filename: string) {
    const card = cardRefs.current[id];
    if (!card) return;
    const dataUrl = await toPng(card, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <main>
      <Header subtitle="Administrator Portal" />

      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Station QR Images
            </h1>
            <p className="text-sm text-slate-500">
              Save each labeled QR image for staff use. The source page is protected.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Registration QR — guests scan this (e.g. at the entrance) to
              open the registration form on their own phone. */}
          <div ref={(element) => { cardRefs.current.register = element; }} className="flex flex-col items-center rounded-2xl border-2 border-brand-purple bg-white p-6 text-center">
            <FilePenLine className="h-10 w-10 text-brand-purple" aria-hidden="true" />
            <h2 className="mt-2 text-lg font-bold text-slate-800">Register</h2>
            <p className="text-sm font-medium text-slate-700">
              Get your HYT Digital Passport
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Scan with your phone to sign up
            </p>

            <div className="rounded-xl border border-slate-200 p-3">
              {origin ? (
                <QRCodeCanvas value={`${origin}/register`} size={200} level="M" />
              ) : (
                <div className="h-[200px] w-[200px] animate-pulse bg-slate-100" />
              )}
            </div>

            <p className="mt-3 text-base font-bold text-brand-purple">
              Scan to Register
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
              {origin ? `${origin}/register` : ""}
            </p>
            <button onClick={() => downloadCode("register", "hyt-register-qr")} className="mt-4 rounded-xl bg-[#0C005B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#080046]">
              <Download className="mr-2 inline h-4 w-4" aria-hidden="true" />Save image
            </button>
          </div>

          {STATIONS.map((station) => {
            const url = origin ? `${origin}/complete/${station.id}` : "";
            return (
              <div
                key={station.id}
                ref={(element) => { cardRefs.current[station.id] = element; }}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center"
              >
                <StampIcon
                  floor={station.floor}
                  className="h-10 w-10 text-brand-gold"
                />
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
                <button onClick={() => downloadCode(station.id, `hyt-floor-${station.floor}-${station.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)} className="mt-4 rounded-xl bg-[#0C005B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#080046]">
                  <Download className="mr-2 inline h-4 w-4" aria-hidden="true" />Save image
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
