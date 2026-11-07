<script lang="ts">
	import { onMount } from 'svelte';

	let topPx = $state(0);
	let bottomPx = $state(0);
	let headerPx = $state(0);
	let mobileBarPx = $state(0);

	function updateMetrics() {
		if (typeof window === 'undefined') return;

		// Замер safe-area через вспомогательный элемент с padding: env(...)
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
		const rawHeader = rootStyle.getPropertyValue('--header-height');
		const rawMobile = rootStyle.getPropertyValue('--mobile-bar-height');
		headerPx = parseFloat(rawHeader) || 60;
		mobileBarPx = parseFloat(rawMobile) || 50;
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

<div class="safe-area-overlay" aria-hidden="true">
	<!-- Верхняя зона отступа (Status Bar / Notch) -->
	<div class="stripe stripe--safe-top">
		<span class="badge badge--red">Safe Area Top: {topPx}px</span>
	</div>

	<!-- Зона содержимого верхней панели -->
	<div class="stripe stripe--header">
		<span class="badge badge--blue">Header: 60px (Total: {headerPx}px)</span>
	</div>

	<!-- Зона мобильного бара (если экран узкий) -->
	<div class="stripe stripe--mobile-bar">
		<span class="badge badge--amber">Mobile Bar: 50px (Total: {mobileBarPx}px)</span>
	</div>

	<!-- Нижняя зона отступа (Home Indicator / Gesture Bar) -->
	<div class="stripe stripe--safe-bottom">
		<span class="badge badge--green">Safe Area Bottom: {bottomPx}px</span>
	</div>
</div>

<style>
	.safe-area-overlay {
		position: fixed;
		inset: 0;
		z-index: 99990;
		pointer-events: none;
		user-select: none;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.stripe {
		position: absolute;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.stripe--safe-top {
		top: 0;
		height: env(safe-area-inset-top, 0px);
		min-height: 4px;
		background: rgba(239, 68, 68, 0.28);
		border-bottom: 2px dashed #ef4444;
	}

	.stripe--header {
		top: env(safe-area-inset-top, 0px);
		height: var(--header-height-raw, 60px);
		background: rgba(59, 130, 246, 0.16);
		border-bottom: 2px dashed #3b82f6;
	}

	.stripe--mobile-bar {
		bottom: env(safe-area-inset-bottom, 0px);
		height: var(--mobile-bar-height-raw, 50px);
		background: rgba(245, 158, 11, 0.16);
		border-top: 2px dashed #f59e0b;
	}

	.stripe--safe-bottom {
		bottom: 0;
		height: env(safe-area-inset-bottom, 0px);
		min-height: 4px;
		background: rgba(16, 185, 129, 0.28);
		border-top: 2px dashed #10b981;
	}

	.badge {
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		line-height: 14px;
		color: #ffffff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	.badge--red {
		background: #dc2626;
	}

	.badge--blue {
		background: #2563eb;
	}

	.badge--amber {
		background: #d97706;
	}

	.badge--green {
		background: #059669;
	}
</style>
