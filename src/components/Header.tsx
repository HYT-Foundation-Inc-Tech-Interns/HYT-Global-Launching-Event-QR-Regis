import Link from "next/link";
import ProfileMenu from "./ProfileMenu";

/**
 * Simple top header used across pages. Keeps branding consistent.
 */
export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="brand-gradient text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/hyt-global-institute.png"
            alt="HYT logo"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <p className="text-lg font-bold leading-tight">HYT Digital Passport</p>
            {subtitle && (
              <p className="text-xs text-white/80">{subtitle}</p>
            )}
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <ProfileMenu />
          <Link href="/admin/login" className="hover:underline">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
