// Global type declarations for non-standard browser APIs

// PWA install prompt event — not yet in official TypeScript DOM types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}

// navigator.deviceMemory (Memory Hints API)
interface Navigator {
  readonly deviceMemory?: number;
}

// Minimal WebGPU surface for feature detection (full types via @webgpu/types if needed)
interface Navigator {
  readonly gpu?: {
    requestAdapter(
      options?: { powerPreference?: 'low-power' | 'high-performance' },
    ): Promise<{ name?: string; isFallbackAdapter?: boolean } | null>;
  };
}
