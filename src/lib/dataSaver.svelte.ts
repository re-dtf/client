import { settings, type MediaAutoplay } from '$lib/storage/settings.svelte';

interface Connection extends EventTarget {
	saveData?: boolean;
}

// Network Information API есть не везде (Chrome, Android WebView); где его нет, экономии трафика «нет»
const connection = (typeof navigator === 'undefined' ? undefined : (navigator as { connection?: Connection }).connection);

let saveData = $state(!!connection?.saveData);
connection?.addEventListener('change', () => (saveData = !!connection.saveData));

/** Можно ли грузить ролик сразу при выбранном режиме (`saver` — включена ли экономия трафика в системе) */
export function autoplayAllowed(mode: MediaAutoplay, saver = saveData): boolean {
	return mode === 'always' || (mode === 'auto' && !saver);
}

/** Грузить ли сразу ролик этого вида по текущим настройкам */
export function shouldAutoplay(kind: 'gif' | 'video'): boolean {
	return autoplayAllowed(kind === 'gif' ? settings.value.gifAutoplay : settings.value.videoAutoplay);
}
