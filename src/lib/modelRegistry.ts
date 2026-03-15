// Model registry — single source of truth for all supported models.
// Each entry maps to either the WebLLM (MLC) or Transformers.js (ONNX) engine.

export type Engine = 'webllm' | 'transformers';
export type Badge = 'Ultra Light' | 'Balanced' | 'Best Quality' | 'Fastest';

export interface ModelConfig {
  /** Unique runtime identifier. For WebLLM this is the MLC model ID;
   *  for Transformers.js this is the Hugging Face repo slug. */
  id: string;
  displayName: string;
  params: string;
  /** Human-readable size string shown in the UI */
  size: string;
  /** Approximate download size in bytes (for memory warnings) */
  sizeBytes: number;
  engine: Engine;
  badge: Badge;
  description: string;
  logoSrc?: string;
  safetyProfile?: 'standard' | 'less-restricted';
  /** Approximate GPU/CPU memory needed in GB */
  vramGb: number;
  requiresWebGPU: boolean;
  contextLength: number;
}

export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 — 0.5B',
    params: '0.5B',
    size: '~400 MB',
    sizeBytes: 400 * 1024 * 1024,
    engine: 'webllm',
    badge: 'Balanced',
    description: 'Multilingual (29 languages), 128K context window',
    logoSrc: '/models/qwen.png',
    safetyProfile: 'standard',
    vramGb: 1,
    requiresWebGPU: true,
    contextLength: 131072,
  },
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    displayName: 'SmolLM2 — 360M',
    params: '360M',
    size: '~300 MB',
    sizeBytes: 300 * 1024 * 1024,
    engine: 'transformers',
    badge: 'Ultra Light',
    description: 'Ultra-lightweight, works on low-power devices without GPU',
    logoSrc: '/models/smollm.png',
    safetyProfile: 'standard',
    vramGb: 0.5,
    requiresWebGPU: false,
    contextLength: 8192,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    displayName: 'Llama 3.2 — 1B',
    params: '1B',
    size: '~700 MB',
    sizeBytes: 700 * 1024 * 1024,
    engine: 'webllm',
    badge: 'Balanced',
    description: 'General-purpose chat & reasoning, 4K context',
    logoSrc: '/models/llama.png',
    safetyProfile: 'standard',
    vramGb: 2,
    requiresWebGPU: true,
    contextLength: 4096,
  },
];
