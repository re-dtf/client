<script lang="ts">
	import { page } from '$app/state';
	import { api } from '$lib/api/index.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Comments from '$lib/components/Comments/Comments.svelte';
	import { resolve } from '$app/paths';
	import type { Post } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { themeState } from '$lib/themes/index.svelte';

	let post = $state<Post | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let id = $derived(Number(page.params.id));
	let themeClass = $derived(`theme-${themeState.value}`);

	onMount(async () => {
		try {
			post = await api.getPost(id);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{post ? post.title : 'Загрузка...'} - reDTF</title>
</svelte:head>

<div class="post-page {themeClass}">
	{#if loading}
		<div class="message">Загрузка поста...</div>
	{:else if error}
		<div class="message error">{error}</div>
	{:else if post}
		<ThemeLoader componentName="Post" {post} preview={false} />
		<Comments postId={id} commentsCount={post.commentsCount} />
		<div class="actions">
			<a href={resolve('/')} class="back-link">← Вернуться в ленту</a>
		</div>
	{:else}
		<div class="message">Пост не найден</div>
	{/if}
</div>

<style>
	.post-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px 0;
	}
	.message {
		text-align: center;
		padding: 40px;
		color: #666;
		font-size: 1.1em;
	}
	.error {
		color: #d32f2f;
	}
	.actions {
		margin-top: 20px;
	}
	.back-link {
		color: #1976d2;
		text-decoration: none;
	}
	.back-link:hover {
		text-decoration: underline;
	}

	/* ── Comment theme tokens: Classic ── */
	.post-page.theme-classic {
		--comment-bg: transparent;
		--comment-bg-highlight: #fffde7;
		--comment-thread-color: #d0d0d0;
		--comment-thread-hover: #888;
		--comment-author-color: #333;
		--comment-date-color: #888;
		--comment-text-color: #333;
		--comment-reaction-bg: #f0f0f0;
		--comment-reaction-hover: #e0e0e0;
		--comment-reaction-active: rgba(76, 175, 80, 0.1);
		--comment-reaction-active-border: #4caf50;
		--comment-donation-bg: #fff8e1;
		--comment-donation-color: #e65100;
		--comment-donation-border: rgba(230, 81, 0, 0.15);
		--comment-section-border: #ddd;
		--comment-section-bg: transparent;
		--comment-expand-bg: rgba(0, 0, 0, 0.05);
		--comment-expand-color: #555;
		--comment-expand-bg-hover: rgba(0, 0, 0, 0.08);
		--comment-breadcrumb-bg: rgba(0, 0, 0, 0.04);
		--comment-breadcrumb-color: #666;
		--comment-breadcrumb-bg-hover: rgba(0, 0, 0, 0.08);
		--comment-preview-bg: rgba(255, 255, 255, 0.98);
		--comment-preview-border: rgba(0, 0, 0, 0.1);
		--comment-media-radius: 4px;
		--comment-radius: 0;
		--comment-select-bg: #f9f9f9;
		--comment-select-border: #ccc;
		--comment-select-color: #333;
		--comment-header-color: #333;
		--comment-count-color: #666;
	}

	/* ── Comment theme tokens: Modern ── */
	.post-page.theme-modern {
		--comment-bg: transparent;
		--comment-bg-highlight: rgba(110, 142, 251, 0.08);
		--comment-thread-color: #e8e8e8;
		--comment-thread-hover: #6e8efb;
		--comment-author-color: #1a1a1a;
		--comment-date-color: #aaa;
		--comment-text-color: #333;
		--comment-reaction-bg: #f5f6f8;
		--comment-reaction-hover: #ebedf0;
		--comment-reaction-active: rgba(110, 142, 251, 0.1);
		--comment-reaction-active-border: #6e8efb;
		--comment-donation-bg: linear-gradient(135deg, #fff8e1, #ffecb3);
		--comment-donation-color: #f57f17;
		--comment-donation-border: rgba(245, 127, 23, 0.15);
		--comment-section-border: transparent;
		--comment-section-bg: #ffffff;
		--comment-expand-bg: rgba(110, 142, 251, 0.08);
		--comment-expand-color: #6e8efb;
		--comment-expand-bg-hover: rgba(110, 142, 251, 0.15);
		--comment-breadcrumb-bg: rgba(110, 142, 251, 0.06);
		--comment-breadcrumb-color: #6e8efb;
		--comment-breadcrumb-bg-hover: rgba(110, 142, 251, 0.12);
		--comment-preview-bg: rgba(255, 255, 255, 0.97);
		--comment-preview-border: rgba(0, 0, 0, 0.06);
		--comment-media-radius: 10px;
		--comment-radius: 16px;
		--comment-select-bg: #f5f6f8;
		--comment-select-border: #e8e8e8;
		--comment-select-color: #333;
		--comment-header-color: #1a1a1a;
		--comment-count-color: #888;
	}
</style>
