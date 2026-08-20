import type { ReactNode } from "react";

/**
 * Keeps the landing page available even when this browser has saved profiles.
 * Profile selection is handled by the header menu instead of an automatic
 * redirect to the last passport.
 */
export default function HomeGate({ children }: { children: ReactNode }) {
  return children;
}
