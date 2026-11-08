<script lang="ts">
	import { onMount } from 'svelte';
	import { isNative } from '$lib/capacitor';

	let topPx = $state(0);
	let bottomPx = $state(0);
	let headerPx = $state(0);
	let mobileBarPx = $state(0);
	let width = $state(0);
	let height = $state(0);
	let collapsed = $state(false);

	function updateMetrics() {
		if (typeof window === 'undefined') return;

		width = window.innerWidth;
		height = window.innerHeight;

		const probe = document.createElement('div');
		probe.style.position = 'fixed';
		probe.style.top = '0';
		probe.style.left = '0';
		probe.style.visibility = 'hidden';
		probe.style.pointerEvents = 'none';
		probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
		probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
		document.body.appendChild(probe);
		const style = window.getComputedStyle(probe);
		topPx = parseFloat(style.paddingTop) || 0;
		bottomPx = parseFloat(style.paddingBottom) || 0;
		document.body.removeChild(probe);

		const rootStyle = window.getComputedStyle(document.documentElement);
		headerPx = parseFloat(rootStyle.getPropertyValue('--header-height')) || 60;
		mobileBarPx = parseFloat(rootStyle.getPropertyValue('--mobile-bar-height')) || 50;
	}

	onMount(() => {
		updateMetrics();
		window.addEventListener('resize', updateMetrics);
		window.addEventListener('orientationchange', updateMetrics);
		return () => {
			window.removeEventListener('resize', updateMetrics);
			window.removeEventListener('orientationchange', updateMetrics);
		};
	});
</script>

<div class="hud" class:hud--collapsed={collapsed} role="region" aria-label="Панель отладки Safe Area">
	<button class="hud__header" onclick={() => (collapsed = !collapsed)}>
		<span class="hud__indicator"></span>
		<span class="hud__title">DEBUG</span>
		<span class="hud__dims">{width}×{height}</span>
	</button>

	{#if !collapsed}
		<div class="hud__body">
			<div class="hud__row">
				<span class="hud__key">Safe Top:</span>
				<span class="hud__val hud__val--red">{topPx}px</span>
			</div>
			<div class="hud__row">
				<span class="hud__key">Safe Bottom:</span>
				<span class="hud__val hud__val--green">{bottomPx}px</span>
			</div>
			<div class="hud__row">
				<span class="hud__key">Header Total:</span>
				<span class="hud__val hud__val--blue">{headerPx}px</span>
			</div>
			<div class="hud__row">
				<span class="hud__key">Mobile Bar:</span>
				<span class="hud__val hud__val--amber">{mobileBarPx}px</span>
			</div>
			<div class="hud__row">
				<span class="hud__key">Native App:</span>
				<span class="hud__val">{isNative() ? 'Capacitor' : 'Web'}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.hud {
		position: fixed;
		bottom: calc(env(safe-area-inset-bottom, 0px) + 60px);
		right: 12px;
		z-index: 99995;
		background: rgba(17, 24, 39, 0.88);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 11px;
		color: #f3f4f6;
		overflow: hidden;
		user-select: none;
	}

	.hud__header {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 6px 10px;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		color: inherit;
		cursor: pointer;
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
	}

	.hud__indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 6px #10b981;
	}

	.hud__title {
		letter-spacing: 0.5px;
	}

	.hud__dims {
		margin-left: auto;
		color: #9ca3af;
		font-weight: normal;
	}

	.hud__body {
		padding: 6px 10px 8px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.hud__row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}

	.hud__key {
		color: #9ca3af;
	}

	.hud__val {
		font-weight: 600;
	}

	.hud__val--red {
		color: #f87171;
	}

	.hud__val--green {
		color: #34d399;
	}

	.hud__val--blue {
		color: #60a5fa;
	}

	.hud__val--amber {
		color: #fbbf24;
	}
</style>
