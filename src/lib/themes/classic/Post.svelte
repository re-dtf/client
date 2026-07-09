<script lang="ts">
	import type { Post } from '$lib/api/types';
	import BlockRenderer from '$lib/components/BlockRenderer.svelte';
	import { resolve } from '$app/paths';

	let { post, preview = true } = $props<{ post: Post, preview?: boolean }>();

	let displayBlocks = $derived(preview ? post.blocks.filter((b: any) => b.cover) : post.blocks);

</script>

<article class="classic-post">
	<header>
		<h2>
			{#if preview}
				<a href={resolve(`/post/${post.id}`)}>{post.title}</a>
			{:else}
				{post.title}
			{/if}
		</h2>
		<div class="meta">
			<span>Автор: {post.author.name}</span>
			<span>Дата: {new Date(post.createdAt).toLocaleDateString()}</span>
		</div>
	</header>
	<div class="content">
		<BlockRenderer blocks={displayBlocks} />
		{#if preview && post.blocks.length > displayBlocks.length}
			<div class="read-more">
				<a href={resolve(`/post/${post.id}`)}>Читать далее...</a>
			</div>
		{/if}
	</div>
	<footer>
		<span>Комментарии: {post.commentsCount}</span>
	</footer>
</article>

<style>
	.classic-post {
		content-visibility: auto;
		contain-intrinsic-size: auto none auto 500px;
		border: 1px solid #ccc;
		padding: 16px;
		margin-bottom: 16px;
		background: #f9f9f9;
		color: #333;
		font-family: Arial, sans-serif;
		--block-radius: 0px;
		--block-border-color: #ddd;
		--block-bg: #fff;
		--block-padding: 10px;
	}
	.meta {
		font-size: 0.8em;
		color: #666;
		margin-bottom: 12px;
	}
	.content {
		line-height: 1.5;
	}

	.read-more {
		margin-top: 10px;
		font-weight: bold;
	}

	footer {
		margin-top: 12px;
		font-weight: bold;
		font-size: 0.9em;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
</style>
