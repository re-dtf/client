import { browser } from '$app/environment';

export function persistedState<T>(key: string, initialValue: T) {
	let value = $state<T>(initialValue);

	if (browser) {
		const item = localStorage.getItem(key);
		if (item !== null) {
			try {
				value = JSON.parse(item);
			} catch (e) {
				console.error(`Error parsing localStorage key "${key}":`, e);
			}
		}

		// Автоматически отслеживаем любые глубокие изменения (включая мутации массивов)
		// и сохраняем их в localStorage через реактивный эффект Svelte 5.
		$effect.root(() => {
			$effect(() => {
				try {
					localStorage.setItem(key, JSON.stringify(value));
				} catch (e) {
					console.error(`Error saving persisted state for key "${key}":`, e);
				}
			});
		});
	}

	return {
		get value() {
			return value;
		},
		set value(newValue: T) {
			value = newValue;
			if (browser) {
				try {
					localStorage.setItem(key, JSON.stringify(newValue));
				} catch (e) {
					console.error(`Error saving persisted state for key "${key}":`, e);
				}
			}
		}
	};
}
