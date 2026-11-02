<script lang="ts">
	import { onMount } from 'svelte';
	import type { ToastType } from './notify.svelte';

	let {
		type,
		message,
		lifeTime = 3000,
		onhide
	}: {
		type: ToastType;
		message: string;
		lifeTime?: number;
		onhide: () => void;
	} = $props();

	type Phase = '' | 'shown' | 'hidden' | 'swiped';

	let phase = $state<Phase>('');
	let itemHeight = $state(44);
	let text = $state<HTMLElement>();
	let grabFrom = $state<number | null>(null);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	// Пока плашка не показана или показана — своя высота, потом схлопывается
	let height = $derived(phase === '' || phase === 'shown' ? `${itemHeight}px` : '0');

	function setPhase(next: Phase) {
		if (next === 'hidden' || next === 'swiped') setTimeout(onhide, 600);
		phase = next;
	}

	// Длинное сообщение не влезает в 44px: высота — по тексту плюс отступы
	onMount(() => {
		if (text && text.offsetHeight >= itemHeight) itemHeight = text.offsetHeight + 22;
		const showTimer = setTimeout(() => {
			setPhase('shown');
			hideTimer = setTimeout(() => setPhase('hidden'), lifeTime);
		}, 100);
		return () => {
			clearTimeout(showTimer);
			clearTimeout(hideTimer);
		};
	});

	// Смахивание вправо мышью или пальцем
	function swipe(e: PointerEvent) {
		if (grabFrom === null || e.clientX - grabFrom <= 20) return;
		clearTimeout(hideTimer);
		setPhase('swiped');
		grabFrom = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={['notify-item', `notify-item--${type}`, phase && `notify-item--${phase}`, { 'notify-item--grab': grabFrom !== null }]}
	style:height
	role={type === 'error' ? 'alert' : 'status'}
	onpointerdown={(e) => (grabFrom = e.clientX)}
	onpointerup={() => (grabFrom = null)}
	onpointermove={swipe}
>
	<svg class="notify-item__icon icon" width="24" height="24" aria-hidden="true">
		<use href="/icons.svg#{type === 'error' ? 'v_cancel' : 'v_success'}"></use>
	</svg>
	<p bind:this={text}>{message}</p>
	<button type="button" class="notify-item__close" aria-label="Закрыть" onclick={() => setPhase('hidden')}>
		<svg class="icon" width="20" height="20" aria-hidden="true">
			<use href="/icons.svg#v_cross"></use>
		</svg>
	</button>
</div>

<style>
	.notify-item {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 0;
		padding: 11px 42px 11px 46px;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.2);
		color: #000;
		font-size: 0;
		opacity: 0;
		transform: translateX(120%);
		user-select: none;
		touch-action: pan-y;
		z-index: 1000;
	}

	.notify-item--grab {
		cursor: grab;
	}

	.notify-item--shown {
		margin-bottom: 16px;
		opacity: 1;
		transform: translateX(0%);
		transition:
			height 350ms ease,
			margin 350ms ease,
			transform 350ms 175ms cubic-bezier(0.175, 0.885, 0.32, 1.15),
			opacity 350ms cubic-bezier(0.2, 0, 0.2, 1);
	}

	.notify-item--hidden {
		height: 0;
		margin-bottom: 0;
		opacity: 0;
		transition:
			height 175ms 350ms ease,
			margin 175ms 350ms ease,
			opacity 350ms linear;
	}

	.notify-item--swiped {
		height: 0;
		margin-bottom: 0;
		opacity: 0;
		transform: translateX(120%);
		transition:
			height 350ms 175ms ease,
			margin 350ms 175ms ease,
			transform 525ms ease,
			opacity 350ms ease;
	}

	.notify-item__icon {
		position: absolute;
		left: 12px;
		top: 10px;
		flex: 0 0 auto;
		margin-right: 10px;
	}

	.notify-item__close {
		position: absolute;
		right: 12px;
		top: 12px;
		color: #bfbfbf;
		cursor: pointer;
	}

	.notify-item p {
		margin: 0;
		font-size: 15px;
		line-height: 22px;
	}

	.notify-item::before {
		content: '';
		display: inline-block;
		height: 100%;
		vertical-align: middle;
	}
</style>
