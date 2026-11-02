<script lang="ts">
	import { onMount } from 'svelte';
	import type { GifResult } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { loadOnVisible } from '../loadOnVisible';
	import Popup from '../ui/Popup.svelte';
	import Preloader from '../ui/Preloader.svelte';
	import { notify } from '../ui/notify.svelte';

	/** Выбор гифки для комментария: сначала избранные, дальше поиск. Список ищет через 400 мс после ввода. */
	let {
		onpick,
		onclose
	}: {
		onpick: (gif: GifResult) => void;
		onclose: () => void;
	} = $props();

	let query = $state('');
	let gifs = $state.raw<GifResult[]>([]);
	let cursor = $state<string>();
	let loading = $state(false);
	let loaded = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let searchedQuery = '';

	async function load(more = false) {
		if (loading) return;
		const q = query.trim();
		loading = true;
		try {
			if (q) {
				const result = await api.searchGifs(q, more ? cursor : '');
				gifs = more ? [...gifs, ...result.items] : result.items;
				cursor = result.cursor;
			} else {
				gifs = await api.getFavoriteGifs();
				cursor = undefined;
			}
			searchedQuery = q;
		} catch (e) {
			notify.error((e as Error).message);
		} finally {
			loading = false;
			loaded = true;
		}
	}

	function onInput() {
		clearTimeout(timer);
		timer = setTimeout(() => query.trim() !== searchedQuery && load(), 400);
	}

	// Первая загрузка — избранное
	onMount(() => {
		load();
		return () => clearTimeout(timer);
	});
</script>

<Popup title="GIF" width={520} {onclose}>
	<div class="gif-picker">
		<label class="gif-picker__search">
			<svg class="icon gif-picker__search-icon" width="20" height="20" aria-hidden="true">
				<use href="/icons.svg#v_search"></use>
			</svg>
			<input type="search" placeholder="Поиск гифок" aria-label="Поиск гифок" bind:value={query} oninput={onInput} />
		</label>

		{#if !query.trim() && gifs.length > 0}
			<p class="gif-picker__title">Избранное</p>
		{/if}

		<div class="gif-picker__grid">
			{#each gifs as gif (gif.media.data.uuid)}
				<button type="button" class="gif-picker__item" onclick={() => onpick(gif)}>
					<img src={gif.previewUrl} alt="" loading="lazy" />
				</button>
			{/each}
		</div>

		{#if loading}
			<div class="gif-picker__status"><Preloader /></div>
		{:else if loaded && gifs.length === 0}
			<p class="gif-picker__status">{query.trim() ? 'Ничего не найдено' : 'В избранном пока ничего нет'}</p>
		{:else if cursor}
			<div class="gif-picker__more" {@attach loadOnVisible(() => load(true))}></div>
		{/if}
	</div>
</Popup>

<style>
	.gif-picker {
		max-height: 60vh;
		margin: -8px -12px;
		padding: 8px 12px;
		overflow-y: auto;
	}

	.gif-picker__search {
		position: relative;
		display: block;
	}

	.gif-picker__search input {
		width: 100%;
		height: 38px;
		box-sizing: border-box;
		padding: 0 11px 0 41px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		background-color: #f5f5f5;
		font: inherit;
		font-size: 16px;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	.gif-picker__search input:focus {
		border-color: var(--color-blue);
		background-color: #fff;
		outline: 0;
		box-shadow: 0 0 0 3px rgba(70, 131, 217, 0.12);
	}

	.gif-picker__search-icon {
		position: absolute;
		top: 9px;
		left: 10px;
		color: rgba(0, 0, 0, 0.65);
		pointer-events: none;
	}

	.gif-picker__title {
		margin: 16px 0 8px;
		color: #595959;
		font-size: 14px;
		line-height: 20px;
	}

	.gif-picker__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 12px;
	}

	.gif-picker__title + .gif-picker__grid {
		margin-top: 0;
	}

	.gif-picker__item {
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 8px;
		background-color: #f5f5f5;
		cursor: pointer;
	}

	.gif-picker__item img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.gif-picker__status {
		display: flex;
		justify-content: center;
		margin: 16px 0 0;
		color: #595959;
		font-size: 15px;
	}

	.gif-picker__more {
		height: 1px;
	}
</style>
