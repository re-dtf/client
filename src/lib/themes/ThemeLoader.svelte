<script lang="ts">
	import { themeState } from './index.svelte.js';
	let { componentName, ...props } = $props<{ componentName: string, [key: string]: any }>();
</script>

{#await import(`./${themeState.value}/${componentName}.svelte`) then module}
	{@const LoadedComponent = module.default}
	<LoadedComponent {...props} />
{:catch}
	<!-- fallback if not found -->
{/await}
