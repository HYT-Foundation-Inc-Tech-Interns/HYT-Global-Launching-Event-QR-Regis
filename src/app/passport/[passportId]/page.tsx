import Link from "next/link";
import Header from "@/components/Header";
import PassportCard from "@/components/PassportCard";
import PassportScanner from "@/components/PassportScanner";
import RememberPassport from "@/components/RememberPassport";
import { getGuestById } from "@/lib/sheets";

/**
 * Digital passport dashboard (/passport/[passportId]).
 *
 * This is a server component: it reads the guest straight from Google Sheets
 * on each request, so the data is always fresh when the page loads.
 */

// Re-fetch on every request (no static caching).
export const dynamic = "force-dynamic";

export default async function PassportPage({
  params,
}: {
  params: Promise<{ passportId: string }>;
}) {
  const { passportId } = await params;
  const guest = await getGuestById(passportId);

  if (!guest) {
    return (
      <main>
        <Header subtitle="Passport" />
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-5xl">🔍</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">
            Passport not found
          </h1>
          <p className="mt-2 text-slate-500">
            We couldn&apos;t find a passport with ID{" "}
            <span className="font-mono">{passportId}</span>.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-xl bg-[#0C005B] px-5 py-3 font-semibold text-white hover:bg-[#080046]"
          >
            Register Now
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main>
      <Header subtitle="Your digital passport" />
      <section className="mx-auto max-w-5xl px-4 py-8">
        {/* Remember this guest on their device for native-camera scans. */}
        <RememberPassport passportId={guest.passportId} />

        {/* Guest self-scan: tap, scan the floor's QR poster, get stamped. */}
        <PassportScanner passportId={guest.passportId} />

        <PassportCard guest={guest} />
        <p className="mt-6 text-center text-sm text-slate-500">
          Keep this page open on your phone. Tap{" "}
          <span className="font-semibold">Scan QR</span> at each floor to
          collect your stamp.
        </p>
      </section>
    </main>
  );
}
