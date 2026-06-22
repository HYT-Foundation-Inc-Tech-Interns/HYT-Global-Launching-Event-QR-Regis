/**
 * A simple progress bar showing how many floors are completed.
 */
export default function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm font-medium">
        <span className="text-slate-600">Progress</span>
        <span className="text-brand-purple">
          {completed}/{total} floors completed
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="brand-gradient h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
