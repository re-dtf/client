import { browser } from '$app/environment';

export class PersistedState<T> {
	private key: string;
	private _value = $state<T>() as T;

	constructor(key: string, initialValue: T) {
		this.key = key;
		this._value = initialValue;

		if (browser) {
			const item = localStorage.getItem(key);
			if (item !== null) {
				try {
					this._value = JSON.parse(item);
				} catch (e) {
					console.error(`Error parsing localStorage key "${key}":`, e);
				}
			}
		}
	}

	get value(): T {
		return this._value;
	}

	set value(newValue: T) {
		this._value = newValue;
		if (browser) {
			localStorage.setItem(this.key, JSON.stringify(newValue));
		}
	}
}
