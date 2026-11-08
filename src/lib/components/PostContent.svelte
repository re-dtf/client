<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { Post } from '$lib/api/types';
	import Reveal from './Reveal.svelte';
	import NetworkErrorState from './NetworkErrorState.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { markCommentsStart, trackPostClosed, trackPostLoaded } from '$lib/storage/stats.svelte';
	import { nextPaint } from '$lib/ready';
	import { appear } from '$lib/themes/appear';
	import { scrollBehavior } from '$lib/motion';
	import { safeDecode } from '$lib/dtfLinks';
	import { onDestroy, tick, type Snippet } from 'svelte';

	let {
		postId,
		sourceId = 'dtf',
		commentId,
		focusNonce,
		toComments,
		anchor,
		depth = 0,
		onLoaded,
		backButton
	}: {
		postId: number;
		sourceId?: string;
		/** Комментарий, к которому прокрутить (из уведомления) */
		commentId?: number;
		focusNonce?: number;
		depth?: number;
		/** Прокрутить сразу к комментариям после загрузки */
		toComments?: boolean;
		/** Якорь в посте, к которому прокрутить */
		anchor?: string;
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
	let commentsBox = $state<HTMLElement>();
	let lastCommentsHeight = $state<number>(0);

	$effect(() => {
		if (commentsBox && depth <= 1) {
			const h = commentsBox.offsetHeight;
			if (h > 0) lastCommentsHeight = h;
		}
	});

	function scrollToAnchor(targetAnchor: string, attempts = 5) {
		const decoded = safeDecode(targetAnchor);
		const el =
			document.getElementById(targetAnchor) ||
			document.getElementById(decoded) ||
			document.getElementById(decoded.toLowerCase());
		if (el) {
			el.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
			return;
		}
		if (attempts > 0) {
			requestAnimationFrame(() => scrollToAnchor(targetAnchor, attempts - 1));
		}
	}

	function showPost() {
		if ((commentId === undefined && !toComments && !anchor) || postShown) return;
		postShown = true;
		if (toComments || commentId !== undefined) {
			commentsTurn.then(tick).then(() => {
				requestAnimationFrame(() => {
					commentsBox?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
				});
			});
		} else if (anchor) {
			tick().then(() => {
				requestAnimationFrame(() => {
					scrollToAnchor(anchor);
				});
			});
		}
	}

	let lastScrollNonce = 0;
	$effect(() => {
		if (toComments && postShown && focusNonce && focusNonce !== lastScrollNonce) {
			lastScrollNonce = focusNonce;
			tick().then(() => {
				requestAnimationFrame(() => {
					commentsBox?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
				});
			});
		}
	});

	let lastAnchorNonce = 0;
	let lastAnchorScrolled = '';
	$effect(() => {
		if (!anchor || !post) return;
		const nonce = focusNonce ?? 0;
		if (postShown && (nonce !== lastAnchorNonce || anchor !== lastAnchorScrolled)) {
			lastAnchorNonce = nonce;
			lastAnchorScrolled = anchor;
			tick().then(() => {
				requestAnimationFrame(() => {
					scrollToAnchor(anchor);
				});
			});
		}
	});

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
		postPromise.then(trackPostClosed, () => {});
	});
</script>

<div class="post-screen">
	<Reveal ready={post !== undefined || error !== undefined} anim="contentIn" onshow={showPost} onreveal={() => (postShown = true)}>
		{#snippet children()}
			{#if post}
				{@const loaded = post}
				<ThemeLoader componentName="Post" post={loaded} preview={false} evictMedia={depth >= 3} />
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
		{#if depth <= 1}
			{#await commentsTurn then}
				<div class="comments-container" bind:this={commentsBox} {@attach (commentId === undefined && !toComments ? appear('feedIn') : undefined)}>
					<ThemeLoader componentName="Comments" postId={loaded.id} sourceId={loaded.sourceId} commentsCount={loaded.commentsCount} subscribed={loaded.isSubscribedToComments} focusCommentId={commentId} {focusNonce} />
				</div>
			{/await}
		{:else if lastCommentsHeight > 0}
			<div class="comments-container comments-container--placeholder" style="height: {lastCommentsHeight}px;"></div>
		{/if}
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
	.comments-container {
		scroll-margin-top: calc(var(--header-height, 60px) + 8px);
	}
	.actions {
		display: var(--post-screen-actions-display, block);
		margin-top: 20px;
	}
</style>
