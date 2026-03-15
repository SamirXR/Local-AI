// Manages the Web Worker lifecycle and exposes a clean async API to React.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModelConfig } from '../lib/modelRegistry';
import type { ChatMessage } from '../lib/engineAdapter';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  progress: number;
  progressMsg: string;
  backend: 'webgpu' | 'wasm' | null;
  gpuAdapterName: string | null;
  error: string | null;
  loadedModelId: string | null;
}

export interface UseEngineReturn extends EngineState {
  webGPUAvailable: boolean;
  loadModel(model: ModelConfig): void;
  sendChat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
  ): Promise<void>;
  abortChat(): void;
}

// Message shapes coming back from the worker
type WorkerMsg =
  | { type: 'PROGRESS'; payload: { pct: number; msg: string } }
  | { type: 'LOADED'; payload: { backend: 'webgpu' | 'wasm' } }
  | { type: 'TOKEN'; payload: { token: string; id: string } }
  | { type: 'DONE'; payload: { id: string } }
  | { type: 'ERROR'; payload: { message: string } };

interface PendingChat {
  id: string;
  onToken: (token: string) => void;
  resolve: () => void;
  reject: (e: Error) => void;
}

function clampProgress(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function useEngine(): UseEngineReturn {
  const [state, setState] = useState<EngineState>({
    status: 'idle',
    progress: 0,
    progressMsg: '',
    backend: null,
    gpuAdapterName: null,
    error: null,
    loadedModelId: null,
  });

  const [webGPUAvailable, setWebGPUAvailable] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingChat | null>(null);

  // Probe WebGPU support once on mount
  useEffect(() => {
    void (async () => {
      try {
        const gpu = navigator.gpu;
        if (!gpu) return;
        const adapter = await gpu.requestAdapter();
        if (adapter) {
          setWebGPUAvailable(true);
          setState(s => ({ ...s, gpuAdapterName: (adapter as { name?: string }).name ?? null }));
        }
      } catch {
        // WebGPU unavailable — stay false
      }
    })();
  }, []);

  // Create worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/inference.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<WorkerMsg>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'PROGRESS':
          setState(s => ({
            ...s,
            progress: clampProgress(msg.payload.pct),
            progressMsg: msg.payload.msg,
          }));
          break;

        case 'LOADED':
          setState(s => ({
            ...s,
            status: 'ready',
            progress: 100,
            backend: msg.payload.backend,
            error: null,
          }));
          break;

        case 'TOKEN': {
          const p = pendingRef.current;
          if (p?.id === msg.payload.id) p.onToken(msg.payload.token);
          break;
        }

        case 'DONE': {
          const p = pendingRef.current;
          if (p?.id === msg.payload.id) {
            pendingRef.current = null;
            p.resolve();
          }
          break;
        }

        case 'ERROR': {
          const p = pendingRef.current;
          if (p) {
            pendingRef.current = null;
            p.reject(new Error(msg.payload.message));
          }
          setState(s => ({ ...s, status: 'error', error: msg.payload.message }));
          break;
        }
      }
    };

    worker.onerror = (e) => {
      setState(s => ({ ...s, status: 'error', error: e.message }));
    };

    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const loadModel = useCallback((model: ModelConfig) => {
    setState(s => ({
      ...s,
      status: 'loading',
      progress: 0,
      progressMsg: 'Initializing…',
      error: null,
      loadedModelId: model.id,
    }));

    workerRef.current?.postMessage({
      type: 'LOAD_MODEL',
      payload: { modelId: model.id, engine: model.engine },
    });
  }, []);

  const sendChat = useCallback(
    (messages: ChatMessage[], onToken: (token: string) => void): Promise<void> => {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        pendingRef.current = { id, onToken, resolve, reject };
        workerRef.current?.postMessage({ type: 'CHAT', payload: { messages, id } });
      });
    },
    [],
  );

  const abortChat = useCallback(() => {
    workerRef.current?.postMessage({ type: 'ABORT' });
    const p = pendingRef.current;
    if (p) {
      pendingRef.current = null;
      p.resolve(); // resolve cleanly so the caller's finally block runs
    }
  }, []);

  return { ...state, webGPUAvailable, loadModel, sendChat, abortChat };
}
