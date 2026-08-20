"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Trash2, UserPlus, Users } from "lucide-react";

export type PassportProfile = {
  passportId: string;
  fullName: string;
};

const PROFILES_KEY = "hyt_passport_profiles";
const ACTIVE_KEY = "hyt_passport_id";

function readProfiles(): PassportProfile[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function savePassportProfile(profile: PassportProfile) {
  try {
    const profiles = readProfiles().filter(
      (saved) => saved.passportId !== profile.passportId,
    );
    localStorage.setItem(PROFILES_KEY, JSON.stringify([profile, ...profiles]));
    localStorage.setItem(ACTIVE_KEY, profile.passportId);
    window.dispatchEvent(new Event("hyt-profiles-updated"));
  } catch {
    // localStorage may be unavailable (private mode); safe to ignore.
  }
}

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<PassportProfile[]>([]);
  const [activeId, setActiveId] = useState("");

  function refresh() {
    setProfiles(readProfiles());
    try {
      setActiveId(localStorage.getItem(ACTIVE_KEY) || "");
    } catch {
      setActiveId("");
    }
  }

  useEffect(() => {
    refresh();
    window.addEventListener("hyt-profiles-updated", refresh);
    return () => window.removeEventListener("hyt-profiles-updated", refresh);
  }, []);

  function removeProfile(profile: PassportProfile) {
    if (!window.confirm(`Remove ${profile.fullName || profile.passportId} from Profiles?`)) {
      return;
    }

    const remaining = profiles.filter(
      (saved) => saved.passportId !== profile.passportId,
    );
    setProfiles(remaining);
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(remaining));
      if (activeId === profile.passportId) {
        localStorage.removeItem(ACTIVE_KEY);
      }
      window.dispatchEvent(new Event("hyt-profiles-updated"));
    } catch {
      // localStorage may be unavailable (private mode); safe to ignore.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-blue shadow-sm"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        Profiles
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl bg-white p-2 text-left shadow-xl ring-1 ring-slate-200"
        >
          {profiles.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">no registered accounts</p>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.passportId}
                className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
              >
                <Link
                  href={`/passport/${encodeURIComponent(profile.passportId)}`}
                  onClick={() => {
                    try {
                      localStorage.setItem(ACTIVE_KEY, profile.passportId);
                    } catch {
                      // localStorage may be unavailable (private mode); safe to ignore.
                    }
                    setActiveId(profile.passportId);
                    setOpen(false);
                  }}
                  className={`min-w-0 flex-1 ${
                    profile.passportId === activeId
                      ? "font-semibold text-brand-blue"
                      : "text-slate-700"
                  }`}
                >
                  <span className="block truncate">{profile.fullName || "Unnamed account"}</span>
                  <span className="block truncate font-mono text-xs text-slate-400">
                    {profile.passportId}
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${profile.fullName || profile.passportId}`}
                  title="Remove profile"
                  onClick={() => removeProfile(profile)}
                  className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}

          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Register another account
          </Link>
        </div>
      )}
    </div>
  );
}
