import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createPiramideApiMiddleware } from './src/server/piramideViteMiddleware';

function piramideApiPlugin(): Plugin {
  return {
    name: 'piramide-api-plugin',
    configureServer(server) {
      server.middlewares.use(createPiramideApiMiddleware());
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), piramideApiPlugin()],
  server: {
    port: 3000,
    open: true,
  },
});


