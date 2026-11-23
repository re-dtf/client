import { beforeEach, describe, expect, it } from 'vitest';
import { REMARK_MAX, getRemark, removeRemark, remarks, restoreRemark, setRemark } from './remarks.svelte';

describe('заметки о пользователях', () => {
	beforeEach(() => {
		remarks.value = {};
	});

	it('сохраняет обрезанный текст с цветом и именем', () => {
		setRemark({ id: 7, name: 'Вася' }, `  ${'я'.repeat(REMARK_MAX + 10)}  `, 'green');
		const remark = getRemark(7);
		expect(remark?.text).toHaveLength(REMARK_MAX);
		expect(remark).toMatchObject({ color: 'green', name: 'Вася' });
	});

	it('пустой текст удаляет заметку, остальные не трогает', () => {
		setRemark({ id: 1, name: 'А' }, 'один');
		setRemark({ id: 2, name: 'Б' }, 'два');
		expect(setRemark({ id: 1, name: 'А' }, '   ')).toBeUndefined();
		expect(getRemark(1)).toBeUndefined();
		expect(getRemark(2)?.text).toBe('два');
	});

	it('возвращает удалённую заметку', () => {
		const remark = setRemark({ id: 3, name: 'В' }, 'тролль')!;
		removeRemark(3);
		expect(getRemark(3)).toBeUndefined();
		restoreRemark(3, remark);
		expect(getRemark(3)).toEqual(remark);
	});
});
