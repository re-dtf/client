<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { Post } from '$lib/api/types';
	import Reveal from './Reveal.svelte';
	import NetworkErrorState from './NetworkErrorState.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { markCommentsStart, trackPostClosed, trackPostLoaded } from '$lib/storage/stats.svelte';
	import { nextPaint } from '$lib/ready';
	import { appear } from '$lib/themes/appear';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { play, scrollBehavior } from '$lib/motion';
	import { onDestroy, tick, type Snippet } from 'svelte';

	let { postId, sourceId = 'dtf', commentId, focusNonce, onLoaded, backButton }: {
		postId: number;
		sourceId?: string;
		/** Комментарий, к которому прокрутить (из уведомления) */
		commentId?: number;
		focusNonce?: number;
		onLoaded?: (title: string) => void;
		backButton?: Snippet;
	} = $props();

	// svelte-ignore state_referenced_locally
	const cached = api.peekPost(postId, sourceId);
	// svelte-ignore state_referenced_locally
	let post = $state.raw<Post | undefined>(cached);
	let error = $state<string>();

	// svelte-ignore state_referenced_locally
	let postPromise = $state.raw(api.getPost(postId, sourceId));
	function retryLoad() {
		error = undefined;
		postPromise = api.getPost(postId, sourceId, true);
	}
	// Комментарии рисуются после кадра с постом: тысячи их узлов иначе задерживают и сам пост
	// svelte-ignore state_referenced_locally
	const commentsTurn = (cached ? Promise.resolve() : postPromise).then(nextPaint, () => {});

	// Комментарии (тысячи узлов) строятся, когда пост уже показан и его анимация закончилась
	let postShown = $state(false);

	/*
	 * Ссылка на комментарий. Как только пост показан, идём к месту комментариев и показываем там заглушку, а сами комментарии
	 * строятся скрытыми, пока догружаются до нужного. Нашли (или не нашли) — показываем список, и тема прокручивает к комментарию.
	 */
	let focusing = $state(false);
	let waitBox = $state<HTMLElement>();
	let commentsBox = $state<HTMLElement>();
	let giveUp: ReturnType<typeof setTimeout>;

	function showPost() {
		if (commentId === undefined || postShown) return;
		focusing = true;
		postShown = true;
		giveUp = setTimeout(commentsFocused, 15_000);
		// Если комментарий нашёлся раньше, чем началась прокрутка к заглушке, она уже не нужна: иначе перебьёт прокрутку к комментарию
		commentsTurn.then(tick).then(() => focusing && waitBox?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }));
	}

	async function commentsFocused() {
		clearTimeout(giveUp);
		if (!focusing) return;
		focusing = false;
		// Прерываем плавную прокрутку браузера к заглушке, чтобы она не конфликтовала со скроллом к комментарию
		window.scrollTo({ top: window.scrollY, behavior: 'instant' });
		await tick();
		if (commentsBox) play(commentsBox, activeTheme.motion?.feedIn);
	}


	$effect(() => {
		if (cached) {
			trackPostLoaded(cached);
			onLoaded?.(cached.title);
		}
		postPromise
			.then((loaded) => {
				post = loaded;
				trackPostLoaded(loaded);
				onLoaded?.(loaded.title);
			})
			.catch((e) => {
				if (!post) {
					error = e.message;
					onLoaded?.('Ошибка');
				}
			});
	});

	onDestroy(() => {
		clearTimeout(giveUp);
		postPromise.then(trackPostClosed, () => {});
	});
</script>

<div class="post-screen">
	<Reveal ready={post !== undefined || error !== undefined} anim="contentIn" onshow={showPost} onreveal={() => (postShown = true)}>
		{#snippet children()}
			{#if post}
				{@const loaded = post}
				<ThemeLoader componentName="Post" post={loaded} preview={false} />
				<!-- Граница поста и комментариев для статистики: сколько времени пользователь в комментариях -->
				<div {@attach (el) => markCommentsStart(loaded, el)}></div>
				{#if backButton}
					<div class="actions">
						{@render backButton()}
					</div>
				{/if}
			{:else}
				<NetworkErrorState {error} title="Не удалось загрузить пост" onretry={retryLoad} />
			{/if}
		{/snippet}
	</Reveal>

	{#if post && postShown}
		{@const loaded = post}
		{#await commentsTurn then}
			{#if focusing}
				<div class="comments-wait" bind:this={waitBox}>
					<ThemeLoader componentName="Spinner" block />
				</div>
			{/if}
			<!-- Только прозрачность: размытие на слое с тысячами узлов дёргает кадры -->
			<div class:comments-hidden={focusing} bind:this={commentsBox} {@attach appear('feedIn')}>
				<ThemeLoader componentName="Comments" postId={loaded.id} sourceId={loaded.sourceId} commentsCount={loaded.commentsCount} subscribed={loaded.isSubscribedToComments} focusCommentId={commentId} {focusNonce} onfocused={commentsFocused} />
			</div>
		{/await}
	{/if}
</div>

<style>
	/* Темы подстраивают обёртку через CSS-переменные (см. dtf2022/theme.css) */
	.post-screen {
		width: 100%;
		max-width: var(--post-screen-max-width, 800px);
		margin: 0 auto;
		padding: var(--post-screen-padding, 20px 0);
	}
	.comments-wait {
		--placeholder-height: 60vh;
		scroll-margin-top: var(--header-height, 60px);
	}
	.comments-hidden {
		display: none;
	}
	.actions {
		display: var(--post-screen-actions-display, block);
		margin-top: 20px;
	}
</style>
