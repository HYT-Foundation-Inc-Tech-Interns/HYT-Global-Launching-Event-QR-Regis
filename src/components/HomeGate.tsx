"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Returning-guest gate for the landing page.
 *
 * A guest's Passport ID is saved in localStorage when they register and
 * whenever they open their passport. So if this device already knows an ID,
 * the landing page is just a detour: send them straight to their passport.
 * Devices with no saved ID see the normal landing page and register.
 *
 * Escape hatch: visiting "/?new=1" forgets the saved ID and stays here, for
 * when one phone is used to sign up more than one guest (e.g. a parent
 * registering their children).
 */
const STORAGE_KEY = "hyt_passport_id";

export default function HomeGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Start in the "checking" state on both server and client so the markup
  // matches during hydration, and the landing page never flashes before a
  // redirect.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Read the query string directly rather than with useSearchParams, which
    // would force this statically-rendered page to become dynamic.
    const wantsNew = new URLSearchParams(window.location.search).has("new");

    let saved = "";
    try {
      if (wantsNew) localStorage.removeItem(STORAGE_KEY);
      else saved = (localStorage.getItem(STORAGE_KEY) || "").trim();
    } catch {
      // localStorage may be unavailable (private mode); treat as no ID.
    }

    if (saved) {
      // replace(), not push(), so the back button doesn't bounce them here
      // only to be redirected again.
      router.replace(`/passport/${encodeURIComponent(saved)}`);
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p className="mt-4 text-sm font-medium text-white/90">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
