<script lang="ts">
	import { REMARK_COLORS, REMARK_MAX, getRemark, restoreRemark, setRemark, type RemarkColor } from '$lib/storage/remarks.svelte';
	import { remarkEditor } from '../actions.svelte';
	import Button from './Button.svelte';
	import Popup from './Popup.svelte';
	import { notify } from './notify.svelte';

	/*
	 * Окно заметки о пользователе. Рисуется один раз в макете темы, пока открыта `remarkEditor.target`;
	 * поля начинаются заново при каждом открытии, поэтому в макете окно стоит под {#key}.
	 */
	let { user }: { user: { id: number; name: string } } = $props();

	const COLOR_NAMES: Record<RemarkColor, string> = {
		red: 'Красный',
		orange: 'Оранжевый',
		yellow: 'Жёлтый',
		green: 'Зелёный',
		blue: 'Синий',
		purple: 'Фиолетовый'
	};

	// Окно открывается заново для каждого человека ({#key} в макете), поэтому берём заметку один раз
	// svelte-ignore state_referenced_locally
	const saved = getRemark(user.id);
	let text = $state(saved?.text ?? '');
	let color = $state<RemarkColor | undefined>(saved?.color);

	function save() {
		const next = setRemark(user, text, color);
		remarkEditor.close();
		if (!next && saved) notify.success('Заметка удалена', { label: 'Отменить', onclick: () => restoreRemark(user.id, saved) });
	}

	function onkeydown(e: KeyboardEvent) {
		// Enter сохраняет, Shift+Enter переносит строку; во время набора через IME Enter подтверждает слово
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			save();
		}
	}
</script>

<Popup title="Заметка о {user.name}" width={480} onclose={remarkEditor.close}>
	<textarea
		class="remark-editor__text"
		rows="3"
		maxlength={REMARK_MAX}
		placeholder="Например: «разбирается в Dark Souls» или «спорит ради спора»"
		aria-label="Текст заметки"
		bind:value={text}
		{onkeydown}
		{@attach (el) => {
			// Меню, из которого открыли окно, при закрытии возвращает фокус на страницу: ждём кадр
			const frame = requestAnimationFrame(() => el.focus());
			return () => cancelAnimationFrame(frame);
		}}
	></textarea>
	{#if text.length > REMARK_MAX - 40}
		<div class="remark-editor__counter">{text.length} / {REMARK_MAX}</div>
	{/if}

	<div class="remark-editor__colors" role="radiogroup" aria-label="Цвет метки">
		{#each REMARK_COLORS as value (value)}
			<button
				type="button"
				class="remark-editor__color"
				data-color={value}
				role="radio"
				aria-checked={color === value}
				aria-label={COLOR_NAMES[value]}
				title={COLOR_NAMES[value]}
				onclick={() => (color = color === value ? undefined : value)}
			></button>
		{/each}
	</div>

	<p class="remark-editor__hint">Видите только вы. Заметка хранится на этом устройстве и не уходит на DTF.</p>

	{#snippet footer()}
		{#if saved}
			<Button label="Удалить" onclick={() => { text = ''; save(); }} />
		{/if}
		<Button label="Отмена" onclick={remarkEditor.close} />
		<Button variant="blue" label="Сохранить" disabled={!text.trim() && !saved} onclick={save} />
	{/snippet}
</Popup>

<style>
	.remark-editor__text {
		width: 100%;
		padding: 10px 11px;
		border: 1px solid var(--border-input);
		border-radius: 8px;
		background-color: var(--bg-secondary);
		color: inherit;
		font: inherit;
		font-size: 16px;
		line-height: 24px;
		resize: none;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	.remark-editor__text:focus {
		background-color: var(--bg-card);
		border-color: var(--border-focus);
		box-shadow: var(--focus-ring);
		outline: none;
	}

	.remark-editor__counter {
		margin-top: 4px;
		color: var(--text-muted);
		font-size: 12px;
		line-height: 16px;
		text-align: right;
	}

	.remark-editor__colors {
		display: flex;
		gap: 12px;
		margin-top: 16px;
	}

	.remark-editor__color {
		position: relative;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--c);
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	/* Нажимать можно на тач-экране: зона нажатия больше кружка */
	.remark-editor__color::after {
		content: '';
		position: absolute;
		inset: -8px -6px;
	}

	.remark-editor__color:hover {
		transform: scale(1.1);
	}

	.remark-editor__color[aria-checked='true'] {
		box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 4px var(--c);
	}

	.remark-editor__color:focus-visible {
		outline: 2px solid var(--color-blue);
		outline-offset: 3px;
	}

	.remark-editor__color[data-color='red'] { --c: #e5484d; }
	.remark-editor__color[data-color='orange'] { --c: #f76b15; }
	.remark-editor__color[data-color='yellow'] { --c: #e0a800; }
	.remark-editor__color[data-color='green'] { --c: #30a46c; }
	.remark-editor__color[data-color='blue'] { --c: #3e8ef7; }
	.remark-editor__color[data-color='purple'] { --c: #8e4ec6; }

	.remark-editor__hint {
		margin: 16px 0 0;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 18px;
	}
</style>
