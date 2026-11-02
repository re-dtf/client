<script lang="ts" module>
	import type { Component } from 'svelte';

	// Только компоненты в корне папки темы (./dtf2022/Post.svelte), вложенные папки — внутренности темы
	const modules = import.meta.glob<{ default: Component<any> }>('./*/*.svelte');

	// Уже загруженные компоненты: следующие ThemeLoader рисуют их сразу, без спиннера
	const loaded = new Map<string, Component<any>>();
	// Один промис на путь. Если блок {#await} пересчитается, он получит тот же промис и не перерисуется
	const loading = new Map<string, Promise<Component<any>>>();

	/** Путь компонента: у самой темы или, если там нет, у её основы */
	function findPath(chain: string[], name: string): string | undefined {
		return chain.map((id) => `./${id}/${name}.svelte`).find((path) => path in modules);
	}

	function load(path: string): Promise<Component<any>> {
		let promise = loading.get(path);
		if (!promise) {
			promise = modules[path]().then((module) => {
				loaded.set(path, module.default);
				return module.default;
			});
			loading.set(path, promise);
		}
		return promise;
	}

	/** Загрузить компонент заранее: следующий ThemeLoader нарисует его сразу, без спиннера */
	export function preloadThemeComponent(chain: string[], name: string): Promise<unknown> {
		const path = findPath(chain, name);
		return path ? load(path) : Promise.resolve();
	}
</script>

<script lang="ts" generics="N extends keyof ThemeComponents">
	import type { Snippet } from 'svelte';
	import Self from './ThemeLoader.svelte';
	import { activeTheme } from './index.svelte';
	import type { ThemeComponents } from './contract';

	/*
	 * Рисует компонент активной темы по имени. Пропсы из контракта (contract.ts) передаются как есть.
	 * Если у темы такого компонента нет, показывается содержимое тега (children), а без него — ошибка.
	 */
	let { componentName, ...props }: { componentName: N; children?: Snippet } & ThemeComponents[N] = $props();

	let path = $derived(findPath(activeTheme.chain, componentName));
	let cached = $derived(path ? loaded.get(path) : undefined);
</script>

{#snippet fallback(message: string)}
	{#if props.children}
		{@render props.children()}
	{:else}
		<div style="color: red; border: 1px solid red; padding: 10px;">
			ThemeLoader ({activeTheme.id}/{componentName}): {message}
		</div>
	{/if}
{/snippet}

{#if !path}
	{@render fallback('в теме нет такого компонента')}
{:else if cached}
	{@const Cached = cached}
	<Cached {...props} />
{:else}
	{#await load(path)}
		{#if componentName !== 'Spinner'}
			<Self componentName="Spinner" />
		{/if}
	{:then Loaded}
		<Loaded {...props} />
	{:catch error}
		{@render fallback(error.message)}
	{/await}
{/if}
