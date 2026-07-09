<script lang="ts">
	import type { Post } from '$lib/api/types';
	import BlockRenderer from '$lib/components/BlockRenderer.svelte';
	import { resolve } from '$app/paths';
	import { navigation } from '$lib/navigation.svelte';

	let { post, preview = true } = $props<{ post: Post, preview?: boolean }>();

	let displayBlocks = $derived(preview ? post.blocks.filter((b: any) => b.cover) : post.blocks);

	function openPost(e: MouseEvent) {
		e.preventDefault();
		navigation.openPost(post.id);
	}
</script>

<div class="modern-post">
	<div class="card">
		<div class="author-avatar">
			{#if post.author.avatarUrl}
				<img src={post.author.avatarUrl} alt={post.author.name} />
			{:else}
				<div class="avatar-placeholder">{post.author.name[0]}</div>
			{/if}
		</div>
		<div class="post-body">
			<div class="author-info">
				<strong>{post.author.name}</strong>
				<span class="date">{new Date(post.createdAt).toLocaleDateString()}</span>
			</div>
			<h3 class="title">
				{#if preview}
					<a href={resolve(`/post/${post.id}`)} onclick={openPost}>{post.title}</a>
				{:else}
					{post.title}
				{/if}
			</h3>
			<div class="content">
				<BlockRenderer blocks={displayBlocks} />
				{#if preview && post.blocks.length > displayBlocks.length}
					<div class="read-more">
						<a href={resolve(`/post/${post.id}`)} onclick={openPost}>Читать далее...</a>
					</div>
				{/if}
			</div>
			<div class="actions">
				<button class="action-btn">💬 {post.commentsCount}</button>
			</div>
		</div>
	</div>
</div>

<style>
	.modern-post {
		content-visibility: auto;
		contain-intrinsic-size: auto none auto 500px;
		margin-bottom: 24px;
		--block-radius: 8px;
		--block-padding: 12px;
	}
	.card {
		display: flex;
		gap: 16px;
		background: #ffffff;
		border-radius: 12px;
		padding: 20px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.05);
		transition: transform 0.2s, box-shadow 0.2s;
	}
	.card:hover {
		box-shadow: 0 8px 30px rgba(0,0,0,0.08);
	}
	.author-avatar {
		flex-shrink: 0;
	}
	.avatar-placeholder {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #6e8efb, #a777e3);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 20px;
	}
	.post-body {
		flex-grow: 1;
	}
	.author-info {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.date {
		color: #888;
		font-size: 0.85em;
	}
	.title {
		margin: 0 0 8px 0;
		font-size: 1.25em;
		color: #1a1a1a;
	}
	.title a {
		color: inherit;
		text-decoration: none;
	}
	.title a:hover {
		text-decoration: underline;
	}
	.content {
		color: #4a4a4a;
		line-height: 1.6;
		margin: 0 0 16px 0;
	}

	.read-more {
		margin-top: 12px;
		font-weight: 600;
	}
	.read-more a {
		color: #1976d2;
		text-decoration: none;
	}

	.actions {
		display: flex;
		gap: 12px;
	}
	.action-btn {
		background: #f0f2f5;
		border: none;
		padding: 8px 16px;
		border-radius: 20px;
		cursor: pointer;
		color: #555;
		font-weight: 600;
		transition: background 0.2s;
	}
	.action-btn:hover {
		background: #e4e6eb;
	}
</style>
