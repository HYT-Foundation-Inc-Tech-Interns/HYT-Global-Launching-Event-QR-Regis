"use client";

import { useEffect } from "react";

/**
 * Tiny helper that saves the guest's Passport ID into the browser's
 * localStorage whenever they view their passport. This lets the
 * /complete/[floor] page recognise them automatically if they later scan a
 * station QR with their phone's native camera. Renders nothing.
 */
export default function RememberPassport({ passportId }: { passportId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem("hyt_passport_id", passportId);
    } catch {
      // localStorage may be unavailable (private mode); safe to ignore.
    }
  }, [passportId]);

  return null;
}
