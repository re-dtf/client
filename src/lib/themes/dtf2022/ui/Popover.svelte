<script lang="ts" generics="T extends string | number">
	import type { Snippet } from 'svelte';
	import { appear, disappear } from '$lib/themes/appear';
	import { clickOnKey } from '../a11y';

	/**
	 * Выпадающий список под кнопкой-триггером (children), по умолчанию выровненный по её правому краю.
	 * Триггер сам переключает `open`. Отступ вниз и вбок можно задать снаружи: --popover-gap и --popover-left.
	 */
	let {
		open = $bindable(false),
		items,
		selected,
		onselect,
		width = 143,
		align = 'right',
		label,
		searchable = false,
		empty = 'Ничего не найдено',
		children
	}: {
		open?: boolean;
		/** `hint` — подсказка при наведении: что пункт делает на самом деле; `image` и `details` — аватар и вторая строка */
		items: { value: T; label: string; group?: string; icon?: string; hint?: string; image?: string; details?: string }[];
		selected?: T;
		onselect: (value: T, event: MouseEvent | KeyboardEvent) => void;
		/** Для `center` нужна числовая ширина: окно центруется по кнопке отрицательным отступом, transform занят анимацией */
		width?: number | string;
		align?: 'left' | 'right' | 'center';
		label?: string;
		/** Что показать, когда пунктов нет */
		empty?: string;
		/** Строка поиска над списком (для длинных списков) */
		searchable?: boolean;
		children: Snippet;
	} = $props();

	let anchor = $state<HTMLElement>();
	let query = $state('');
	const visible = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return needle ? items.filter((item) => item.label.toLowerCase().includes(needle)) : items;
	});

	// Поле поиска живёт, пока список открыт: в него сразу можно печатать, а запрос не переходит на следующее открытие
	function searchField(input: HTMLInputElement) {
		query = '';
		input.focus();
	}

	function select(value: T, event: MouseEvent | KeyboardEvent) {
		open = false;
		onselect(value, event);
	}

	// Слушатели на window ставим только пока меню открыто, чтобы в длинных списках не копились тысячи обработчиков
	$effect(() => {
		if (!open) return;
		const onOutsideClick = (e: MouseEvent) => {
			if (!anchor?.contains(e.target as Node)) open = false;
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		window.addEventListener('click', onOutsideClick);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('click', onOutsideClick);
			window.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<span class="popover-anchor" bind:this={anchor}>
	{@render children()}

	{#if open}
		<div
			class={['popover', { 'popover--left': align === 'left', 'popover--center': align === 'center' }]}
			style:width={typeof width === 'number' ? `${width}px` : width}
			style:margin-left={align === 'center' && typeof width === 'number' ? `${-width / 2}px` : undefined}
			role="listbox"
			aria-label={label}
			{@attach appear('popoverIn')}
			out:disappear|global={'popoverOut'}
		>
			{#if searchable}
				<input
					class="popover__search"
					type="search"
					placeholder="Поиск"
					aria-label="Поиск"
					autocomplete="off"
					bind:value={query}
					onkeydown={(e) => e.key === 'Enter' && visible[0] && (e.preventDefault(), select(visible[0].value, e))}
					{@attach searchField}
				/>
			{/if}
			<div class="popover__content">
				{#each visible as item, i (item.value)}
					{#if i > 0 && item.group !== visible[i - 1].group}
						<div class="popover__divider" aria-hidden="true"></div>
					{/if}
					<div
						class={['popover-item', { 'popover-item--selected': item.value === selected }]}
						role="option"
						aria-selected={item.value === selected}
						title={item.hint}
						tabindex="0"
						onclick={(e) => select(item.value, e)}
						onkeydown={clickOnKey}
					>
						{#if item.icon}
							<div class={['popover-item__icon', { 'popover-item__icon--active': item.icon === 'v_bookmark_solid' }]}>
								<svg class="icon" width="20" height="20" aria-hidden="true">
									<use href="#{item.icon}"></use>
								</svg>
							</div>
						{/if}
						{#if item.image !== undefined}
							<div class="popover-item__image" style:background-image={item.image ? `url('${item.image}')` : undefined}></div>
						{/if}
						<div class="popover-item__main">
							<div class="popover-item__label">{item.label}</div>
							{#if item.details}
								<div class="popover-item__details">{item.details}</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="popover__empty">{empty}</div>
				{/each}
			</div>
		</div>
	{/if}
</span>

<style>
	.popover-anchor {
		position: relative;
		display: flex;
		width: var(--popover-anchor-width, auto);
	}

	.popover {
		--item-offset-right: 18px;

		position: absolute;
		top: calc(100% + var(--popover-gap, 8px));
		right: 0;
		z-index: 17;
		max-width: var(--popover-max-width, 400px);
		overflow: hidden;
		border-radius: 8px;
		background-color: var(--bg-card);
		box-shadow: var(--shadow-dropdown);
		color: var(--text-primary);
		font-size: 16px;
		line-height: 1.5em;
		text-align: left;
		transform-origin: top right;
		user-select: none;
	}

	.popover--left {
		right: auto;
		left: var(--popover-left, 0);
		transform-origin: top left;
	}

	.popover--center {
		right: auto;
		left: 50%;
		transform-origin: top center;
	}

	/* Длинный список прокручивается внутри себя, а не растягивает страницу */
	.popover__content {
		max-height: min(320px, 50vh);
		padding: 6px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.popover__search {
		display: block;
		width: calc(100% - 12px);
		min-height: 36px;
		margin: 6px 6px 0;
		padding: 0 11px;
		box-sizing: border-box;
		border: 1px solid var(--border-input);
		border-radius: 8px;
		background-color: var(--bg-secondary);
		color: inherit;
		font: inherit;
		outline: 0;
	}

	.popover__search:focus {
		border-color: var(--color-blue);
		background-color: var(--bg-card);
	}

	.popover__empty {
		padding: 6px 10px;
		color: var(--text-subtle);
	}

	.popover__divider {
		margin: 4px 6px;
		border-top: 1px solid var(--border-color);
	}

	.popover-item {
		--color-background: transparent;
		display: flex;
		align-items: center;
		padding: 6px var(--item-offset-right) 6px 10px;
		border-radius: 6px;
		background-color: var(--color-background);
		cursor: pointer;
		outline: 0;
	}

	.popover-item:not(:last-child) {
		margin-bottom: 4px;
	}

	.popover-item:hover,
	.popover-item:focus-visible {
		--color-background: var(--bg-card-hover);
	}

	.popover-item--selected {
		--item-offset-right: 10px;
		--color-background: var(--bg-popover-selected);
	}

	.popover-item--selected:hover,
	.popover-item--selected:focus-visible {
		--color-background: var(--bg-popover-selected-hover);
	}

	.popover-item__icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		margin-right: 10px;
	}

	/* Добавленная закладка в меню синяя */
	.popover-item__icon--active {
		color: var(--color-blue);
	}

	/* Аватар пункта, как .popover-item__image у DTF */
	.popover-item__image {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		margin-right: 10px;
		border-radius: 6px;
		background-color: var(--bg-avatar, #dedede);
		background-size: cover;
		box-shadow: inset 0 0 0 1px var(--border-avatar);
	}

	.popover-item__main {
		min-width: 0;
	}

	.popover-item__label,
	.popover-item__details {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.popover-item__details {
		margin-top: 1px;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 20px;
	}

	.popover-item--selected .popover-item__label {
		font-weight: 500;
	}
</style>
