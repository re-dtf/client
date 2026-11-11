import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { build, defineConfig } from 'vite';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function resolveVersion(command?: string): string {
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

	// В dev-сервере держим стабильную версию, чтобы Vite не сбрасывал кэш зависимостей при каждом git-коммите
	if (command === 'serve') return `${pkg.version}-dev`;

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

// SvelteKit не обрабатывает transformIndexHtml. Собираем синхронный запуск из тех же
// манифестов и функций, что использует приложение, и встраиваем в его шаблон.
async function writeAppTemplate() {
	const result = await build({
		configFile: false,
		logLevel: 'silent',
		resolve: { alias: { '$lib': path.resolve('./src/lib') } },
		build: {
			write: false,
			minify: true,
			lib: { entry: 'src/lib/themes/bootstrap.ts', formats: ['iife'], name: 'reDTFAppearance' }
		}
	});
	const bundle = Array.isArray(result) ? result[0] : result;
	if (!('output' in bundle)) throw new Error('Не удалось собрать оформление запуска');
	const code = bundle.output.find(item => item.type === 'chunk')?.code;
	if (!code) throw new Error('Не найден код оформления запуска');
	const template = readFileSync('src/app.html', 'utf8').replace('<!-- redtf:appearance -->', `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`);
	mkdirSync('.svelte-kit', { recursive: true });
	writeFileSync('.svelte-kit/app-template.html', template);
}

export default defineConfig(async ({ command }) => {
	await writeAppTemplate();
	const appVersion = resolveVersion(command);

	return {
		resolve: {
			alias: {
				'$lib': path.resolve('./src/lib')
			}
		},
		optimizeDeps: {
			include: [
				'dompurify',
				'photoswipe',
				'lottie-web/build/player/lottie_light',
				'@editorjs/editorjs',
				'@editorjs/header',
				'@editorjs/image',
				'@editorjs/list',
				'@editorjs/quote',
				'@editorjs/code',
				'@editorjs/delimiter'
			]
		},
		plugins: [
			sveltekit({
				files: { appTemplate: ".svelte-kit/app-template.html" },
				version: {
					name: appVersion
				},
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter({
					fallback: '404.html'
				}),
				paths: {
					base: basePath as `/${string}`
				},
				prerender: {
					handleUnseenRoutes: 'ignore'
				}
			}),
			{
				name: 'redtf-appearance-template',
				async handleHotUpdate({ file }: { file: string }) {
					if (file.endsWith('/src/app.html') || /\/src\/lib\/(themes|storage)\/.*\.ts$/.test(file)) await writeAppTemplate();
				}
			},
			svgIconsPlugin(basePath)
		]
	};
});
