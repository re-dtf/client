import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	plugins: [
		sveltekit({
			version: {
				name: pkg.version
			},
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: 'index.html'
			}),
			paths: {
				base: (process.env.BASE_PATH as `/${string}`) || ''
			},
			prerender: {
				handleUnseenRoutes: 'ignore'
			}
		}),
		SvelteKitPWA({
			registerType: 'prompt', // Оставляем ручное подтверждение
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,txt,json}'],
				navigateFallback: '/index.html', // Критично для SPA-роутинга
				cleanupOutdatedCaches: true
			},
			manifest: {
				// base
				name: 're:DTF', // Показывается при установке и на экране загрузки
				short_name: 're:DTF', // Показывается под иконкой на рабочем столе
				description: 'Неофициальный клиент для DTF', 
				
				// display
				display: 'standalone', // Убирает адресную строку браузера, делает вид полноценного десктопного/мобильного окна
				theme_color: '#D9F5FF', // Цвет верхней панели системы (status bar на телефоне / шапка окна на ПК)
				background_color: '#161617', // Цвет фона экрана загрузки
				lang: 'ru',

				// icons
				icons: [
					
					// для новых устройств
					{
						src: '/logo.svg',
						sizes: 'any',
						type: 'image/svg+xml'
					},

					// для Android
					{
						src: '/logo.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					},
					{
						src: '/logo-mono.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'monochrome'
					},

					// для старых устройств
					{
						src: '/logo-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/logo-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	]
});