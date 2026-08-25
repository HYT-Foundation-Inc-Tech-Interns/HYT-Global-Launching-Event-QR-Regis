import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Header from "@/components/Header";
import HomeGate from "@/components/HomeGate";
import LandingCta from "@/components/LandingCta";
import { STATIONS } from "@/lib/stations";

/**
 * Landing page. Quick links to the main areas of the app.
 *
 * Wrapped in HomeGate so the landing page remains available even when the
 * browser already has saved passport profiles.
 */
export default function HomePage() {
  return (
    <HomeGate>
    <main>
      <Header subtitle="HYT Global Institute" />

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-2 ring-[#0C005B]">
          <img
            src="/hyt-global-institute.png"
            alt="Passport icon"
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
          <h4 className="mt-4 text-3xl font-bold text-slate-800 sm:text-4xl">
            HYT Digital Passport
          </h4>
          
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LandingCta />
          </div>
        </div>

        {/* Floor overview */}
        <div className="mt-14 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd301]">Your route</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Floors & Stations</h2>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-white/70 sm:block">
            Explore every station and collect your digital stamps along the way.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((s) => (
            <div
              key={s.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-white/60 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="text-3xl">{s.icon}</div>
              </div>
              <div className="mt-3 flex flex-nowrap items-center justify-between gap-3">
                <span className="shrink-0 rounded-full bg-[#ffd301] px-3 py-1 text-xs font-bold text-[#0C005B]">
                  Floor {s.floor}
                </span>
                <p className="min-w-0 truncate whitespace-nowrap font-semibold text-slate-800">{s.name}</p>
              </div>
              <p className="mt-1 max-h-20 overflow-y-auto text-sm text-slate-500">
                {s.activity}
              </p>
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

        <div className="mt-8 flex justify-center text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-purple shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            Administrator Portal
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
    </HomeGate>
  );
}
