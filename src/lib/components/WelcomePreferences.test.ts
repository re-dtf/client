import { expect, it } from 'vitest';
import { render } from 'svelte/server';
import { activeTheme } from '$lib/themes/index.svelte';
import { activeThemeSettings } from '$lib/themes/settings.svelte';
import WelcomePreferences from './WelcomePreferences.svelte';

it('быстрая настройка отражает значения активной темы и скрывает отсутствующие поля', () => {
	const previousTheme = activeTheme.id;
	activeTheme.set('redtf');
	const store = activeThemeSettings();
	const previousValues = store.value;
	try {
		store.patch({ votes: 'reactions', contentWidth: 820, palette: 'amoled' });
		const { body } = render(WelcomePreferences);
		expect(body).toMatch(/aria-pressed="true"[^>]*>\s*Реакции/);
		expect(body).toContain('820px');
		expect(body).toContain('AMOLED');
		expect(body).not.toContain('<select');
		expect(body).not.toContain('Стрелки оценки');
		expect(store.value).toEqual({ ...previousValues, votes: 'reactions', contentWidth: 820, palette: 'amoled' });

		activeTheme.set('dtf2022');
		const original = render(WelcomePreferences).body;
		expect(original).toContain('Вид оценок');
		expect(original).not.toContain('Ширина контента');
		expect(original).not.toContain('AMOLED');
	} finally {
		store.value = previousValues;
		activeTheme.set(previousTheme);
	}
});
