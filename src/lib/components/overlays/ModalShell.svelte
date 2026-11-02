<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import ThemeLoader, { preloadThemeComponent } from '$lib/themes/ThemeLoader.svelte';
	import { activeTheme } from '$lib/themes/index.svelte';
	import type { ThemeComponents } from '$lib/themes/contract';
	import { closeOverlay } from '$lib/navigation';
	import { assetsReady } from '$lib/ready';
	import { backdropShow, modalShow, modalHide } from './modalMotion';

	/*
	 * Подложка и окно модального оверлея. Подложка появляется сразу, а окно показывается
	 * целиком: сначала грузится компонент темы (preload), потом картинки и шрифты окна.
	 * Если окно не готово за SPINNER_DELAY, на подложке появляется спиннер.
	 * Анимации окна берутся из motion активной темы (см. docs/architecture/motion.md).
	 */
	let { index, preload, children }: { index: number; preload?: keyof ThemeComponents; children: Snippet } = $props();

	const SPINNER_DELAY = 800;

	let mounted = $state(false);
	let ready = $state(false);
	let slow = $state(false);
	let body = $state<HTMLElement>();

	onMount(() => {
		const timer = setTimeout(() => (slow = true), SPINNER_DELAY);
		(async () => {
			if (preload) await preloadThemeComponent(activeTheme.chain, preload).catch(() => {});
			mounted = true;
			await tick();
			if (body) await assetsReady(body);
			ready = true;
			await tick();
			if (body) modalShow(body);
		})();
		return () => clearTimeout(timer);
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal"
	style:z-index={100 + index}
	out:modalHide|global
	{@attach backdropShow}
	onclick={(e) => {
		if (e.target === e.currentTarget) closeOverlay();
	}}
>
	{#if !ready && slow}
		<div class="wait"><ThemeLoader componentName="Spinner" inline /></div>
	{/if}
	<!-- Окно рисуется невидимым, пока не загрузятся его картинки: display: contents не мешает раскладке -->
	<div class="body" class:ready bind:this={body}>
		{#if mounted}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	/* Темы настраивают фон модалок через CSS-переменные (см. dtf2022/theme.css) */
	.modal {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background: var(--modal-backdrop, rgba(0, 0, 0, 0.4));
		backdrop-filter: var(--modal-backdrop-filter, blur(4px));
		-webkit-backdrop-filter: var(--modal-backdrop-filter, blur(4px));
		padding: var(--modal-padding, 20px);
		overflow-y: var(--modal-overflow-y, visible);
		box-sizing: border-box;
	}

	.wait {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	/* Спиннеру тем нужна светлая подложка: на затемнённом фоне чёрные точки не видны */
	.wait :global(.spinner-wrapper) {
		border-radius: 8px;
		background: var(--bg-modal, #fff);
	}

	.body {
		display: contents;
		visibility: hidden;
	}

	.body.ready {
		visibility: visible;
	}
</style>
