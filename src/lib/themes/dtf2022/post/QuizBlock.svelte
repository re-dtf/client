<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { QuizResult } from '$lib/api/types';
	import { haptics } from '$lib/haptics';
	import { sanitizeHtml } from '$lib/sanitize';
	import { ensureLogin } from '../actions.svelte';
	import { formatNumber, plural } from '../format';
	import { loadOnVisible } from '../loadOnVisible';
	import { notify } from '../ui/notify.svelte';

	/*
	 * Блок quiz: варианты, голос и результаты, как .quiz в оригинале 2023 года. Голосовать можно
	 * только в постах DTF и только вошедшему; результаты видны всем, после «Показать результаты».
	 * Аватарки проголосовавших, которые оригинал показывал в публичных опросах, не выводим.
	 */
	let { data, postId, sourceId }: { data: any; postId?: number | string; sourceId?: string } = $props();

	let results = $state<QuizResult>();
	let revealed = $state(false);
	let loading = $state(false);
	let requested = false;

	let items = $derived(Object.entries((data.items ?? {}) as Record<string, string>));
	let canVote = $derived(!!data.hash && postId !== undefined && (sourceId === undefined || sourceId === 'dtf'));
	let userVoted = $derived(results?.userVoted ?? null);
	let mode = $derived(userVoted ? 'voted' : revealed ? 'revealed' : 'initial');
	let total = $derived(Object.values(results?.items ?? {})[0]?.total ?? 0);

	async function load() {
		if (requested || !canVote) return;
		requested = true;
		try {
			results = await api.getQuizResults?.(data.hash);
		} catch {
			// результаты не загрузились — остаётся опрос без процентов, голосовать можно
		}
	}

	/** Без itemId голос снимается */
	async function vote(itemId?: string) {
		if (loading || !canVote || !ensureLogin()) return;
		haptics.click();
		loading = true;
		try {
			results = await api.voteQuiz?.(data.hash, Number(postId), itemId);
			revealed = false;
		} catch (e: any) {
			notify.error(e.message);
		} finally {
			loading = false;
		}
	}
</script>

{#if items.length}
	<div class={['quiz', `quiz--mode-${mode}`, { 'quiz--loading': loading }]} {@attach loadOnVisible(load)}>
		{#if data.title?.trim()}
			<div class="quiz__title">{@html sanitizeHtml(data.title)}</div>
		{/if}

		{#each items as [id, label] (id)}
			{@const result = results?.items[id]}
			<div class={['quiz__item', { 'quiz__item--winner': result?.isWinner && total > 0, 'quiz__item--mine': userVoted === id }]}>
				{#if mode === 'initial' && canVote}
					<button class="quiz__item__label quiz__item__label--vote" onclick={() => vote(id)}>{@html sanitizeHtml(label)}</button>
				{:else}
					<div class="quiz__item__label">
						{@html sanitizeHtml(label)}
						{#if result}<span class="quiz__item__percent">{result.percentage}%</span>{/if}
					</div>
				{/if}
				{#if mode !== 'initial' && result}
					<div class="quiz__item__progressbar"><div class="quiz__item__runner" style:width="{result.percentage}%"></div></div>
					<div class="quiz__item__count">{formatNumber(result.count)}</div>
				{/if}
			</div>
		{/each}

		<div class="quiz__panel">
			{#if mode === 'voted'}
				<button class="quiz__button" onclick={() => vote()}>Отменить голос</button>
			{:else if mode === 'revealed'}
				<button class="quiz__button" onclick={() => (revealed = false)}>Скрыть результаты</button>
			{:else if results && total > 0}
				<button class="quiz__button" onclick={() => (revealed = true)}>Показать результаты</button>
			{/if}
			{#if total > 0}
				<span class="quiz__label">{formatNumber(total)} {plural(total, ['голос', 'голоса', 'голосов'])}</span>
			{/if}
			{#if !data.is_public}
				<span class="quiz__label">Анонимный опрос</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.quiz {
		padding: 12px var(--island-offset-x, 16px) 14px;
		background-color: var(--bg-unread);
		font-size: 16px;
		line-height: 22px;
		transition: opacity 0.2s;
	}

	.quiz--loading {
		pointer-events: none;
		opacity: 0.6;
	}

	.quiz__title {
		margin-bottom: 4px;
		font-size: 17px;
		font-weight: 500;
		line-height: 26px;
	}

	.quiz__item {
		position: relative;
		padding: 7px 0 8px;
	}

	.quiz__item__label {
		display: block;
		width: 100%;
		padding: 0;
		color: inherit;
		font: inherit;
		text-align: left;
		overflow-wrap: anywhere;
	}

	/* Кружок слева, пока не проголосовал; при наведении становится ярче */
	.quiz__item__label--vote {
		position: relative;
		padding: 5px 0 5px 30px;
		cursor: pointer;
	}

	.quiz__item__label--vote::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 18px;
		height: 18px;
		box-sizing: border-box;
		margin-top: -9px;
		border: 2px solid var(--color-accent);
		border-radius: 100%;
		opacity: 0.5;
	}

	.quiz__item__label--vote:hover::before {
		opacity: 1;
	}

	.quiz__item__percent {
		margin-left: 6px;
		opacity: 0.5;
	}

	.quiz__item--mine .quiz__item__label {
		font-weight: 500;
	}

	/* Полоса результата: тонкая линия, поверх неё толстая по проценту; у лидера и в моём варианте ярче */
	.quiz__item__progressbar {
		position: relative;
		height: 1px;
		margin-top: 8px;
		background-color: var(--color-accent);
		opacity: 0.5;
	}

	.quiz__item--winner .quiz__item__progressbar {
		opacity: 1;
	}

	.quiz__item__runner {
		position: absolute;
		top: -2px;
		left: 0;
		height: 5px;
		background-color: var(--color-accent);
		transition: width 500ms ease;
	}

	.quiz__item__count {
		margin-top: 4px;
		color: var(--color-accent);
		font-size: 13px;
		line-height: 18px;
		opacity: 0.5;
	}

	.quiz__panel {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 16px;
		margin-top: 6px;
	}

	.quiz__button {
		padding: 0;
		border-bottom: 1px dotted rgba(22, 147, 229, 0.5);
		color: var(--color-accent);
		font-size: 13px;
		line-height: 21px;
		cursor: pointer;
	}

	.quiz__label {
		font-size: 13px;
		opacity: 0.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.quiz__item__runner {
			transition: none;
		}
	}
</style>
