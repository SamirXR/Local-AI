/// <reference lib="webworker" />
// Run ALL inference off the main thread so the UI stays perfectly responsive.
// This worker holds a single engine instance across chat turns.

import { WebLLMAdapter, TransformersAdapter } from '../lib/engineAdapter';
import type { ChatMessage } from '../lib/engineAdapter';
import type { Engine } from '../lib/modelRegistry';

// ---- Message shapes (main → worker) -------------------------------------
type InMsg =
  | { type: 'LOAD_MODEL'; payload: { modelId: string; engine: Engine } }
  | { type: 'CHAT'; payload: { messages: ChatMessage[]; id: string } }
  | { type: 'ABORT' };

// ---- Message shapes (worker → main) -------------------------------------
type OutMsg =
  | { type: 'PROGRESS'; payload: { pct: number; msg: string } }
  | { type: 'LOADED'; payload: { backend: 'webgpu' | 'wasm' } }
  | { type: 'TOKEN'; payload: { token: string; id: string } }
  | { type: 'DONE'; payload: { id: string } }
  | { type: 'ERROR'; payload: { message: string } };

// -------------------------------------------------------------------------

let adapter: WebLLMAdapter | TransformersAdapter | null = null;
let abortController: AbortController | null = null;

function send(msg: OutMsg) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);
}

(self as unknown as DedicatedWorkerGlobalScope).addEventListener(
  'message',
  async (event: MessageEvent<InMsg>) => {
    const { type } = event.data;

    // ------------------------------------------------------------------ LOAD
    if (type === 'LOAD_MODEL') {
      const { modelId, engine } = event.data.payload;

      // Tear down any previous engine before loading a new one
      adapter?.reset();
      adapter = null;

      try {
        adapter =
          engine === 'webllm' ? new WebLLMAdapter() : new TransformersAdapter();

        await adapter.load(modelId, (pct, msg) => {
          send({ type: 'PROGRESS', payload: { pct, msg } });
        });

        send({ type: 'LOADED', payload: { backend: adapter.getBackend() } });
      } catch (err) {
        send({ type: 'ERROR', payload: { message: (err as Error).message } });
      }
      return;
    }

    // ------------------------------------------------------------------ CHAT
    if (type === 'CHAT') {
      const { messages, id } = event.data.payload;

      if (!adapter?.isLoaded()) {
        send({ type: 'ERROR', payload: { message: 'No model loaded' } });
        return;
      }

      abortController = new AbortController();

      try {
        await adapter.chat(
          messages,
          (token) => send({ type: 'TOKEN', payload: { token, id } }),
          abortController.signal,
        );
        send({ type: 'DONE', payload: { id } });
      } catch (err) {
        const error = err as Error;
        if (error.name === 'AbortError') {
          send({ type: 'DONE', payload: { id } });
        } else {
          send({ type: 'ERROR', payload: { message: error.message } });
        }
      }
      return;
    }

    // ----------------------------------------------------------------- ABORT
    if (type === 'ABORT') {
      abortController?.abort();
    }
  },
);
