import type { Action } from 'svelte/action';
import { browser } from '$app/environment';

export type LottieLoader = () => Promise<{ default: object }>;

// lottie-web и JSON — отдельные чанки, но качаются заранее (preloadLottie), а не при первом клике
let playerPromise: Promise<typeof import('lottie-web/build/player/lottie_light').default> | undefined;
const dataPromises = new Map<LottieLoader, Promise<object>>();

const getPlayer = () => (playerPromise ??= import('lottie-web/build/player/lottie_light').then((m) => m.default));

function getData(load: LottieLoader) {
	let promise = dataPromises.get(load);
	if (!promise) dataPromises.set(load, (promise = load().then((m) => m.default)));
	return promise;
}

/** Подгрузить плеер и анимации в простое браузера, чтобы первая анимация не ждала сеть. */
export function preloadLottie(...loaders: LottieLoader[]) {
	if (!browser) return;
	const run = () => {
		getPlayer();
		loaders.forEach(getData);
	};
	if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1000 });
	else setTimeout(run, 200);
}

/** Один раз проигрывает lottie-анимацию внутри узла (svg-рендер, без повтора), как у DTF. */
export const lottie: Action<HTMLElement, { load: LottieLoader; oncomplete: () => void }> = (node, { load, oncomplete }) => {
	let animation: { destroy(): void } | undefined;
	let destroyed = false;

	Promise.all([getPlayer(), getData(load)]).then(
		([player, data]) => {
			if (destroyed) return;
			const instance = player.loadAnimation({
				container: node,
				animationData: structuredClone(data),
				renderer: 'svg',
				loop: false
			});
			instance.addEventListener('complete', oncomplete);
			animation = instance;
		},
		oncomplete
	);

	return {
		destroy() {
			destroyed = true;
			animation?.destroy();
		}
	};
};
