import type { Plugin } from 'vite';
import process from 'node:process';

export function devProxy(): Plugin {
  return {
    name: 'polaris-dev-proxy',
    apply: 'serve',
    config: () => ({
      server: {
        host: '127.0.0.1',
        proxy: {
          '/data.json': {
            target: process.env.POLARIS_SERVE_URL || 'http://127.0.0.1:8790',
            changeOrigin: true,
          },
        },
      },
    }),
  };
}
