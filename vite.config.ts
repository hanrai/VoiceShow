import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	base: '',
	build: {
		cssCodeSplit: false,
		rollupOptions: {
			output: {
				format: 'iife',
				manualChunks: undefined,
				inlineDynamicImports: true,
				entryFileNames: 'assets/index.js',
				assetFileNames: 'assets/[name].[ext]',
			},
		},
		target: 'es2015',
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: false,
				drop_debugger: true,
			},
		},
	},
});
