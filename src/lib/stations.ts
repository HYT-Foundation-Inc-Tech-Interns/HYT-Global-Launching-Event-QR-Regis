/**
 * Central configuration for the event's floors / stations.
 *
 * This is the ONE place to edit if you want to change floor names,
 * activities, icons, or add/remove floors. The rest of the app reads
 * from here, so keeping it in sync is easy.
 *
 * NOTE: If you change the NUMBER of floors, also update the "Guests"
 * sheet to have matching Floor columns (see README).
 */

export interface Station {
  id: string; // used in the scanner URL, e.g. "floor-1"
  floor: number; // 1-based floor number
  name: string; // station name shown to guests/staff
  activity: string; // the activity performed at the station
  icon: string; // emoji used as the "digital stamp"
  scannerLink: string; // staff scanner page path
}

export const STATIONS: Station[] = [
  {
    id: "floor-1",
    floor: 1,
    name: "Registration / Welcome Station",
    activity: "Check-in & Welcome",
    icon: "🎫",
    scannerLink: "/admin/scan/floor-1",
  },
  {
    id: "floor-2",
    floor: 2,
    name: "Food & Beverage Experience",
    activity: "Tasting & Service Demo",
    icon: "🍽️",
    scannerLink: "/admin/scan/floor-2",
  },
  {
    id: "floor-3",
    floor: 3,
    name: "Housekeeping Professional Room",
    activity: "Housekeeping Skills",
    icon: "🛎️",
    scannerLink: "/admin/scan/floor-3",
  },
  {
    id: "floor-4",
    floor: 4,
    name: "Events Management Room",
    activity: "Event Planning Challenge",
    icon: "🎉",
    scannerLink: "/admin/scan/floor-4",
  },
  {
    id: "floor-5",
    floor: 5,
    name: "Computer Servicing / Contact Center Simulation",
    activity: "Tech & Support Simulation",
    icon: "💻",
    scannerLink: "/admin/scan/floor-5",
  },
];

// Total number of floors a guest must complete.
export const TOTAL_FLOORS = STATIONS.length;

// Helper: find a station by its id (e.g. "floor-3"). Returns undefined if missing.
export function getStationById(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/**
 * Figure out which station a scanned QR code refers to.
 *
 * The station QR codes encode a URL like:  https://your-site/complete/floor-2
 * But a QR might also contain just the plain id "floor-2". This helper accepts
 * both: it pulls the last path segment out of a URL (ignoring any query/hash)
 * and checks it against our known station ids.
 *
 * Returns the station id (e.g. "floor-2") or undefined if it's not one of ours.
 */
export function extractStationId(scannedText: string): string | undefined {
  const text = scannedText.trim();

  // Case 1: the QR was just the plain id.
  if (getStationById(text)) return text;

  // Case 2: the QR was a URL. Take the part after the last "/", then drop
  // anything after a "?" or "#".
  const lastSegment = text.split("/").pop() || "";
  const cleaned = lastSegment.split(/[?#]/)[0];
  if (getStationById(cleaned)) return cleaned;

  return undefined;
}
