import type { ModelConfig } from '../lib/modelRegistry';

const BADGE_STYLES: Record<string, string> = {
  'Ultra Light': 'bg-slate-800/80 text-slate-200 border border-slate-600/80',
  'Balanced':    'bg-slate-800/80 text-slate-200 border border-slate-600/80',
  'Best Quality':'bg-slate-800/80 text-slate-200 border border-slate-600/80',
  'Fastest':     'bg-slate-800/80 text-slate-200 border border-slate-600/80',
};

interface Props {
  models: ModelConfig[];
  selectedId: string;
  onSelect(id: string): void;
  webGPUAvailable: boolean;
}

function getCardClasses(selected: boolean, disabled: boolean) {
  if (disabled) {
    return 'cursor-not-allowed border-slate-700/70 bg-slate-900/55 opacity-40';
  }

  if (selected) {
    return [
      'border-slate-100/90 bg-slate-800/95 ring-1 ring-slate-200/80',
      'shadow-[0_0_0_1px_rgba(248,250,252,0.18),0_18px_40px_rgba(0,0,0,0.45)]',
    ].join(' ');
  }

  return 'border-slate-700/70 bg-slate-950/75 hover:border-slate-400/70 hover:bg-slate-900/90';
}

export default function ModelSelector({ models, selectedId, onSelect, webGPUAvailable }: Props) {
  const deviceMemoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-[11px] font-semibold text-slate-100 tracking-[0.08em] mb-4">
        02 // Model bank
      </h2>

      {models.map(model => {
        const disabled = model.requiresWebGPU && !webGPUAvailable;
        const memoryWarning = deviceMemoryGb !== null && model.vramGb > deviceMemoryGb;
        const selected = selectedId === model.id;

        return (
          <button
            key={model.id}
            type="button"
            aria-pressed={selected}
            onClick={() => !disabled && onSelect(model.id)}
            disabled={disabled}
            className={[
              'w-full text-left p-4 rounded-2xl border backdrop-blur-md transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/80 focus-visible:ring-offset-0',
              getCardClasses(selected, disabled),
            ].join(' ')}
          >
            {/* Name + badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex items-start gap-2">
                {model.logoSrc && (
                  <img
                    src={model.logoSrc}
                    alt={`${model.displayName} logo`}
                    className="w-8 h-8 rounded-md object-cover border border-slate-600"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">
                    {model.displayName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug tracking-normal">
                    {model.description}
                  </p>
                </div>
              </div>
              <span
                className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  BADGE_STYLES[model.badge] ?? 'bg-slate-700 text-slate-300'
                }`}
              >
                {model.badge}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[11px] text-slate-400 font-medium">
              <span>{model.params}</span>
              <span>{model.size}</span>
              <span>{model.vramGb} GB RAM</span>
              <span>{(model.contextLength / 1024).toFixed(0)}K ctx</span>
              {model.safetyProfile === 'less-restricted' && (
                <span className="text-slate-300">Less Restricted</span>
              )}
              {model.requiresWebGPU && (
                <span className="text-slate-200">WebGPU</span>
              )}
              {model.engine === 'transformers' && (
                <span className="text-slate-300">CPU/WASM</span>
              )}
            </div>

            {/* Warnings */}
            {memoryWarning && !disabled && (
              <p className="text-xs text-slate-300 mt-2">
                [ WARN ] May exceed device RAM ({deviceMemoryGb} GB detected)
              </p>
            )}
            {disabled && (
              <p className="text-xs text-slate-300 mt-2">
                Requires WebGPU — unavailable in this browser
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
