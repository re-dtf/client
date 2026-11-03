<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { openOverlay } from '$lib/navigation';

	// Настройки — окно поверх ленты. По прямой ссылке /settings сначала открываем ленту, потом окно
	onMount(async () => {
		await goto(resolve('/'), { replace: true });
		openOverlay({ type: 'settings' });
	});
</script>

<p>Загрузка настроек...</p>
