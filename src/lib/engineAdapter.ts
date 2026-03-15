// Unified adapter interface that abstracts WebLLM (WebGPU) and
// Transformers.js (ONNX/WASM) behind a single API surface.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface EngineAdapter {
  load(
    modelId: string,
    onProgress: (pct: number, msg: string) => void,
  ): Promise<void>;

  chat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<void>;

  isLoaded(): boolean;
  getBackend(): 'webgpu' | 'wasm';
  reset(): void;
}

// ---------------------------------------------------------------------------
// WebLLM adapter  — WebGPU-accelerated inference via @mlc-ai/web-llm
// ---------------------------------------------------------------------------
export class WebLLMAdapter implements EngineAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private engine: any = null;
  private loaded = false;

  private normalizeProgress(progress: number): number {
    if (!Number.isFinite(progress)) return 0;
    const scaled = progress <= 1 ? progress * 100 : progress;
    return Math.max(0, Math.min(100, Math.round(scaled)));
  }

  async load(
    modelId: string,
    onProgress: (pct: number, msg: string) => void,
  ): Promise<void> {
    // Dynamic import keeps web-llm out of the main bundle (top-level await)
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

    this.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report: { progress: number; text: string }) => {
        onProgress(this.normalizeProgress(report.progress), report.text);
      },
    });

    this.loaded = true;
  }

  async chat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.engine) throw new Error('Engine not loaded');

    const stream = await this.engine.chat.completions.create({
      messages,
      stream: true,
      stream_options: { include_usage: false },
    });

    for await (const chunk of stream) {
      if (signal.aborted) break;
      const delta = (chunk as { choices: { delta: { content?: string } }[] })
        .choices[0]?.delta?.content;
      if (delta) onToken(delta);
    }
  }

  isLoaded() { return this.loaded; }
  getBackend(): 'webgpu' { return 'webgpu'; }

  reset() {
    this.engine = null;
    this.loaded = false;
  }
}

// ---------------------------------------------------------------------------
// Transformers.js adapter — ONNX Runtime Web (CPU/WASM) fallback
// ---------------------------------------------------------------------------

type ProgressInfo =
  | { status: 'initiate' | 'download' | 'done' | 'ready'; name?: string; file?: string; progress?: number }
  | { status: 'progress'; name?: string; file?: string; progress: number };

function normalizeProgressValue(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return progress <= 1 ? progress : progress / 100;
}

export class TransformersAdapter implements EngineAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tokenizer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  private loaded = false;

  async load(
    modelId: string,
    onProgress: (pct: number, msg: string) => void,
  ): Promise<void> {
    const { AutoTokenizer, AutoModelForCausalLM, env } = await import(
      '@huggingface/transformers'
    );

    // Use browser Cache API for offline support
    (env as { useBrowserCache: boolean }).useBrowserCache = true;
    (env as { allowRemoteModels: boolean }).allowRemoteModels = true;

    onProgress(5, 'Loading tokenizer…');
    this.tokenizer = await AutoTokenizer.from_pretrained(modelId);

    onProgress(15, 'Fetching model weights (this may take a while)…');

    this.model = await AutoModelForCausalLM.from_pretrained(modelId, {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: (info: ProgressInfo) => {
        if (info.status === 'progress' && info.progress !== undefined) {
          const normalizedProgress = normalizeProgressValue(info.progress);
          const downloadPct = Math.round(normalizedProgress * 100);
          const pct = Math.max(15, Math.min(99, 15 + Math.round(normalizedProgress * 84)));
          onProgress(
            pct,
            `Downloading ${info.file ?? 'model'}… ${downloadPct}%`,
          );
        }
      },
    });

    this.loaded = true;
    onProgress(100, 'Model ready');
  }

  async chat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.tokenizer || !this.model) throw new Error('Engine not loaded');

    const { TextStreamer } = await import('@huggingface/transformers');

    // Apply the model's chat template to format the conversation
    const prompt: string = this.tokenizer.apply_chat_template(messages, {
      tokenize: false,
      add_generation_prompt: true,
    });

    const inputs = this.tokenizer(prompt, { return_tensors: 'pt' });

    const streamer = new TextStreamer(this.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback_function: (token: any) => {
        if (!signal.aborted) onToken(String(token));
      },
    });

    await this.model.generate({
      ...inputs,
      max_new_tokens: 1024,
      temperature: 0.7,
      do_sample: true,
      streamer,
    });
  }

  isLoaded() { return this.loaded; }
  getBackend(): 'wasm' { return 'wasm'; }

  reset() {
    this.tokenizer = null;
    this.model = null;
    this.loaded = false;
  }
}
