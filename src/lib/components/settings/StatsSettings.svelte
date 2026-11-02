<script lang="ts">
	import FieldControl from './FieldControl.svelte';
	import { REACTIONS } from '$lib/config/reactions';
	import { settings } from '$lib/storage/settings.svelte';
	import { dayKey, dayStreaks, flush, statsStore, type Counted, type Stats } from '$lib/storage/stats.svelte';
	import type { ToggleField } from '$lib/themes/types';

	/*
	 * Раздел «Статистика» в общих настройках. Всё считается локально, из того, что накопилось в statsStore.
	 * Оформление временное.
	 */
	const toggleField: ToggleField = {
		key: 'collectStats',
		type: 'toggle',
		title: 'Вести статистику',
		description: 'Время в приложении, прочитанные посты, реакции. Хранится только в этом браузере и никуда не отправляется.',
		default: true
	};

	// Тики копятся в памяти: при открытии экрана сохраняем их, чтобы цифры были свежими
	flush();

	let stats: Stats = $derived(statsStore.value);
	let streaks = $derived(dayStreaks(stats.days));

	function duration(seconds: number) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours) return `${hours} ч ${minutes} мин`;
		return minutes ? `${minutes} мин` : `${seconds} сек`;
	}

	const top = <T,>(entries: [string, T][], by: (value: T) => number, limit = 5) =>
		entries.sort((a, b) => by(b[1]) - by(a[1])).slice(0, limit);
	const topCounted = (map: Record<string, Counted>) => top(Object.entries(map), (c) => c.count).map(([, c]) => c);
	const topReactions = (map: Record<number, number>) => top(Object.entries(map), (n) => n).map(([id, count]) => ({ id: Number(id), count }));

	const AREAS = [
		['feed', 'В ленте'],
		['post', 'В самом посте'],
		['comments', 'В комментариях'],
		['profile', 'В профилях'],
		['other', 'Остальное']
	] as const;

	let areaTotal = $derived(Math.max(1, Object.values(stats.byArea).reduce((sum, s) => sum + s, 0)));

	// Последние 14 дней, для столбиков
	let lastDays = $derived(
		Array.from({ length: 14 }, (_, i) => {
			const date = new Date();
			date.setDate(date.getDate() - (13 - i));
			const key = dayKey(date);
			return { key, label: key.slice(8), seconds: stats.days[key] ?? 0 };
		})
	);
	let maxDay = $derived(Math.max(1, ...lastDays.map((d) => d.seconds)));
	let maxHour = $derived(Math.max(1, ...stats.hours));
	let bestDay = $derived(Object.entries(stats.days).sort((a, b) => b[1] - a[1])[0]);
	let favoriteTheme = $derived(Object.entries(stats.byTheme).sort((a, b) => b[1] - a[1])[0]);

	function reset() {
		if (confirm('Сбросить всю статистику? Это нельзя отменить.')) statsStore.reset();
	}
</script>

