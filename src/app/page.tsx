import Link from "next/link";
import Header from "@/components/Header";
import { STATIONS } from "@/lib/stations";

/**
 * Landing page. Quick links to the main areas of the app.
 */
export default function HomePage() {
  return (
    <main>
      <Header subtitle="HYT Global Institute" />

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-2 ring-[#0C005B]">
          <img
            src="/hyt-global-institute.png"
            alt="Passport icon"
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
          <h1 className="mt-4 text-3xl font-bold text-slate-800 sm:text-4xl">
            HYT Digital Passport
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Register, collect a digital stamp at every floor, and complete your
            passport to claim your certificate of participation or souvenir.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl bg-[#0C005B] px-6 py-3 font-semibold text-white shadow transition hover:bg-[#080046] sm:w-auto"
            >
              Register as a Guest
            </Link>
          </div>
        </div>

        {/* Floor overview */}
        <h2 className="mt-12 text-xl font-bold text-slate-800">
          Floors & Stations
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((s) => (
            <div
              key={s.id}
              className="rounded-3xl bg-white p-8 text-center shadow-sm ring-2 ring-[#0C005B]"
            >
              <div className="text-3xl">{s.icon}</div>
              <p className="mt-2 font-semibold text-slate-800">
                Floor {s.floor}: {s.name}
              </p>
              <p className="text-sm text-slate-500">{s.activity}</p>
            </div>
          ))}
        </div>

        {/* How it works for guests */}
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-2 ring-[#0C005B]">
          <h3 className="text-lg font-bold text-slate-800">How it works</h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <span className="font-semibold text-brand-blue">1.</span> Register
              at the entrance to get your digital passport.
            </li>
            <li>
              <span className="font-semibold text-brand-blue">2.</span> Keep your
              passport open on your phone.
            </li>
            <li>
              <span className="font-semibold text-brand-blue">3.</span> At each
              floor, scan the posted QR code to collect a stamp.
            </li>
            <li>
              <span className="font-semibold text-brand-blue">4.</span> Complete
              all floors to claim your certificate or souvenir!
            </li>
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-center">
          <Link
            href="/admin/station-codes"
            className="text-sm font-medium text-brand-purple hover:underline"
          >
            🖨️ Print station QR codes (staff) →
          </Link>
          <Link
            href="/admin/materials"
            className="text-sm font-medium text-slate-500 hover:underline"
          >
            View event materials checklist →
          </Link>
        </div>
      </section>
    </main>
  );
}
