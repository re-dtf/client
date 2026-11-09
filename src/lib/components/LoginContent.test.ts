import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import LoginContent from './LoginContent.svelte';

describe('LoginContent Autofill', () => {
	it('рендерит форму входа с атрибутами автозаполнения для менеджеров паролей', () => {
		const { body } = render(LoginContent);

		expect(body).toContain('method="post"');
		expect(body).toContain('name="email"');
		expect(body).toContain('autocomplete="username"');
		expect(body).toContain('name="password"');
		expect(body).toContain('autocomplete="current-password"');
	});
});
