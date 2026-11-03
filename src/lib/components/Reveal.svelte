<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { assetsReady } from '$lib/ready';
	import { grow, play, reducedMotion, type AnimKey } from '$lib/motion';
	import { incomingReady, pageTransition } from '$lib/pageTransition.svelte';

	/*
	 * Блок, который сперва показывает заглушку загрузки темы, а когда данные пришли — содержимое.
	 * Два вида:
	 * - `block` (лента): заглушка — блок на месте будущего содержимого. Он тает, а блок плавно растягивается до высоты
	 *   содержимого; содержимое, готовое сразу (из кэша), не растягивается. Как содержимое появляется, решает оно само (`appear`).
	 * - с `anim` (страницы поста и профиля): одинокий спиннер. Содержимое строится скрытым, и пока не отрисуются его картинки
	 *   (ждём недолго), спиннер остаётся, иначе на экране мелькнули бы серые рамки. Потом спиннер тает, а содержимое
	 *   появляется анимацией `anim` темы, без растягивания.
	 * Если блок участвует в универсальном переходе страниц (pageTransition), спиннер не показывается —
	 * старый экран уходит вглубь, а новый плавно приближается по окончании загрузки.
	 * `onshow` вызывается, когда содержимое появилось, `onreveal` — когда закончилась и его анимация. Тяжёлое (комментарии) стройте по `onreveal`.
	 */
	let {
		ready,
		block = false,
		anim,
		onshow,
		onreveal,
		children
	}: { ready: boolean; block?: boolean; anim?: AnimKey; onshow?: () => void; onreveal?: () => void; children: Snippet<[boolean]> } = $props();

	let staged = $derived(!block && anim !== undefined);

	let box = $state<HTMLElement>();
	let stage = $state<HTMLElement>();
	let revealed = $state(false);

	let layerId = $derived(box?.closest('[data-layer]')?.getAttribute('data-layer') ?? null);
	let inTransition = $derived(layerId ? pageTransition.isIncoming(layerId) : false);

	let visible = $derived(staged ? (inTransition ? ready : revealed) : ready);

	let pending = untrack(() => !ready);
	let fromHeight = 0;

	// Сброс состояния, если данные перестали быть готовы (смена параметров, перезагрузка)
	$effect(() => {
		if (!ready) revealed = false;
	});

	// Высоту заглушки надо снять до того, как DOM заменит её содержимым (только при растягивании)
	$effect.pre(() => {
		if (!block) return;
		const isReady = ready;
		untrack(() => {
			fromHeight = pending && isReady && box ? box.offsetHeight : 0;
			pending = !isReady;
		});
	});

	$effect(() => {
		if (!ready) return;
		untrack(() => {
			if (block && box && fromHeight) grow(box, fromHeight, activeTheme.motion?.grow);
			fromHeight = 0;
		});
	});

	// Показ скрытого содержимого после картинок
	$effect(() => {
		if (!staged || !ready) return;
		if (untrack(() => revealed)) return;
		let live = true;
		untrack(async () => {
			await tick();
			if (stage) await assetsReady(stage, 700);
			if (!live) return;

			revealed = true;
			await tick();

			const currentLayer = box?.closest('[data-layer]')?.getAttribute('data-layer');
			if (currentLayer && pageTransition.isIncoming(currentLayer)) {
				// Экран участвует в переходе: передаем управление фазе Approach на весь экран слоя
				const layerEl = box?.closest('[data-layer]');
				const screenEl = (layerEl?.firstElementChild as HTMLElement) ?? stage;
				if (screenEl) await incomingReady(currentLayer, screenEl);
				if (!live) return;
				await tick();
				onshow?.();
				onreveal?.();
				return;
			}

			// Обычный показ (без перехода между страницами)
			onshow?.();
			if (stage && anim) {
				const motion = activeTheme.motion;
				// ponytail: размытие на слое выше шести экранов рвёт кадры, такому содержимому хватает проявления
				const tall = stage.offsetHeight > innerHeight * 6;
				await play(stage, tall ? motion?.pageIn : motion?.[anim])?.finished.catch(() => {});
			}
			if (!live) return;
			onreveal?.();
		});
		return () => (live = false);
	});

	/** Заглушка не держит место: поверх содержимого она тает, а высоту задаёт содержимое */
	function leave(node: HTMLElement) {
		const duration = activeTheme.motion?.placeholderOut;
		if (!duration || reducedMotion()) return { duration: 0 };
		Object.assign(node.style, { position: 'absolute', inset: '0 0 auto', pointerEvents: 'none' });
		return { duration, easing: cubicOut, css: (t: number) => `opacity: ${t}; scale: ${0.97 + 0.03 * t}` };
	}
</script>

<div class="reveal" bind:this={box}>
	{#if !visible && !inTransition}
		<div class:bare={!block} out:leave>
			<ThemeLoader componentName="Spinner" inline={!block} {block} />
		</div>
	{/if}
	{#if ready}
		<div class={['stage', { staging: !visible && !inTransition }]} bind:this={stage}>
			{@render children(visible)}
		</div>
	{/if}
</div>

<style>
	.reveal {
		position: relative;
		width: 100%;
	}

	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	/* Одинокий спиннер страницы: чуть ниже шапки, а не прижат к ней */
	.bare {
		display: flex;
		justify-content: center;
		padding-top: 72px;
	}

	/* Содержимое строится рядом со спиннером, не меняя высоту блока и оставаясь невидимым */
	.staging {
		position: absolute;
		inset: 0 0 auto;
		visibility: hidden;
		pointer-events: none;
	}
</style>
