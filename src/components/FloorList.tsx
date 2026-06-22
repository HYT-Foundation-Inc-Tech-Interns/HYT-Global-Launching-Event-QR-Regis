import { STATIONS } from "@/lib/stations";

/**
 * Lists every floor/station with a "Completed" or "Not Completed" status.
 * Completed floors show their digital stamp icon.
 */
export default function FloorList({ floors }: { floors: boolean[] }) {
  return (
    <ul className="space-y-3">
      {STATIONS.map((station, index) => {
        const done = floors[index];
        return (
          <li
            key={station.id}
            className={`flex items-center gap-4 rounded-xl border p-3 ${
              done
                ? "border-brand-gold/40 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            {/* Digital stamp / icon */}
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                done ? "bg-brand-gold/20" : "bg-slate-100 grayscale opacity-50"
              }`}
            >
              {station.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">
                Floor {station.floor}: {station.name}
              </p>
              <p className="truncate text-sm text-slate-500">
                {station.activity}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                done
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {done ? "Completed" : "Not Completed"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
