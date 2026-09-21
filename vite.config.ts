import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* The dev server proxies /api to the Node process that holds the key, so the
   browser never sees it. That is the same split the built app has: this file
   is not a development convenience, it is the architecture. */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5178' },
  },
});
