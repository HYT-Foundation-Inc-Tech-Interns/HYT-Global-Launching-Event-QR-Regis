export type PassportProfile = {
  passportId: string;
  fullName: string;
};

const ACTIVE_KEY = "hyt_passport_id";

export function savePassportProfile(profile: PassportProfile) {
  try {
    localStorage.removeItem("hyt_passport_profiles");
    localStorage.setItem(ACTIVE_KEY, profile.passportId);
  } catch {
    // localStorage may be unavailable (private mode); safe to ignore.
  }
}
