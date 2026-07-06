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
	}

	return {
		get value() {
			return value;
		},
		set value(newValue: T) {
			value = newValue;
			if (browser) {
				localStorage.setItem(key, JSON.stringify(newValue));
			}
		}
	};
}
