import Link from "next/link";

/**
 * Simple top header used across pages. Keeps branding consistent.
 */
export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="brand-gradient text-white">
      <div className="mx-auto flex max-w-5xl justify-center px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/hyt-global-institute.png"
            alt="HYT logo"
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="text-left">
            <p className="text-lg font-bold leading-tight">HYT Digital Pass</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/80">
              Guest Registration
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
