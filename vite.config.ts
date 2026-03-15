import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Local AI Chat',
        short_name: 'LocalAI',
        description: 'Run AI models locally in your browser — no server, no API keys',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#6366f1',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Allow large model shard files to be cached
        maximumFileSizeToCacheInBytes: 150 * 1024 * 1024,
        runtimeCaching: [
          // Model weight files (.bin, .onnx, .gguf)
          {
            urlPattern: /\.bin$|\.gguf$|\.onnx$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'model-weights',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Hugging Face CDN files (tokenizers, configs, model shards)
          {
            urlPattern: /^https:\/\/huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-files',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-cdn',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // MLC / GitHub raw model files
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mlc-model-files',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  // web-llm uses top-level await — exclude from Vite pre-bundling
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  // Workers must be ES modules so they can use dynamic import()
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (used by WASM/ONNX backends)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
