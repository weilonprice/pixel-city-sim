import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  css: {
    postcss: {}
  },
  server: {
    port: 3000,
    open: false
  }
});
