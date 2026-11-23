<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { on } from 'svelte/events';
	import { getRemark } from '$lib/storage/remarks.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import { haptics } from '$lib/haptics';
	import { remarkEditor } from '../actions.svelte';

	/*
	 * Заметка о пользователе рядом с именем: цветная точка и короткий текст.
	 * Режимы: точка и текст, только текст, только точка. Мышь: в режиме «только точка» текст выезжает при наведении, нажатие открывает окно заметки.
	 * Касание: нажатие раскрывает и сворачивает заметку, долгое нажатие открывает окно заметки.
	 * Долгое нажатие на самой метке не доходит до меню пользователя: оно открывается от имени и аватара.
	 */
	let { user }: { user: { id: number; name: string } } = $props();

	const LONG_PRESS_MS = 450;
	const MOVE_TOLERANCE_PX = 10;

	let remark = $derived(getRemark(user.id));
	let view = $derived(settings.value.remarkView);

	let chip = $state<HTMLButtonElement>();
	let open = $state(false);

	let pointer = '';
	let touching = false;
	let held = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let start = { x: 0, y: 0 };

	function cancelPress() {
		clearTimeout(timer);
		timer = undefined;
	}

	function onpointerdown(e: PointerEvent) {
		pointer = e.pointerType;
		if (e.pointerType !== 'touch') return;
		// Иначе то же нажатие, дойдя до шапки автора, откроет меню пользователя
		e.stopPropagation();
		touching = true;
		held = false;
		start = { x: e.clientX, y: e.clientY };
		cancelPress();
		timer = setTimeout(() => {
			held = true;
			haptics.click();
			remarkEditor.open(user);
		}, LONG_PRESS_MS);
	}

	function onpointermove(e: PointerEvent) {
		if (timer && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE_PX) cancelPress();
	}

	function onpointerup() {
		cancelPress();
		touching = false;
	}

	// Окно открылось под пальцем: без этого отпускание даст клик по подложке и окно сразу закроется
	function ontouchend(e: TouchEvent) {
		if (held) e.preventDefault();
	}

	// Долгое касание на Android присылает ещё и contextmenu; мышиный правый щелчок идёт к меню пользователя
	function oncontextmenu(e: MouseEvent) {
		if (!touching && !held) return;
		e.preventDefault();
		e.stopPropagation();
	}

	// Эти два события должны остановиться на метке до шапки автора. Делегированные обработчики Svelte (onpointerdown=) срабатывают
	// уже на корне, когда шапка отреагировала, поэтому слушаем самой кнопкой
	const claimTouch: Attachment<HTMLElement> = (node) => {
		const offDown = on(node, 'pointerdown', onpointerdown);
		const offMenu = on(node, 'contextmenu', oncontextmenu);
		return () => {
			offDown();
			offMenu();
		};
	};

	function onclick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (held) held = false;
		else if (pointer === 'touch') open = !open;
		else remarkEditor.open(user);
		pointer = '';
	}
</script>

<!-- Касание вне метки сворачивает раскрытую заметку -->
<svelte:window onpointerdown={(e) => open && !chip?.contains(e.target as Node) && (open = false)} />

{#if remark && view !== 'off'}
	<button
		bind:this={chip}
		type="button"
		class="remark"
		data-color={remark.color}
		data-view={view}
		data-expanded={view !== 'dot' || open ? '' : undefined}
		data-open={open ? '' : undefined}
		title={view !== 'dot' ? remark.text : undefined}
		aria-label="Заметка: {remark.text}"
		aria-expanded={open}
		{onpointermove}
		{onpointerup}
		onpointercancel={onpointerup}
		{ontouchend}
		{@attach claimTouch}
		{onclick}
	>
		<span class="remark__dot"></span>
		<span class="remark__reveal">
			<!-- Ширину запоминаем в --w: плавно менять можно только число, а не auto -->
			<span
				class="remark__text"
				{@attach (el) => {
					remark?.text;
					const chip = el.closest<HTMLElement>('.remark');
					chip?.style.setProperty('--w', `${el.scrollWidth}px`);
					// Переход включается после первой раскладки, иначе заметка выезжала бы при каждом появлении в списке
					const frame = requestAnimationFrame(() => chip?.setAttribute('data-ready', ''));
					return () => cancelAnimationFrame(frame);
				}}>{remark.text}</span
			>
		</span>
	</button>
{/if}

<style>
	.remark {
		--c: var(--text-muted);
		--cap: 195px;
		--reveal-gap: 5px;

		position: relative;
		align-self: center;
		display: inline-flex;
		align-items: center;
		max-width: 100%;
		height: 16px;
		padding: 0 6px;
		margin: 0 var(--gap-details, 6px) 0 var(--remark-offset, 0);
		border-radius: 8px;
		background: color-mix(in srgb, var(--c) 14%, transparent);
		color: var(--text-primary);
		font-size: 12px;
		line-height: 16px;
		cursor: pointer;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	/* На телефоне имя автора в строке комментария важнее текста заметки; раскрытая заметка может занять больше места */
	@media (max-width: 639px) {
		.remark {
			--cap: 95px;
		}

		.remark[data-open] {
			--cap: 60vw;
		}
	}

	/* Нажимать можно на тач-экране: зона нажатия больше самой метки */
	@media (pointer: coarse) {
		.remark::after {
			content: '';
			position: absolute;
			inset: -14px -6px;
		}
	}

	.remark[data-color='red'] { --c: #e5484d; }
	.remark[data-color='orange'] { --c: #f76b15; }
	.remark[data-color='yellow'] { --c: #e0a800; }
	.remark[data-color='green'] { --c: #30a46c; }
	.remark[data-color='blue'] { --c: #3e8ef7; }
	.remark[data-color='purple'] { --c: #8e4ec6; }

	/* Без точки: текст стоит сразу у края плашки, а цвет виден в её оттенке */
	.remark[data-view='plain'] {
		--reveal-gap: 0px;
	}

	.remark[data-view='plain'] .remark__dot {
		display: none;
	}

	.remark__dot {
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--c);
	}

	/* Текст выезжает по ширине: меняется число (--w из JS), поэтому переход плавный */
	.remark__reveal {
		min-width: 0;
		width: 0;
		margin-left: 0;
		overflow: hidden;
		opacity: 0;
	}

	.remark:global([data-ready]) .remark__reveal {
		transition: width var(--duration-base, 0.2s) ease, margin-left var(--duration-base, 0.2s) ease, opacity var(--duration-base, 0.2s) ease;
	}

	.remark[data-expanded] .remark__reveal,
	.remark:focus-visible .remark__reveal {
		width: min(var(--w, 0px), var(--cap));
		margin-left: var(--reveal-gap);
		opacity: 1;
	}

	@media (hover: hover) {
		.remark:hover .remark__reveal {
			width: min(var(--w, 0px), var(--cap));
			margin-left: var(--reveal-gap);
			opacity: 1;
		}
	}

	.remark__text {
		display: block;
		width: min(var(--w, 0px), var(--cap));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.remark:global([data-ready]) .remark__reveal {
			transition: none;
		}
	}
</style>
