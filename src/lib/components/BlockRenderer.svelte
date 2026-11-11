<script lang="ts">
	import type { Block } from '$lib/api/types';
	import { resolve } from '$app/paths';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { mediaHold } from '$lib/actions/mediaHold';
	import { sanitizeHtml } from '$lib/sanitize';
	import LazyImage from './LazyImage.svelte';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { openDtfLink } from '$lib/navigation';
	import { parseDtfUrl, dtfTargetToPath } from '$lib/dtfLinks';

	let { blocks }: { blocks: Block[] } = $props();

	function handleContainerClick(e: MouseEvent) {
		if (e.button !== 0 && e.button !== 1) return;
		const anchor = (e.target as Element)?.closest?.('a');
		if (!anchor) return;
		const href = anchor.getAttribute('href');
		if (href) openDtfLink(e, href);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="blocks-container" onclick={handleContainerClick} onauxclick={handleContainerClick}>
{#each blocks as block}
	{@const anchorId = (block.anchor || block.data?.anchor)?.trim() || undefined}
	{#if block.type === 'text' || block.type === 'header'}
		<div class="block text-block" id={anchorId}>
			{@html sanitizeHtml(block.data.text)}
		</div>
	{:else if block.type === 'media'}
		<div class="block media-block" id={anchorId}>
			<!-- TODO: Карусель -->
			{#each block.data.items as item}
				{#if item.image}
					{#if item.image.data.type === 'mp4' || item.image.data.type === 'gif' || item.image.data.isVideo}
						<video use:lazyVideo use:mediaHold={{ uuid: item.image.data.uuid, isGif: item.image.data.type === 'gif' }} src={getLeonardoUrl(item.image.data.uuid, { format: 'mp4' })} controls loop muted playsinline></video>
					{:else}
						<LazyImage
							src={getLeonardoUrl(item.image.data.uuid, { width: 800, format: 'webp' })}
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
		{@const url = block.data.osnovaEmbed?.data.url}
		{@const target = url ? parseDtfUrl(url) : undefined}
		<div class="block embed-block" id={anchorId}>
			<a
				href={target ? resolve(dtfTargetToPath(target) as any) : url}
				target={target ? undefined : '_blank'}
				rel={target ? undefined : 'noopener noreferrer'}
				class="embed-card"
			>
				<strong>{block.data.osnovaEmbed?.data.title || 'Ссылка'}</strong>
				{#if block.data.osnovaEmbed?.data.description}
					<p>{block.data.osnovaEmbed.data.description}</p>
				{/if}
			</a>
		</div>
	{:else if block.type === 'link'}
		{@const url = block.data.link?.data.url}
		{@const target = url ? parseDtfUrl(url) : undefined}
		<div class="block link-block" id={anchorId}>
			<a
				href={target ? resolve(dtfTargetToPath(target) as any) : url}
				target={target ? undefined : '_blank'}
				rel={target ? undefined : 'noopener noreferrer'}
				class="embed-card"
			>
				<strong>{block.data.link?.data.title || 'Ссылка'}</strong>
				{#if block.data.link?.data.description}
					<p>{block.data.link.data.description}</p>
				{/if}
			</a>
		</div>
	{:else}
		<div class="block unknown-block" id={anchorId}>[Блок: {block.type}]</div>
	{/if}
{/each}
</div>

<style>
	.block {
		scroll-margin-top: calc(var(--header-height, 60px) + 8px);
	}
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
		transition: background var(--duration-base);
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
