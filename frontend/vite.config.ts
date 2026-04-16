import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // SSE streaming endpoint — listed BEFORE the generic /api rule so it
        // matches first. No timeout so the long-lived connection is never cut.
        '/api/approve/stream': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, _req, res) => {
              // Prevent any intermediate buffering of SSE events
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              proxyRes.headers['content-type'] = 'text/event-stream';
              res.setHeader('X-Accel-Buffering', 'no');
              res.setHeader('Cache-Control', 'no-cache');
            });
          },
        },
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          timeout: 600000,       // 10 min — full pipeline with retries can be slow
        },
      }
    },
  };
});
