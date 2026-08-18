import Header from "@/components/Header";

/**
 * Event materials checklist (/admin/materials).
 *
 * A simple static informational checklist of physical materials needed to
 * run the event. This is purely informational — it does not save state.
 */

const MATERIALS = [
  {
    item: "QR Codes",
    note: "Printed station QR codes and guest passport QR codes.",
  },
  {
    item: "Registration QR Poster",
    note: "Printed at the entrance. Guests scan it and register on their own phones — no staff device needed.",
  },
  {
    item: "Welcome Signage",
    note: "Banner / signage at the entrance welcoming guests.",
  },
  {
    item: "Event Badges",
    note: "Name badges or lanyards for guests and staff.",
  },
  {
    item: "Directional Boards",
    note: "Signs guiding guests from floor to floor.",
  },
  {
    item: "Claiming Booth",
    note: "Booth for certificate of participation / souvenir hand-out.",
  },
];

export default function MaterialsPage() {
  return (
    <main>
      <Header subtitle="Event materials checklist" />
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Event Materials Checklist
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Make sure all of these are ready before the event begins.
        </p>

        <ul className="mt-6 space-y-3">
          {MATERIALS.map((m) => (
            <li
              key={m.item}
              className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <span className="mt-0.5 text-xl">☑️</span>
              <div>
                <p className="font-semibold text-slate-800">{m.item}</p>
                <p className="text-sm text-slate-500">{m.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
