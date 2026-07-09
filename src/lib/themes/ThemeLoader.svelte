<script lang="ts">
	import { themeState } from './index.svelte.js';
	let { componentName, ...props } = $props<{ componentName: string, [key: string]: any }>();
</script>

{#await import(`./${themeState.value}/${componentName}.svelte`) then module}
	{@const LoadedComponent = module.default}
	<LoadedComponent {...props} />
{:catch error}
	<div style="color: red; border: 1px solid red; padding: 10px;">
		ThemeLoader Error ({themeState.value}/{componentName}): {error.message}
	</div>
{/await}
