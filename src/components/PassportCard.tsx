"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { CheckCircle2, Download, Trophy } from "lucide-react";
import type { Guest } from "@/lib/types";
import { TOTAL_FLOORS } from "@/lib/stations";
import { getValidityLabel } from "@/lib/scanPolicy";
import ProgressBar from "./ProgressBar";
import FloorList from "./FloorList";

/**
 * The main passport "card". Shows guest info, a QR code, the progress bar,
 * the floor list, and a button to download the passport as an image.
 *
 * The QR code encodes the Passport ID. Staff scanner pages read this value
 * to identify the guest.
 */
export default function PassportCard({
  guest,
  showEventDetails,
}: {
  guest: Guest;
  showEventDetails: boolean;
}) {
  // We capture this DOM node and turn it into a PNG for download.
  const cardRef = useRef<HTMLDivElement>(null);

  const visibleFloors = showEventDetails ? 3 : TOTAL_FLOORS;
  const visibleCompleted = showEventDetails
    ? guest.floors.slice(0, 3).filter(Boolean).length
    : guest.completedCount;
  const allCompleted = showEventDetails && visibleCompleted >= visibleFloors;

  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // sharper image
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${guest.passportId}-passport.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download passport:", err);
      alert("Sorry, the passport image could not be created.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* The downloadable card area */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        {/* Card header */}
        <div className="brand-gradient px-6 py-5 text-white">
          <p className="text-xs uppercase tracking-widest text-white/80">
            HYT Digital Passport
          </p>
          <h1 className="mt-1 text-2xl font-bold">{guest.fullName}</h1>
          <p className="mt-1 font-mono text-sm text-white/90">
            {guest.passportId}
          </p>
          <p className="text-xs text-white/80">{guest.guestType}</p>
          <p className="mt-2 text-xs font-semibold text-white/90">
            {getValidityLabel(guest)}
          </p>
        </div>

        {/* QR code */}
        <div className="flex justify-center bg-white px-6 py-6">
          <div className="rounded-xl border border-slate-200 p-3">
            <QRCodeCanvas
              value={guest.passportId}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {showEventDetails && (
          <div className="space-y-5 px-6 pb-6">
            <ProgressBar completed={visibleCompleted} total={visibleFloors} />

          {/* Eligibility / congratulations message */}
            {allCompleted && (
            <div className="rounded-xl bg-amber-50 p-4 text-center ring-1 ring-brand-gold/30">
              <Trophy className="mx-auto h-8 w-8 text-brand-gold" aria-hidden="true" />
              <p className="mt-1 text-sm font-semibold text-amber-800">
                Congratulations! You have completed your HYT Digital Passport.
                Please proceed to the claiming booth for your certificate of
                participation or souvenir.
              </p>
              {guest.status === "Reward Claimed" && (
                <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Reward Claimed
                </p>
              )}
            </div>
          )}

            <FloorList floors={guest.floors} maxFloor={3} />
          </div>
        )}
      </div>

      {/* Download button (outside the captured card so it isn't in the image) */}
      <button
        onClick={handleDownload}
        className="mt-4 w-full rounded-xl bg-[#0C005B] px-4 py-3 font-semibold text-white shadow transition hover:bg-[#080046]"
      >
        <Download className="mr-2 inline h-4 w-4" aria-hidden="true" />
        Download / Save Passport as Image
      </button>
    </div>
  );
}
