<script lang="ts">
	import type { Block } from '$lib/api/types';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import DOMPurify from 'dompurify';
	import LazyImage from './LazyImage.svelte';

	let { blocks } = $props<{ blocks: Block[] }>();
</script>

{#each blocks as block}
	{#if block.type === 'text' || block.type === 'header'}
		<div class="block text-block">
			{@html DOMPurify.sanitize(block.data.text)}
		</div>
	{:else if block.type === 'media'}
		<div class="block media-block">
			<!-- TODO: Карусель -->
			{#each block.data.items as item}
				{#if item.image}
					{#if item.image.data.type === 'mp4' || item.image.data.type === 'gif' || item.image.data.isVideo}
						<video use:lazyVideo src="https://leonardo.osnova.io/{item.image.data.uuid}/-/format/mp4/" controls loop muted playsinline></video>
					{:else}
						<LazyImage
							src="https://leonardo.osnova.io/{item.image.data.uuid}/-/preview/800/-/format/webp/"
							alt={item.title || 'media'}
							width={item.image.data.width}
							height={item.image.data.height}
							base64preview={item.image.data.base64preview}
							color={item.image.data.color}
						/>
					{/if}
				{/if}
			{/each}
		</div>
	{:else if block.type === 'osnovaEmbed'}
		<div class="block embed-block">
			<a href={block.data.osnovaEmbed?.data.url} target="_blank" rel="noopener noreferrer" class="embed-card">
				<strong>{block.data.osnovaEmbed?.data.title || 'Ссылка'}</strong>
				{#if block.data.osnovaEmbed?.data.description}
					<p>{block.data.osnovaEmbed.data.description}</p>
				{/if}
			</a>
		</div>
	{:else if block.type === 'link'}
		<div class="block link-block">
			<a href={block.data.link?.data.url} target="_blank" rel="noopener noreferrer" class="embed-card">
				<strong>{block.data.link?.data.title || 'Ссылка'}</strong>
				{#if block.data.link?.data.description}
					<p>{block.data.link.data.description}</p>
				{/if}
			</a>
		</div>
	{:else}
		<div class="block unknown-block">[Блок: {block.type}]</div>
	{/if}
{/each}

<style>
	.text-block :global(p) {
		margin: 0.5em 0;
	}
	.media-block :global(img), .media-block video, .media-block :global(.lazy-image-wrapper) {
		max-width: 100%;
		height: auto;
		border-radius: var(--block-radius, 4px);
		display: block;
		margin: 10px 0;
	}
	.embed-card {
		display: block;
		border: 1px solid var(--block-border-color, #eaeaea);
		border-radius: var(--block-radius, 4px);
		padding: var(--block-padding, 10px);
		margin: 10px 0;
		text-decoration: none;
		color: inherit;
		background: var(--block-bg, #fafafa);
		transition: background 0.2s;
	}
	.embed-card:hover {
		background: var(--block-hover-bg, #f0f0f0);
	}
	.embed-card p {
		color: #888;
		font-size: 0.9em;
		margin: 5px 0 0;
	}
	.unknown-block {
		color: #999;
		font-style: italic;
	}
</style>
