import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Expose to local network for mobile testing
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log'],
            },
            format: {
                comments: false,
            },
        },
        cssCodeSplit: true,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
                    ui: ['react-bootstrap', 'bootstrap', 'react-toastify', 'recharts'],
                    export: ['jspdf', 'xlsx', 'file-saver'],
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
                }
            }
        }
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'framer-motion', 'react-hook-form'],
    }
});
