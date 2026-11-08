import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Popup from './Popup.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Popup', () => {
	it('содержит портал в body для глобального позиционирования и защиты от обрезания', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'Popup.svelte'), 'utf8');

		expect(svelteContent).toContain('portal');
		expect(svelteContent).toContain('document.body.appendChild');
		expect(svelteContent).toContain('{@attach portal}');
		expect(svelteContent).toContain('overscroll-behavior: contain');
	});

	it('рендерит заголовок и оверлей в SSR', () => {
		const { body } = render(Popup, {
			props: {
				title: 'GIF',
				onclose: vi.fn(),
				children: createRawSnippet(() => ({
					render: () => '<div class="test-content">Контент</div>'
				}))
			}
		});

		expect(body).toContain('popup-overlay');
		expect(body).toContain('GIF');
		expect(body).toContain('popup__close');
		expect(body).toContain('test-content');
	});
});
