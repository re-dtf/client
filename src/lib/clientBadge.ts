import type { ClientBadgesMode } from '$lib/storage/settings.svelte';

export type ClientBadge =
	| { type: 'redtf'; label: string; title: string }
	| { type: 'android'; label: string; title: string; icon: string }
	| { type: 'ios'; label: string; title: string; icon: string };

/**
 * Определяет, какой бейдж клиента должен отображаться у комментария в зависимости от настроек.
 */
export function getCommentBadge(
	comment: { isRedtf?: boolean; deviceSource?: string | null },
	mode: ClientBadgesMode
): ClientBadge | null {
	if (mode === 'none') return null;

	// reDTF имеет наивысший приоритет
	if (comment.isRedtf) {
		return {
			type: 'redtf',
			label: 're:',
			title: 'Отправлено через reDTF'
		};
	}

	if (mode === 'all') {
		if (comment.deviceSource === 'android-app') {
			return {
				type: 'android',
				label: 'Android',
				title: 'Отправлено из приложения для Android',
				icon: 'v_android'
			};
		}
		if (comment.deviceSource === 'ios-app') {
			return {
				type: 'ios',
				label: 'iOS',
				title: 'Отправлено из приложения для iOS',
				icon: 'v_apple'
			};
		}
	}

	return null;
}
