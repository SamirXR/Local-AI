interface Props {
  backend: 'webgpu' | 'wasm' | null;
  webGPUAvailable: boolean;
  gpuAdapterName?: string | null;
}

export default function StatusBadge({ backend, webGPUAvailable, gpuAdapterName }: Props) {
  const isGPU = backend === 'webgpu';
  const runtimeLabel = backend ? (isGPU ? 'GPU Active' : 'CPU Active') : 'No Model Loaded';

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {/* Dot */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          backend
            ? isGPU
              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
              : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
            : 'bg-slate-500'
        }`}
      />

      {/* Active runtime label */}
      <span className={backend ? 'text-emerald-400' : 'text-slate-400'}>
        {runtimeLabel}
      </span>

      {/* Capability check */}
      <span className={webGPUAvailable ? 'text-slate-300' : 'text-slate-500'}>
        {webGPUAvailable ? 'WebGPU Supported' : 'WebGPU Unavailable'}
      </span>

      {/* GPU adapter name (when available) */}
      {webGPUAvailable && gpuAdapterName && (
        <span className="text-slate-500 hidden sm:inline truncate max-w-[160px]">
          · {gpuAdapterName}
        </span>
      )}
    </div>
  );
}
