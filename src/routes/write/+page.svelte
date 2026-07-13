<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		// If user navigates directly to /write, push the state manually or go to index
		// For now, redirect to index and open editor
		goto(resolve('/'), { replaceState: true }).then(() => {
			history.pushState({ 
				sveltekit: { 
					states: {
						overlays: [{ id: `editor-${Date.now()}`, type: 'editor', presentation: 'modal' }] 
					} 
				} 
			}, '', resolve('/write'));
			window.dispatchEvent(new Event('popstate'));
		});
	});
</script>

<p>Загрузка редактора...</p>
