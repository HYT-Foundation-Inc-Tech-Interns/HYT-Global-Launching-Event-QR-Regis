import Link from "next/link";

/**
 * Simple top header used across pages. Keeps branding consistent.
 */
export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="brand-gradient text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛂</span>
          <div>
            <p className="text-lg font-bold leading-tight">HYT Digital Passport</p>
            {subtitle && (
              <p className="text-xs text-white/80">{subtitle}</p>
            )}
          </div>
        </Link>
        <nav className="hidden gap-4 text-sm font-medium sm:flex">
          <Link href="/register" className="hover:underline">
            Register
          </Link>
          <Link href="/admin/dashboard" className="hover:underline">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
