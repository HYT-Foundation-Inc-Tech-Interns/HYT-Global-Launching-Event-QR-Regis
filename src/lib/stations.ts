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
  description?: string; // optional details shown in the floor dropdown
  icon?: string; // optional emoji "digital stamp" (omitted = no icon shown)
  scannerLink: string; // staff scanner page path
}

export const STATIONS: Station[] = [
  {
    id: "floor-1",
    floor: 1,
    name: "",
    activity: "HYT Gateway Experience",
    description: `HYT Digital Passport

Guests receive a QR-based digital passport.
Each floor has a station where guests scan QR codes and complete activities.
After completing all floors:

→ Guest receives a certificate of participation / souvenir.

Required Materials:
● QR codes
● Registration QR poster (guests register on their own phones)
● Welcome signage
● Event badges
● Directional boards`,
    scannerLink: "/admin/scan/floor-1",
  },
  {
    id: "floor-2",
    floor: 2,
    name: "",
    activity: "Technology Innovation Hub",
    description:`Activity 1: Millennium Interactive Challenge

Using the dynamic touch panel:

Guests experience:

● Interactive company presentation
● HYT virtual tour
● Training course showcase
● Business ecosystem map

Activity 2: Future Classroom Demonstration

Simulation:
"How modern training will look in the future"

Demonstrate:

● Digital learning
● Interactive presentations
● Online class capability
● Smart classroom setup

Activity 3: Build Your Career Path

Interactive touchscreen activity:

Guest selects:
"Student"
"Professional"
"Business Owner"

System shows possible HYT pathway:
Training → Certification → Employment → Global Opportunity`,

    scannerLink: "/admin/scan/floor-2",
  },
  {
    id: "floor-3",
    floor: 3,
    name: "",
    activity: "Training Excellence Center",
    description:
      `ROOM 301 : 
    Food & Beverage Experience Room

Activity: "Mini Barista Experience"

Guests:

● Learn coffee preparation basics
● Experience beverage creation
● See training equipment

ROOM 302
Housekeeping Professional Room

Activity:"Hotel Room Setup Challenge"

Demonstration:

● Proper bed preparation
● Hospitality standards
● Room inspection checklist

ROOM 303
Events Management Room

Activity: "Create Your Event"
Using the touchscreen:
Guests design:
● Event concept
● Program flow
● Marketing materials

ROOM 304
Computer Servicing Room

Activity: "Technology Diagnosis Challenge"

Guests experience:
● Hardware identification
● Troubleshooting simulation

ROOM 305
Contact Center Simulation Room

Activity:"Customer Service Experience"

Simulation:

● Handling customer concerns
● Communication challenge`,
    scannerLink: "/admin/scan/floor-3",
  },
  {
    id: "floor-4",
    floor: 4,
    name: "",
    activity: "Career & Business Solutions Floor",
    description:`4TH FLOOR
"Career & Business Solutions Floor"

Purpose:
Showcase company ecosystem.

ROOM 401
International Manpower Agency

Theme: "From Skills to Global Careers"
Activity: Global Career Map
Guests explore:
Philippines → International Opportunities

Show:
● Career destinations
● Requirements
● Process

ROOM 402
Manpower Solutions Company

Activity: "Workforce Management Simulation"

Show: How companies solve manpower requirements.

ROOM 403
Marketing Strategy Company
Activity:"Brand Building Challenge"

Guests create:

● Business slogan
● Marketing idea
● Digital campaign concept

ROOM 404
Law Firm

Activity: "Business Protection Awareness"

Presentation:

● Business registration
● Compliance
● Legal support

ROOM 405
Executive Networking Room

VIP discussions

● Partners
● Investors
● Guests`,
    scannerLink: "/admin/scan/floor-4",
  },
  {
    id: "5th-floor",
    floor: 5,
    name: "",
    activity: "Grand Launching & Future Vision Hall",
    description: `5TH FLOOR
"Grand Launching & Future Vision Hall"

Purpose:
Main ceremony.

Program:

1:00 PM Guest Arrival
1:30 PM Building Experience Tour
3:00 PM Opening Ceremony

Program:

● Invocation
● National Anthem
● Welcome Remarks
● Founder Message
● HYT Global Institute Introduction
● TESDA Recognition
● Ribbon Cutting

Technology Highlight:

Millennium Dynamic Touch Panel Presentation:

"HYT Global Institute Future Vision"

Presentation includes:

● Training programs
● Facilities
● Career pathway
● Company ecosystem

5th Floor Interactive Ending:
Future Commitment Wall

Guests write: "My future skill goal is..." ( Optional )
Digital collection using touchscreen.`,
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
