import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ReactionPopup interactions', () => {
	const content = fs.readFileSync(path.join(__dirname, 'ReactionPopup.svelte'), 'utf8');

	it('не содержит обработчиков hover (mouseenter / mouseleave)', () => {
		expect(content).not.toContain('onmouseenter');
		expect(content).not.toContain('onmouseleave');
		expect(content).not.toContain('.reactions-popup::before');
	});

	it('обрабатывает ПКМ (contextmenu) для открытия и закрытия меню', () => {
		expect(content).toContain('oncontextmenu={onContextMenu}');
		expect(content).toContain('function onContextMenu');
		expect(content).toContain('e.preventDefault()');
	});

	it('поддерживает удержание пальцем на сенсорных экранах с тактильным откликом', () => {
		expect(content).toContain('onpointerdown={onPointerDown}');
		expect(content).toContain('onpointermove={onPointerMove}');
		expect(content).toContain('e.pointerType !== \'touch\'');
		expect(content).toContain('haptics.heavy()');
		expect(content).toContain('triggerLongPress');
	});

	it('предотвращает ложный клик по кнопке оценки после удержания', () => {
		expect(content).toContain('suppressClick');
		expect(content).toContain('stopClick');
		expect(content).toContain('capture: true');
	});

	it('содержит стили отключения нативного контекстного меню и выделения для touch', () => {
		expect(content).toContain('-webkit-touch-callout: none');
		expect(content).toContain('user-select: none');
	});

	it('вешает слушатели на window только при открытом меню', () => {
		expect(content).not.toContain('<svelte:window');
		expect(content).toContain('if (!open) return;');
	});

	it('Reactions тоже ставит слушатели на window только при открытии и не использует :has()', () => {
		const reactions = fs.readFileSync(path.join(__dirname, 'Reactions.svelte'), 'utf8');
		expect(reactions).not.toContain('<svelte:window');
		expect(reactions).not.toContain(':has(');
		expect(reactions).toContain('if (!picking) return;');
	});
});
