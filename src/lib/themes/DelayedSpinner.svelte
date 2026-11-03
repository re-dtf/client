<script lang="ts">
	import { onMount } from 'svelte';
	import ThemeLoader from './ThemeLoader.svelte';

	/* Спиннер темы, который показывается, только если ожидание затянулось: быстрая загрузка компонента проходит без мелькания */
	const DELAY = 500;

	let shown = $state(false);

	onMount(() => {
		const timer = setTimeout(() => (shown = true), DELAY);
		return () => clearTimeout(timer);
	});
</script>

{#if shown}
	<ThemeLoader componentName="Spinner" />
{/if}
