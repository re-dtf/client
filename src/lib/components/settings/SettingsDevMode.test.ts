import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'svelte/server';

vi.mock('$app/env', () => ({
	dev: false,
	browser: true,
	version: '1.0.0'
}));

import SettingsScreen from './SettingsScreen.svelte';
import { settings } from '$lib/storage/settings.svelte';

describe('SettingsScreen: режим разработчика в продакшене', () => {
	beforeEach(() => {
		settings.patch({ devMode: false });
	});

	it('без devMode прячет раздел и не открывает «Дебаг» по прямой ссылке', () => {
		const { body } = render(SettingsScreen, { props: { onclose: () => {}, page: 'debug' } });

		expect(body).not.toContain('Разработка');
		expect(body).not.toContain('Диагностический отчёт');
	});

	it('с devMode показывает раздел и открывает «Дебаг»', () => {
		settings.patch({ devMode: true });
		const { body } = render(SettingsScreen, { props: { onclose: () => {}, page: 'debug' } });

		expect(body).toContain('Разработка');
		expect(body).toContain('Диагностический отчёт');
	});
});
