interface Props {
  progress: number;
  message: string;
  modelName: string;
}

export default function LoadingProgress({ progress, message, modelName }: Props) {
  const clampedPct = Math.max(0, Math.min(100, progress));

  return (
    <div className="m-4 p-5 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">Loading {modelName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Weights are cached after the first download
          </p>
        </div>
        <span className="text-lg font-mono font-bold text-slate-100">
          {clampedPct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.max(2, clampedPct)}%`,
            background: 'linear-gradient(90deg, #d1d5db, #f8fafc)',
          }}
        />
      </div>

      {/* Status message */}
      <p className="text-xs text-slate-500 mt-2.5 truncate">{message}</p>
    </div>
  );
}
