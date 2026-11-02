<script lang="ts">
	import FieldControl from './FieldControl.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { REACTIONS } from '$lib/config/reactions';
	import { settings } from '$lib/storage/settings.svelte';
	import { dayKey, dayStreaks, flush, statsStore, type Counted, type Stats } from '$lib/storage/stats.svelte';
	import type { ToggleField } from '$lib/themes/types';

	/*
	 * Страница «Статистика». Всё считается локально, из того, что накопилось в statsStore.
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
		<SettingsGroup {title}>
			{#each items as item (item.sourceId + item.id)}
				<SettingsRow title={item.name}><span class="value">{item.count}</span></SettingsRow>
			{/each}
		</SettingsGroup>
	{/if}
{/snippet}

{#snippet reactions(title: string, items: { id: number; count: number }[])}
	{#if items.length}
		<SettingsGroup {title}>
			<ul class="body reactions">
				{#each items as item (item.id)}
					<li class="reaction">
						{#if REACTIONS[item.id]}
							<img src={REACTIONS[item.id].url} width="20" height="20" alt="Реакция {item.id}" />
						{:else}
							<span>#{item.id}</span>
						{/if}
						<span class="value">{item.count}</span>
					</li>
				{/each}
			</ul>
		</SettingsGroup>
	{/if}
{/snippet}

<FieldControl field={toggleField} value={settings.value.collectStats} onchange={(value) => settings.patch({ collectStats: Boolean(value) })} />

{#if stats.seconds || stats.postsRead || stats.commentsWritten || Object.keys(stats.reactions.post).length || Object.keys(stats.reactions.comment).length}
	<SettingsGroup title="Сводка" description="Считаем с {stats.since}.">
		<SettingsRow title="Времени проведено"><span class="value">{duration(stats.seconds)}</span></SettingsRow>
		<SettingsRow title="Прочитано постов"><span class="value">{stats.postsRead}</span></SettingsRow>
		<SettingsRow title="Комментариев написано"><span class="value">{stats.commentsWritten}</span></SettingsRow>
		<SettingsRow title="В закладки (посты / комментарии)"><span class="value">{stats.favorites.post} / {stats.favorites.comment}</span></SettingsRow>
		<SettingsRow title="Подписок оформлено"><span class="value">{stats.subscriptions}</span></SettingsRow>
		<SettingsRow title="Дней подряд (сейчас / рекорд)"><span class="value">{streaks.current} / {streaks.longest}</span></SettingsRow>
		{#if bestDay}
			<SettingsRow title="Самый долгий день"><span class="value">{bestDay[0]}, {duration(bestDay[1])}</span></SettingsRow>
		{/if}
		{#if favoriteTheme}
			<SettingsRow title="Чаще всего тема"><span class="value">{favoriteTheme[0]}</span></SettingsRow>
		{/if}
	</SettingsGroup>

	<SettingsGroup title="Последние 14 дней">
		<div class="body bars" role="img" aria-label="Время по дням за последние 14 дней">
			{#each lastDays as day (day.key)}
				<div class="bar" title="{day.key}: {duration(day.seconds)}">
					<div class="bar__fill" style:height="{(day.seconds / maxDay) * 100}%"></div>
					<span class="bar__label">{day.label}</span>
				</div>
			{/each}
		</div>
	</SettingsGroup>

	<SettingsGroup title="Когда вы сидите (по часам суток)">
		<div class="body bars bars--hours" role="img" aria-label="Время по часам суток">
			{#each stats.hours as seconds, hour (hour)}
				<div class="bar" title="{hour}:00 — {duration(seconds)}">
					<div class="bar__fill" style:height="{(seconds / maxHour) * 100}%"></div>
					<span class="bar__label">{hour % 6 === 0 ? hour : ''}</span>
				</div>
			{/each}
		</div>
	</SettingsGroup>

	<SettingsGroup title="Где проведено время">
		<ul class="body areas">
			{#each AREAS as [area, title] (area)}
				<li class="area">
					<div class="area__head">
						<span>{title}</span>
						<span class="value">{Math.round((stats.byArea[area] / areaTotal) * 100)}% · {duration(stats.byArea[area])}</span>
					</div>
					<div class="area__track"><div class="area__fill" style:width="{(stats.byArea[area] / areaTotal) * 100}%"></div></div>
				</li>
			{/each}
		</ul>
	</SettingsGroup>

	{@render counted('Самые читаемые авторы', topCounted(stats.authorsRead))}
	{@render counted('Любимые подсайты', topCounted(stats.subsitesRead))}
	{@render counted('Кому вы чаще всего ставите реакции', topCounted(stats.authorsReacted))}
	{@render reactions('Любимые реакции на посты', topReactions(stats.reactions.post))}
	{@render reactions('Любимые реакции на комментарии', topReactions(stats.reactions.comment))}

	<SettingsButton variant="destructive" onclick={reset}>Сбросить статистику</SettingsButton>
{:else}
	<p class="note">Пока пусто: статистика появится, когда вы немного посидите в приложении.</p>
{/if}

<style>
	.note {
		color: var(--st-muted);
		font-size: 13px;
		line-height: 18px;
	}

	.value {
		flex: none;
		color: var(--st-muted);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	/* Содержимое группы без строк: столбики, полоски, реакции */
	.body {
		padding: 18px 20px;
	}

	.areas {
		display: grid;
		gap: 10px;
		list-style: none;
	}

	.area__head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.area__track {
		height: 4px;
		margin-top: 4px;
		border-radius: 2px;
		background: var(--st-button);
	}

	.area__fill {
		height: 100%;
		border-radius: 2px;
		background: var(--st-accent);
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		list-style: none;
	}

	.reaction {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 14px;
		background: var(--st-button);
	}

	.bars {
		display: flex;
		align-items: stretch;
		gap: 4px;
		height: 104px;
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
		background: var(--st-accent);
	}

	.bar__label {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		color: var(--st-muted);
		font-size: 11px;
		line-height: 14px;
		text-align: center;
	}
</style>
