<script lang="ts">
	/*
	 * Значки разделов в духе символических иконок Adwaita: 16×16, контур 1.5px, цвет текста.
	 * Рисунки свои, не копии иконок GNOME.
	 */
	let { name }: { name: string } = $props();
</script>

<svg class="glyph" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'account' || name === 'profile'}
		<circle cx="8" cy="5.5" r="2.5" />
		<path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4" />
	{:else if name === 'notifications' || name === 'dtf'}
		<path d="M4 11V7a4 4 0 018 0v4l1 1.5H3z" />
		<path d="M6.5 14.5h3" />
	{:else if name === 'ignored'}
		<circle cx="8" cy="8" r="5.5" />
		<path d="M4.1 11.9l7.8-7.8" />
	{:else if name === 'appearance'}
		<!-- Палитра оформления / монитор -->
		<path d="M8 2.5c-3.3 0-5.5 2.4-5.5 5.5 0 3 2.2 5.5 5 5.5 1.2 0 1.5-.8 1-1.6-.5-.9 0-1.9 1-1.9H12c1 0 1.5-.8 1.5-1.8C13.5 4.5 11.3 2.5 8 2.5z" />
		<path d="M5.5 7h.01M8 5.5h.01M10.5 7h.01" stroke-width="2" />
	{:else if name === 'behavior'}
		<!-- Ползунки настроек поведения -->
		<path d="M2.5 4h3M7.5 4h6M2.5 8h7M11.5 8h2M2.5 12h4M8.5 12h5" />
		<circle cx="6.5" cy="4" r="1.2" fill="currentColor" />
		<circle cx="10.5" cy="8" r="1.2" fill="currentColor" />
		<circle cx="7.5" cy="12" r="1.2" fill="currentColor" />
	{:else if name === 'feed' || name === 'behavior-feed'}
		<!-- Лента постов -->
		<rect x="2.5" y="3" width="11" height="10" rx="2" />
		<path d="M5.5 6h5M5.5 9h3" />
	{:else if name === 'votes' || name === 'appearance-votes'}
		<!-- Оценки: стрелки вверх/вниз -->
		<path d="M5.5 10.5V5.5M3.5 7.5l2-2 2 2" />
		<path d="M10.5 5.5v5M8.5 8.5l2 2 2-2" />
	{:else if name === 'editor' || name === 'appearance-editor'}
		<!-- Редактор: перо -->
		<path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
	{:else if name === 'general' || name === 'appearance-general'}
		<!-- Общее: шестерёнка / слайдер -->
		<path d="M2.5 5h2.2M8.3 5h5.2M2.5 11h5.7M11.8 11h1.7" />
		<circle cx="6.5" cy="5" r="1.75" />
		<circle cx="10" cy="11" r="1.75" />
	{:else if name === 'sources'}
		<rect x="2.5" y="3" width="11" height="4" rx="1.5" />
		<rect x="2.5" y="9" width="11" height="4" rx="1.5" />
		<path d="M5 5h.01M5 11h.01" stroke-width="2" />
	{:else if name === 'network'}
		<circle cx="8" cy="8" r="5.5" />
		<path d="M2.8 8h10.4M8 2.5a8.5 8.5 0 010 11 8.5 8.5 0 010-11" />
	{:else if name === 'themes' || name === 'theme-select'}
		<path d="M8 2.5c-3.3 0-5.5 2.4-5.5 5.5 0 3 2.2 5.5 5 5.5 1.2 0 1.5-.8 1-1.6-.5-.9 0-1.9 1-1.9H12c1 0 1.5-.8 1.5-1.8C13.5 4.5 11.3 2.5 8 2.5z" />
		<path d="M5.5 7h.01M8 5.5h.01M10.5 7h.01" stroke-width="2" />
	{:else if name === 'theme'}
		<path d="M2.5 5h2.2M8.3 5h5.2M2.5 11h5.7M11.8 11h1.7" />
		<circle cx="6.5" cy="5" r="1.75" />
		<circle cx="10" cy="11" r="1.75" />
	{:else if name === 'comments' || name === 'behavior-comments'}
		<path d="M3 3.5h10a1 1 0 011 1v6a1 1 0 01-1 1H7.5L5 14v-2.5H3a1 1 0 01-1-1v-6a1 1 0 011-1z" />
	{:else if name === 'reactions' || name === 'behavior-reactions'}
		<circle cx="8" cy="8" r="5.5" />
		<path d="M5.8 9.6c.6.9 1.4 1.3 2.2 1.3s1.6-.4 2.2-1.3M6 6.5h.01M10 6.5h.01" />
	{:else if name === 'stats'}
		<path d="M3.5 13V8.5M8 13V3M12.5 13V6" stroke-width="2" />
	{:else if name === 'about'}
		<circle cx="8" cy="8" r="5.5" />
		<path d="M8 7.5v3.5M8 5h.01" />
	{:else}
		<path d="M8 13.5S2.5 10.2 2.5 6.3A2.9 2.9 0 018 5a2.9 2.9 0 015.5 1.3C13.5 10.2 8 13.5 8 13.5z" />
	{/if}
</svg>

<style>
	/* Стили темы (svg { fill }) сильнее атрибутов, поэтому контур задан здесь */
	.glyph {
		flex: none;
		fill: none;
		stroke: currentColor;
	}
</style>
