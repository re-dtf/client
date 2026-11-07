<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$lib/api/index.svelte';
	import type { SearchSubsite } from '$lib/api/types';
	import { getProfilePath, openProfile, openSearch } from '$lib/navigation';
	import { clickOnKey } from './a11y';
	import { formatNumber, plural } from './format';
	import Preloader from './ui/Preloader.svelte';

	let {
		autofocus = false,
		onclose
	}: {
		autofocus?: boolean;
		onclose?: () => void;
	} = $props();

	/*
	 * Поиск в шапке. На широком экране — поле в колонке записей (до 380px), с 859px и уже — кнопка, под шапкой раскрывается поле.
	 * Пока печатают, под полем плавают быстрые результаты: пользователи с блогами и темы (запросы `search/subsites`).
	 * Enter или «Все результаты» открывают страницу поиска.
	 */
	const MIN_LENGTH = 2;
	const DEBOUNCE = 250;
	const SHOWN = 4;

	let value = $state('');
	let focused = $state(false);
	let active = $state(false);
	let blogs = $state.raw<SearchSubsite[]>([]);
	let topics = $state.raw<SearchSubsite[]>([]);
	let loading = $state(false);
	let answered = $state('');
	let root = $state<HTMLElement>();
	let input = $state<HTMLInputElement>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Номер запроса: ответ на прежний набор не должен перетереть новый
	let requestId = 0;

	let query = $derived(value.trim());
	let ready = $derived(query.length >= MIN_LENGTH);
	let open = $derived(focused && ready);
	let nothing = $derived(answered === query && !loading && !blogs.length && !topics.length);

	export function focus() {
		input?.focus();
	}

	$effect(() => {
		if (autofocus && input) {
			input.focus();
		}
	});

	function find(text: string) {
		const id = ++requestId;
		loading = true;
		Promise.allSettled([api.searchSubsites(text, false), api.searchSubsites(text, true)]).then(([users, communities]) => {
			if (id !== requestId) return;
			blogs = users.status === 'fulfilled' ? users.value.items.slice(0, SHOWN) : [];
			topics = communities.status === 'fulfilled' ? communities.value.items.slice(0, SHOWN) : [];
			answered = text;
			loading = false;
		});
	}

	function onInput() {
		clearTimeout(timer);
		requestId++;
		if (!ready) {
			loading = false;
			return;
		}
		loading = true;
		timer = setTimeout(() => find(query), DEBOUNCE);
	}

	function close() {
		focused = false;
		active = false;
		input?.blur();
		onclose?.();
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!query) return;
		openSearch(query);
		close();
	}

	function pick(e: MouseEvent, subsite: SearchSubsite) {
		openProfile(e, subsite.id);
		close();
	}

	function toggle() {
		active = !active;
		if (active) queueMicrotask(() => input?.focus());
	}

	function closeOnOutside(e: MouseEvent) {
		if (!root?.contains(e.target as Node)) {
			if ((e.target as Element)?.closest?.('.header-search-toggle')) return;
			focused = false;
			active = false;
			onclose?.();
		}
	}
</script>

<svelte:window onclick={closeOnOutside} onkeydown={(e) => e.key === 'Escape' && (focused || active) && close()} />

