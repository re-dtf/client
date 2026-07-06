<script lang="ts">
	import { themeState } from './index.svelte.js';
	// Dynamic import of the component based on theme name and component name
	
	let { componentName, ...props } = $props<{ componentName: string, [key: string]: any }>();
	
	let LoadedComponent = $state<any>(null);
	
	$effect(() => {
		let isMounted = true;
		
		const loaders = import.meta.glob('./*/*.svelte');
		
		const load = async () => {
			const path = `./${themeState.value}/${componentName}.svelte`;
			if (loaders[path]) {
				const module = await loaders[path]();
				if (isMounted) {
					LoadedComponent = (module as any).default;
				}
			} else {
				console.error(`Component ${componentName} for theme ${themeState.value} not found`);
				LoadedComponent = null;
			}
		};
		
		load();
		
		return () => {
			isMounted = false;
		};
	});
</script>

{#if LoadedComponent}
	<LoadedComponent {...props} />
{/if}
