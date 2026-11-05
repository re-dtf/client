import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function resolveVersion(): string {
	const raw =
		process.env.APP_VERSION ||
		(process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined) ||
		(() => {
			try {
				return execSync('git describe --tags --exact-match', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
			} catch {
				return undefined;
			}
		})();
	if (raw) return raw.replace(/^refs\/tags\//, '').replace(/^v/, '');

	const commit =
		process.env.GITHUB_SHA?.slice(0, 7) ||
		(() => {
			try {
				return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
			} catch {
				return undefined;
			}
		})();

	return commit ? `${pkg.version}-${commit}` : pkg.version;
}

const appVersion = resolveVersion();
const basePath = process.env.BASE_PATH === '/' ? '' : (process.env.BASE_PATH || '').replace(/\/+$/, '');

function svgIconsPlugin(base: string) {
	if (!base) return [];
	return {
		name: 'svg-icons-base',
		renderChunk: (code: string) => ({
			code: code.replace(/(["'`])\/(icons|reIcons)\.svg#/g, `$1${base}/$2.svg#`),
			map: null
		})
	};
}

export default defineConfig({
	resolve: {
		alias: {
			'$lib': path.resolve('./src/lib')
		}
	},
	plugins: [
		sveltekit({
			version: {
				name: appVersion
			},
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: 'index.html'
			}),
			paths: {
				base: basePath as `/${string}`
			},
			prerender: {
				handleUnseenRoutes: 'ignore'
			}
		}),
		svgIconsPlugin(basePath)
	]
});