{#snippet counted(title: string, items: Counted[])}
	{#if items.length}
		<div class="block">
			<h4 class="block__title">{title}</h4>
			<ol class="list">
				{#each items as item (item.sourceId + item.id)}
					<li class="list__item"><span class="list__name">{item.name}</span><span class="list__count">{item.count}</span></li>
				{/each}
			</ol>
		</div>
	{/if}
{/snippet}

{#snippet reactions(title: string, items: { id: number; count: number }[])}
	{#if items.length}
		<div class="block">
			<h4 class="block__title">{title}</h4>
			<ul class="reactions">
				{#each items as item (item.id)}
					<li class="reaction">
						{#if REACTIONS[item.id]}
							<img src={REACTIONS[item.id].url} width="20" height="20" alt="Реакция {item.id}" />
						{:else}
							<span>#{item.id}</span>
						{/if}
						<span class="list__count">{item.count}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

<FieldControl field={toggleField} value={settings.value.collectStats} onchange={(value) => settings.patch({ collectStats: Boolean(value) })} />

{#if stats.seconds || stats.postsRead || stats.commentsWritten || Object.keys(stats.reactions.post).length || Object.keys(stats.reactions.comment).length}
	<p class="note">Считаем с {stats.since}.</p>

	<dl class="summary">
		<div><dt>Времени проведено</dt><dd>{duration(stats.seconds)}</dd></div>
		<div><dt>Прочитано постов</dt><dd>{stats.postsRead}</dd></div>
		<div><dt>Комментариев написано</dt><dd>{stats.commentsWritten}</dd></div>
		<div><dt>В закладки (посты / комментарии)</dt><dd>{stats.favorites.post} / {stats.favorites.comment}</dd></div>
		<div><dt>Подписок оформлено</dt><dd>{stats.subscriptions}</dd></div>
		<div><dt>Дней подряд (сейчас / рекорд)</dt><dd>{streaks.current} / {streaks.longest}</dd></div>
		{#if bestDay}
			<div><dt>Самый долгий день</dt><dd>{bestDay[0]}, {duration(bestDay[1])}</dd></div>
		{/if}
		{#if favoriteTheme}
			<div><dt>Чаще всего тема</dt><dd>{favoriteTheme[0]}</dd></div>
		{/if}
	</dl>

	<div class="block">
		<h4 class="block__title">Последние 14 дней</h4>
		<div class="bars" role="img" aria-label="Время по дням за последние 14 дней">
			{#each lastDays as day (day.key)}
				<div class="bar" title="{day.key}: {duration(day.seconds)}">
					<div class="bar__fill" style:height="{(day.seconds / maxDay) * 100}%"></div>
					<span class="bar__label">{day.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="block">
		<h4 class="block__title">Когда вы сидите (по часам суток)</h4>
		<div class="bars bars--hours" role="img" aria-label="Время по часам суток">
			{#each stats.hours as seconds, hour (hour)}
				<div class="bar" title="{hour}:00 — {duration(seconds)}">
					<div class="bar__fill" style:height="{(seconds / maxHour) * 100}%"></div>
					<span class="bar__label">{hour % 6 === 0 ? hour : ''}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="block">
		<h4 class="block__title">Где проведено время</h4>
		<ul class="areas">
			{#each AREAS as [area, title] (area)}
				<li class="area">
					<div class="list__item">
						<span class="list__name">{title}</span>
						<span class="list__count">{Math.round((stats.byArea[area] / areaTotal) * 100)}% · {duration(stats.byArea[area])}</span>
					</div>
					<div class="area__track"><div class="area__fill" style:width="{(stats.byArea[area] / areaTotal) * 100}%"></div></div>
				</li>
			{/each}
		</ul>
	</div>

	{@render counted('Самые читаемые авторы', topCounted(stats.authorsRead))}
	{@render counted('Любимые подсайты', topCounted(stats.subsitesRead))}
	{@render counted('Кому вы чаще всего ставите реакции', topCounted(stats.authorsReacted))}
	{@render reactions('Любимые реакции на посты', topReactions(stats.reactions.post))}
	{@render reactions('Любимые реакции на комментарии', topReactions(stats.reactions.comment))}

	<button type="button" class="reset" onclick={reset}>Сбросить статистику</button>
{:else}
	<p class="note">Пока пусто: статистика появится, когда вы немного посидите в приложении.</p>
{/if}

<style>
	.note {
		margin: 8px 0;
		color: var(--text-muted, #707070);
		font-size: 15px;
		line-height: 22px;
	}

	.summary {
		display: grid;
		gap: 4px;
		margin: 12px 0 20px;
	}

	.summary > div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 6px 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	.summary dt {
		color: var(--text-muted, #707070);
	}

	.summary dd {
		font-weight: 500;
		text-align: right;
	}

	.block {
		margin-bottom: 20px;
	}

	.block__title {
		margin-bottom: 8px;
		font-size: 16px;
		font-weight: 500;
	}

	.list {
		display: grid;
		gap: 2px;
	}

	.list__item {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.list__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.list__count {
		color: var(--text-muted, #707070);
		font-variant-numeric: tabular-nums;
	}

	.areas {
		display: grid;
		gap: 8px;
	}

	.area__track {
		height: 4px;
		margin-top: 4px;
		border-radius: 2px;
		background: #f0f0f0;
	}

	.area__fill {
		height: 100%;
		border-radius: 2px;
		background: var(--color-blue, #0079ff);
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.reaction {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 14px;
		background: #f5f5f5;
	}

	.bars {
		display: flex;
		align-items: stretch;
		gap: 4px;
		height: 80px;
	}

	.bars--hours {
		gap: 2px;
	}

	.bar {
		position: relative;
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: flex-end;
		min-width: 0;
		padding-bottom: 16px;
	}

	.bar__fill {
		min-height: 2px;
		border-radius: 2px 2px 0 0;
		background: var(--color-blue, #0079ff);
	}

	.bar__label {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		color: var(--text-muted, #707070);
		font-size: 11px;
		line-height: 14px;
		text-align: center;
	}

	.reset {
		color: var(--text-link, #0079ff);
		cursor: pointer;
	}
</style>