<div class={['search', { 'search--active': active, 'search--filled': !!value }]} bind:this={root}>
	<div class="search__button" role="button" tabindex="0" aria-label="Поиск" aria-expanded={active} onclick={toggle} onkeydown={clickOnKey}>
		<svg class="icon" width="28" height="28" aria-hidden="true">
			<use href="/icons.svg#v_search"></use>
		</svg>
	</div>

	<form class="search__field" role="search" onsubmit={submit}>
		<div class={['field', { 'field--focused': focused }]}>
			<input
				bind:this={input}
				bind:value
				class="field__input"
				type="text"
				placeholder="Поиск"
				aria-label="Поиск"
				autocomplete="off"
				enterkeyhint="search"
				oninput={onInput}
				onfocus={() => (focused = true)}
			/>
		</div>

		{#if open}
			<div class="popup" role="listbox" aria-label="Быстрые результаты">
				{#each [{ title: 'Блоги', items: blogs }, { title: 'Темы', items: topics }] as group (group.title)}
					{#if group.items.length}
						<div class="popup__title">{group.title}</div>
						{#each group.items as subsite (subsite.id)}
							<a class="popup-item" role="option" aria-selected="false" href={resolve(getProfilePath(subsite.id) as any)} onclick={(e) => pick(e, subsite)}>
								<span class="popup-item__avatar" style:background-image={subsite.avatarUrl ? `url('${subsite.avatarUrl}')` : undefined}></span>
								<span class="popup-item__info">
									<span class="popup-item__name">{subsite.name}</span>
									{#if subsite.subscribersCount}
										<span class="popup-item__count">
											{formatNumber(subsite.subscribersCount)} {plural(subsite.subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])}
										</span>
									{/if}
								</span>
							</a>
						{/each}
					{/if}
				{/each}

				{#if loading && !blogs.length && !topics.length}
					<div class="popup__status"><Preloader /></div>
				{:else if nothing}
					<div class="popup__status">Ничего не найдено</div>
				{/if}

				<button type="submit" class="popup__all">Все результаты по запросу «{query}»</button>
			</div>
		{/if}
	</form>
</div>

<style>
	.search {
		--field-height: 44px;

		display: flex;
		align-items: center;
		width: 100%;
		max-width: 380px;
	}

	.search__button {
		display: none;
		align-items: center;
		height: 100%;
		padding: 0 16px;
		cursor: pointer;
	}

	.search__button:hover,
	.search--active .search__button {
		color: var(--color-accent);
	}

	.search__field {
		position: relative;
		width: 100%;
		height: var(--field-height);
	}

	.field {
		box-sizing: border-box;
		display: flex;
		height: var(--field-height);
		padding: 0 20px;
		border: 1px solid transparent;
		border-radius: 9px;
		background-color: var(--bg-search-field);
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	@media (hover: hover) {
		.field:hover {
			border-color: var(--border-search-hover);
			box-shadow: 0 0 0 3px var(--shadow-search-ring);
			background-color: var(--bg-search-field-focus);
		}
	}

	.field--focused {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--shadow-search-ring);
		background-color: var(--bg-search-field-focus);
	}

	.field__input {
		width: 100%;
		min-width: 0;
		padding: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--text-primary);
		font: inherit;
		font-size: 16px;
	}

	.field__input::placeholder {
		color: var(--text-search-placeholder);
		opacity: 1;
	}

	/* Быстрые результаты: белая плашка во всю ширину поля */
	.popup {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 20;
		overflow: hidden;
		margin-top: 8px;
		border-radius: 8px;
		background: var(--bg-card);
		box-shadow: var(--shadow-dropdown);
		color: var(--text-primary);
	}

	.popup__title {
		padding: 12px 20px 4px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 18px;
	}

	.popup-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 20px;
		color: inherit;
		text-decoration: none;
	}

	.popup-item:hover {
		background: var(--bg-card-hover);
	}

	.popup-item__avatar {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--border-color) 50% 50% / cover no-repeat;
		box-shadow: inset 0 0 0 1px var(--border-avatar);
	}

	.popup-item__info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.popup-item__name {
		overflow: hidden;
		font-size: 15px;
		line-height: 20px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.popup-item__count {
		color: var(--text-muted);
		font-size: 12px;
		line-height: 16px;
	}

	.popup__status {
		display: flex;
		justify-content: center;
		padding: 16px 20px;
		color: var(--text-muted);
		font-size: 14px;
	}

	.popup__all {
		display: block;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		margin-top: 6px;
		padding: 12px 20px;
		border-top: 0.67px solid var(--border-subtle);
		color: var(--text-link);
		font: inherit;
		font-size: 14px;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;
	}

	.popup__all:hover {
		background: var(--bg-card-hover);
	}

	@media (min-width: 860px) and (max-width: 1179px) {
		.search {
			max-width: 300px;
		}
	}

	@media (min-width: 860px) and (max-width: 989px) {
		.search {
			max-width: 250px;
		}
	}

	/* Уже 860px — кнопка, поле раскрывается полосой под шапкой */
	@media (max-width: 859px) {
		.search {
			width: auto;
			max-width: none;
			height: 100%;
		}

		.search__button {
			display: flex;
		}

		.search__field {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			display: none;
			box-sizing: content-box;
			width: auto;
			height: auto;
			padding: 6px 16px 12px;
			background-color: var(--bg-header);
		}

		.search--active .search__field {
			display: block;
		}

		.field {
			padding: 0 16px;
		}

		.popup {
			left: 16px;
			right: 16px;
		}
	}
</style>
