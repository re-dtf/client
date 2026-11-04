<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { openOverlay } from '$lib/navigation';

	// Настройки — окно поверх ленты. По прямой ссылке /settings сначала открываем ленту, потом окно
	onMount(async () => {
		const targetPage = page.url.searchParams.get('page') || undefined;
		const targetSection = page.url.searchParams.get('section') || undefined;
		await goto(resolve('/'), { replace: true });
		openOverlay({
			type: 'settings',
			data: targetPage || targetSection ? { page: targetPage, section: targetSection } : undefined
		});
	});
</script>

<p>Загрузка настроек...</p>
