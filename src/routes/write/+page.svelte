<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { openOverlay } from '$lib/navigation';

	// Редактор — оверлей поверх ленты. По прямой ссылке /write сначала открываем ленту, потом редактор
	onMount(async () => {
		await goto(resolve('/'), { replace: true });
		openOverlay({ type: 'editor' });
	});
</script>

<p>Загрузка редактора...</p>
