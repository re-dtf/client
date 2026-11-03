import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SettingsSelect from './SettingsSelect.svelte';

describe('SettingsSelect', () => {
	const options = [
		{ value: 'popular', title: 'Популярное' },
		{ value: 'new', title: 'Свежее' },
		{ value: 'my', title: 'Моя лента' }
	];

	it('рендерит кнопку-триггер с выбранным значением', () => {
		const { body } = render(SettingsSelect, {
			props: {
				options,
				value: 'popular',
				label: 'Лента по умолчанию'
			}
		});

		expect(body).toContain('class="select-btn');
		expect(body).toContain('role="combobox"');
		expect(body).toContain('aria-haspopup="listbox"');
		expect(body).toContain('aria-expanded="false"');
		expect(body).toContain('aria-label="Лента по умолчанию"');
		expect(body).toContain('Популярное');
	});

	it('рендерит chevron со стрелкой вниз', () => {
		const { body } = render(SettingsSelect, {
			props: {
				options,
				value: 'new'
			}
		});

		expect(body).toContain('chevron');
		expect(body).toContain('viewBox="0 0 16 16"');
		expect(body).toContain('aria-hidden="true"');
		expect(body).toContain('Свежее');
	});

	it('поддерживает id и disabled', () => {
		const { body } = render(SettingsSelect, {
			props: {
				options,
				value: 'my',
				id: 'custom-select-id',
				disabled: true
			}
		});

		expect(body).toContain('id="custom-select-id"');
		expect(body).toContain('disabled');
	});
});
