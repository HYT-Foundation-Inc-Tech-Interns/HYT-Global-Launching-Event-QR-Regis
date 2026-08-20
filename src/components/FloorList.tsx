"use client";

import { useState } from "react";
import { STATIONS } from "@/lib/stations";
import StampIcon from "./StampIcon";

/**
 * Decide whether a description line is a "header" worth emboldening:
 * floor titles, room headers (and the room name right after them),
 * activities, and section labels that end with a colon.
 *
 * `prevLine` is the line above, used to bold a room's name which sits
 * directly under its "ROOM xxx" header.
 */
function isHeaderLine(line: string, prevLine: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Floor titles, e.g. "4TH FLOOR", "5TH FLOOR".
  if (/^\d+(st|nd|rd|th)\s+floor\b/i.test(t)) return true;
  // Room headers, e.g. "ROOM 301 :", "ROOM 401".
  if (/^room\s*\d+/i.test(t)) return true;
  // The room name sitting directly under a "ROOM xxx" header.
  if (/^room\s*\d+/i.test(prevLine.trim())) return true;
  // Activities, e.g. "Activity:", "Activity 1: ...".
  if (/^activity(\s*\d+)?\b/i.test(t)) return true;
  // Other named sections, e.g. "Theme: ...", "Purpose:", "Program:".
  if (/^(theme|purpose|program|simulation|demonstration|presentation)\b/i.test(t))
    return true;
  // Generic section labels that end with a colon, e.g. "Required Materials:".
  if (/:\s*$/.test(t)) return true;
  return false;
}

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
        // Only Floor 1 carries the "HYT Digital Passport" heading; every other
        // floor's first line is real content, so keep it.
        const hasTitle = lines[0]?.trim() === "HYT Digital Passport";
        const titleLine = hasTitle ? lines[0].trim() : null;
        // Drop any leading/trailing blank lines from the body.
        const bodyLines = (hasTitle ? lines.slice(1) : lines)
          .join("\n")
          .replace(/^\n+|\n+$/g, "")
          .split("\n");

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

              <span
                aria-label={done ? `Floor ${station.floor} completed` : `Floor ${station.floor} not completed`}
                title={done ? `Floor ${station.floor} completed` : `Floor ${station.floor} not completed`}
                className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "border-4 border-brand-blue bg-white p-1"
                    : "border-4 border-brand-blue bg-white"
                }`}
              >
                {done ? (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-blue">
                    <StampIcon
                      floor={station.floor}
                      className="h-8 w-8 text-white"
                    />
                  </span>
                ) : (
                  <span className="sr-only">Not Completed</span>
                )}
                {done ? <span className="sr-only">Completed</span> : null}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
                    {bodyLines.map((line, i) => (
                      <span key={i}>
                        {isHeaderLine(line, bodyLines[i - 1] ?? "") ? (
                          <strong className="font-semibold text-slate-800">
                            {line}
                          </strong>
                        ) : (
                          line
                        )}
                        {i < bodyLines.length - 1 ? "\n" : null}
                      </span>
                    ))}
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
