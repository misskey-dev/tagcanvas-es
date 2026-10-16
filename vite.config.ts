import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
	plugins: [dts({
		tsconfigPath: resolve(import.meta.dirname, 'tsconfig.app.json'),
		pathsToAliases: true,
		exclude: ['src/playground.ts'],
	})],
	build: {
		lib: {
			entry: resolve(import.meta.dirname, 'src/index.ts'),
			name: 'TagCanvas',
			fileName: (format) => `index.${format === 'cjs' ? 'cjs' : 'js'}`,
			formats: ['es', 'cjs'],
		},
	},
	resolve: {
		alias: {
			'@': resolve(import.meta.dirname, 'src'),
		},
	},
});
