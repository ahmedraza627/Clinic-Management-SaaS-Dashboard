import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: the SPA calls same-origin /api/* → Express on :4000. No CORS
// gymnastics in dev; in prod the built dist/ can be served by nginx/Express.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vendor splitting (function form — the object form matches package
        // entry IDs only, which misses React 18's real CJS implementation
        // files and accidentally drags react INTO the charts chunk).
        // Matching node_modules PATHS instead: react/react-dom/scheduler go
        // to a static, cacheable vendor-react chunk; recharts + its d3 deps
        // go to vendor-charts, fetched ONLY when Analytics mounts.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (
            /[\\/]node_modules[\\/]recharts[\\/]/.test(id) ||
            /recharts|victory|d3-|react-smooth|react-transition-group|fast-equals/.test(id)
          ) {
            return 'vendor-charts';
          }
          return 'vendor-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
