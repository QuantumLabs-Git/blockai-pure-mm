import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // This allows external connections
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'blockaipuremm.ngrok.dev',
      '.ngrok.dev', // This allows any subdomain of ngrok.dev
      '.ngrok-free.app', // Also allow ngrok-free.app domains
      '.ngrok.io' // And ngrok.io domains
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
            res.end('Proxy error: Could not connect to backend server. Make sure the backend is running on port 5001.');
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})