<script lang="ts">
	import { PERIODS, type Period } from '$lib/feed.svelte';
	import { formatDay } from './format';
	import Popover from './ui/Popover.svelte';
	import { haptics } from '$lib/haptics';

	// Вкладки ленты у dtf2022 живут в сайдбаре и мобильной панели, здесь только выбор периода «Популярного»
	let {
		currentFeed,
		period,
		switchPeriod
	}: {
		currentFeed: string;
		period: Period;
		switchPeriod: (period: Period) => void;
	} = $props();

	const LABELS: Record<Period, string> = {
		now: formatDay(new Date()),
		day: '24 часа',
		week: 'Неделя',
		month: 'Месяц',
		year: 'Год',
		all: 'Всё время'
	};
	const items = PERIODS.map((value) => ({ value, label: LABELS[value] }));

	let open = $state(false);
</script>

{#if currentFeed === 'popular'}
	<div class="sorting-filters">
		<Popover
			bind:open
			{items}
			selected={period}
			onselect={(p) => {
				haptics.tick();
				switchPeriod(p);
			}}
			width={180}
			align="left"
			label="Период"
		>
			<button type="button" class="sorting-filters__button" aria-expanded={open} onclick={() => (open = !open)}>
				<span>{LABELS[period]}</span>
				<span class="sorting-filters__toggler">
					<svg class="icon" width="16" height="16" aria-hidden="true">
						<use href="/icons.svg#v_chevron_down"></use>
					</svg>
				</span>
			</button>
		</Popover>
	</div>
{/if}

<style>
	.sorting-filters {
		--popover-gap: 7px;

		display: flex;
		box-sizing: border-box;
		width: 100%;
		max-width: var(--content-width);
		/* верхний отступ ленты (padding страницы у DTF) */
		margin: 16px auto 0;
		padding: 4px 0 12px 8px;
	}

	.sorting-filters__button {
		display: flex;
		align-items: center;
		padding: 0 12px;
		border: 0;
		border-radius: 20px;
		background: none;
		color: #000;
		font: inherit;
		font-size: 14px;
		line-height: 20px;
		white-space: nowrap;
		cursor: pointer;
	}

	.sorting-filters__toggler {
		display: flex;
		align-items: center;
		margin-right: -4px;
		padding: 0 4px;
	}

	@media (max-width: 859px) {
		.sorting-filters {
			--popover-gap: 3px;
			--popover-left: 14px;

			margin-top: 0;
			padding: 16px 16px 8px 4px;
		}
	}
</style>
