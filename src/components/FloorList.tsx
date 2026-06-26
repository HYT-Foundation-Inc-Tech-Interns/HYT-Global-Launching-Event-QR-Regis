"use client";

import { useState } from "react";
import { STATIONS } from "@/lib/stations";

/**
 * Lists every floor/station with a "Completed" or "Not Completed" status.
 * Completed floors show their digital stamp icon.
 */
export default function FloorList({ floors }: { floors: boolean[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggleFloor(index: number) {
    setOpenIndex((current) => (current === index ? null : index));
  }

  return (
    <ul className="space-y-3">
      {STATIONS.map((station, index) => {
        const done = floors[index];
        const open = openIndex === index;
        const description = station.description ?? "";
        const lines = description.split("\n");
        const titleLine = lines[0]?.trim();
        const bodyText = lines.slice(1).join("\n");
        const hasTitle = titleLine === "HYT Digital Passport";

        return (
          <li
            key={station.id}
            className={`rounded-xl border bg-white p-3 transition-shadow duration-200 ${
              done
                ? "border-brand-gold/40 bg-amber-50 shadow-sm"
                : "border-slate-200 shadow-none"
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`floor-info-${station.id}`}
                onClick={() => toggleFloor(index)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition duration-200 ${
                  done
                    ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <svg
                  className={`h-5 w-5 transition-transform duration-200 ${
                    open ? "rotate-90" : "rotate-0"
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {station.icon ? (
                    <span className="text-2xl text-slate-700">{station.icon}</span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      Floor {station.floor} {station.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {station.activity}
                    </p>
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  done
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? "Completed" : "Not Completed"}
              </span>
            </div>

            <div
              id={`floor-info-${station.id}`}
              className={`overflow-hidden transition-all duration-200 ${
                open ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {station.description ? (
                <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {hasTitle ? <h4 className="text-base font-semibold text-slate-800">{titleLine}</h4> : null}
                  <div className="floor-description-scroll whitespace-pre-line">
                    {bodyText.trim()}
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
