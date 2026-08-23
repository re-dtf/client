<script lang="ts">
	import { themeState } from './index.svelte.js';
	import ThemeLoader from './ThemeLoader.svelte';

	let { componentName, ...props } = $props<{ componentName: string, [key: string]: any }>();

	const themeModules = import.meta.glob('./**/*.svelte');

	let loaderPromise = $derived.by(() => {
		const key = `./${themeState.value}/${componentName}.svelte`;
		const importFn = themeModules[key];
		if (!importFn) {
			return Promise.reject(new Error(`Component ${key} not found in theme modules`));
		}
		return importFn();
	});
</script>

{#await loaderPromise}
	{#if componentName !== 'Spinner'}
		<ThemeLoader componentName="Spinner" />
	{/if}
{:then module}
	{@const LoadedComponent = (module as any).default}
	<LoadedComponent {...props} />
{:catch error}
	{#if props.children}
		{@render props.children()}
	{:else}
		<div style="color: red; border: 1px solid red; padding: 10px;">
			ThemeLoader Error ({themeState.value}/{componentName}): {error.message}
		</div>
	{/if}
{/await}
