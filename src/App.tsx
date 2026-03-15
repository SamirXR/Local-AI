import { useEffect, useState } from 'react';
import { Settings, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';

import { useEngine } from './hooks/useEngine';
import { useChat } from './hooks/useChat';
import { MODEL_REGISTRY } from './lib/modelRegistry';

import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import LoadingProgress from './components/LoadingProgress';
import StatusBadge from './components/StatusBadge';

export default function App() {
  const engine = useEngine();
  const chat = useChat();

  const [selectedModelId, setSelectedModelId] = useState<string>(
    () => localStorage.getItem('lastModel') ?? MODEL_REGISTRY[0].id,
  );

  // true while the model-selector panel is visible
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileModelsOpen, setMobileModelsOpen] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Capture the PWA install prompt
  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Collapse sidebar automatically once the model finishes loading
  useEffect(() => {
    if (engine.status === 'ready') setSidebarOpen(false);
  }, [engine.status]);

  // Close mobile model drawer once a model is ready
  useEffect(() => {
    if (engine.status === 'ready') setMobileModelsOpen(false);
  }, [engine.status]);

  const selectedModel =
    MODEL_REGISTRY.find(m => m.id === selectedModelId) ?? MODEL_REGISTRY[0];

  const handleLoadModel = () => {
    if (engine.status === 'loading') return;
    localStorage.setItem('lastModel', selectedModelId);
    engine.loadModel(selectedModel);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const handleSend = (content: string) => {
    void chat.sendMessage(content, engine.sendChat, engine.abortChat);
  };

  return (
    <div className="flex flex-col h-full text-slate-100 overflow-hidden relative">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-700/80 panel-glass z-20 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-sm sm:text-base text-slate-100 flex-shrink-0 tracking-[0.08em]">
            01 // LocalAI
          </span>
          <StatusBadge
            backend={engine.backend}
            webGPUAvailable={engine.webGPUAvailable}
            gpuAdapterName={engine.gpuAdapterName}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Install button */}
          {installPrompt && (
            <button
              onClick={handleInstall}
              title="Install app"
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-black transition-colors"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Download App</span>
            </button>
          )}

          {/* System prompt toggle */}
          <button
            onClick={() => setShowSystemPrompt(s => !s)}
            title="System prompt"
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1"
          >
            <span className="hidden sm:inline">System</span>
            {showSystemPrompt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {/* Desktop model selector toggle */}
          <button
            onClick={() => setSidebarOpen(s => !s)}
            title="Model settings"
            className="hidden sm:flex text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors items-center gap-1"
          >
            <Settings size={12} />
            <span className="hidden sm:inline truncate max-w-[120px]">
              {engine.status === 'ready' ? selectedModel.displayName : 'Models'}
            </span>
          </button>

          {/* Mobile model drawer toggle */}
          <button
            onClick={() => setMobileModelsOpen(s => !s)}
            title="Model settings"
            className="sm:hidden text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1"
          >
            <Settings size={12} />
            <span>Models</span>
          </button>

          {/* Clear chat */}
          {chat.messages.length > 0 && (
            <button
              onClick={chat.clearMessages}
              title="Clear conversation"
              className="text-xs p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ── Banners ──────────────────────────────────────────────────── */}
      {!engine.webGPUAvailable && (
        <div className="bg-slate-900/70 border-b border-slate-600/60 px-4 py-2 text-slate-300 text-xs flex-shrink-0">
          [Notice] WebGPU is unavailable in this browser - only SmolLM2 (CPU/WASM) is accessible.
        </div>
      )}

      {/* ── System prompt bar ────────────────────────────────────────── */}
      {showSystemPrompt && (
        <div className="border-b border-slate-700 px-3 sm:px-4 py-3 panel-glass flex-shrink-0">
          <label className="text-[11px] font-medium text-slate-100 block mb-1.5 tracking-[0.08em]">
            03 // System prompt
            <span className="text-slate-600 ml-1">(persisted to localStorage)</span>
          </label>
          <textarea
            value={chat.systemPrompt}
            onChange={e => chat.setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full bg-slate-900/70 border border-slate-600/70 text-slate-100 text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative max-w-[1700px] w-full mx-auto">

        {/* Sidebar — desktop model selector */}
        {sidebarOpen && (
          <aside className="hidden sm:flex w-80 lg:w-96 flex-shrink-0 border-r border-slate-700/70 flex-col overflow-hidden panel-glass">
            {/* Model cards */}
            <div className="flex-1 overflow-y-auto">
              <ModelSelector
                models={MODEL_REGISTRY}
                selectedId={selectedModelId}
                onSelect={setSelectedModelId}
                webGPUAvailable={engine.webGPUAvailable}
              />
            </div>

            {/* Load / progress / error panel at the bottom of sidebar */}
            <div className="flex-shrink-0 border-t border-slate-700/70 p-4 space-y-3">
              {engine.status === 'loading' && (
                <LoadingProgress
                  progress={engine.progress}
                  message={engine.progressMsg}
                  modelName={selectedModel.displayName}
                />
              )}

              {engine.status === 'error' && (
                <div className="p-3 bg-slate-900/70 border border-slate-600/70 rounded-xl text-xs">
                  <p className="font-semibold text-slate-100 mb-1">Failed to load model</p>
                  <p className="text-slate-300 break-words">{engine.error}</p>
                </div>
              )}

              <button
                onClick={handleLoadModel}
                disabled={engine.status === 'loading'}
                className={[
                  'w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all tracking-wide',
                  engine.status === 'loading'
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-black active:scale-[0.98]',
                ].join(' ')}
              >
                {engine.status === 'loading'
                  ? `Loading… ${engine.progress}%`
                  : engine.status === 'ready'
                  ? '↻ Reload / Switch Model'
                  : 'Load Model'}
              </button>

              {engine.status === 'ready' && (
                <p className="text-center text-xs text-slate-300">
                  ✓ Ready · Model cached for offline use
                </p>
              )}
            </div>
          </aside>
        )}

        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Loading progress (full-width, shown while sidebar is closed) */}
          {!sidebarOpen && engine.status === 'loading' && (
            <LoadingProgress
              progress={engine.progress}
              message={engine.progressMsg}
              modelName={selectedModel.displayName}
            />
          )}

          {/* Error (full-width, shown while sidebar is closed) */}
          {!sidebarOpen && engine.status === 'error' && (
            <div className="m-4 p-4 bg-slate-900/70 border border-slate-600/70 rounded-2xl">
              <p className="font-semibold text-slate-100 mb-1">Error loading model</p>
              <p className="text-slate-300 text-sm">{engine.error}</p>
              <button
                onClick={() => setMobileModelsOpen(true)}
                className="mt-3 text-sm px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Open model drawer
              </button>
            </div>
          )}

          <ChatWindow
            messages={chat.messages}
            isGenerating={chat.isGenerating}
            assistantLogoSrc={selectedModel.logoSrc}
            assistantLabel={selectedModel.displayName}
          />

          <InputBar
            onSend={handleSend}
            onStop={chat.stopGenerating}
            isGenerating={chat.isGenerating}
            disabled={engine.status !== 'ready'}
            placeholder={
              engine.status === 'idle' || engine.status === 'error'
                ? 'Load a model to start chatting…'
                : engine.status === 'loading'
                ? 'Waiting for model to load…'
                : 'Type a message…'
            }
          />
        </div>

        {/* Mobile model drawer */}
        <>
          {mobileModelsOpen && (
            <button
              type="button"
              aria-label="Close model drawer"
              onClick={() => setMobileModelsOpen(false)}
              className="sm:hidden absolute inset-0 bg-slate-950/70 z-30"
            />
          )}

          <div
            className={[
              'sm:hidden absolute inset-x-0 bottom-0 z-40 max-h-[80vh] rounded-t-3xl panel-glass border-t border-slate-500/60',
              'transition-transform duration-300 ease-out',
              mobileModelsOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none',
            ].join(' ')}
          >
            <div className="py-2 flex justify-center">
              <div className="w-12 h-1 rounded-full bg-slate-500" />
            </div>
            <div className="px-4 pb-4 overflow-y-auto max-h-[calc(80vh-20px)]">
              <ModelSelector
                models={MODEL_REGISTRY}
                selectedId={selectedModelId}
                onSelect={setSelectedModelId}
                webGPUAvailable={engine.webGPUAvailable}
              />

              <div className="space-y-3 pt-2">
                {engine.status === 'loading' && (
                  <LoadingProgress
                    progress={engine.progress}
                    message={engine.progressMsg}
                    modelName={selectedModel.displayName}
                  />
                )}

                <button
                  onClick={handleLoadModel}
                  disabled={engine.status === 'loading'}
                  className={[
                    'w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all tracking-wide',
                    engine.status === 'loading'
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-100 hover:bg-slate-200 text-black active:scale-[0.98]',
                  ].join(' ')}
                >
                  {engine.status === 'loading'
                    ? `Loading… ${engine.progress}%`
                    : engine.status === 'ready'
                    ? '↻ Reload / Switch Model'
                    : 'Load Model'}
                </button>
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
