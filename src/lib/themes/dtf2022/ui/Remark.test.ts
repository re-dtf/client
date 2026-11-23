import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { remarks, setRemark } from '$lib/storage/remarks.svelte';
import { settings } from '$lib/storage/settings.svelte';
import Remark from './Remark.svelte';

const user = { id: 5, name: 'Имя' };

describe('Remark', () => {
	beforeEach(() => {
		remarks.value = {};
		settings.patch({ remarkView: 'text' });
	});

	it('без заметки и при выключенном виде ничего не рисует', () => {
		expect(render(Remark, { props: { user } }).body).not.toContain('class="remark');
		setRemark(user, 'тролль', 'red');
		settings.patch({ remarkView: 'off' });
		expect(render(Remark, { props: { user } }).body).not.toContain('class="remark');
	});

	it('в режимах с текстом раскрыта и подписана, в режиме точки свёрнута и без подсказки', () => {
		setRemark(user, 'тролль', 'red');
		const text = render(Remark, { props: { user } }).body;
		expect(text).toContain('data-expanded');
		expect(text).toContain('title="тролль"');
		expect(text).toContain('data-color="red"');

		settings.patch({ remarkView: 'plain' });
		const plain = render(Remark, { props: { user } }).body;
		expect(plain).toContain('data-view="plain"');
		expect(plain).toContain('data-expanded');

		settings.patch({ remarkView: 'dot' });
		const dot = render(Remark, { props: { user } }).body;
		expect(dot).not.toContain('data-expanded');
		expect(dot).not.toContain('title=');
		expect(dot).toContain('aria-label="Заметка: тролль"');
	});
});
