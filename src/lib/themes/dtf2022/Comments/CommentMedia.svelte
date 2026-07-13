<script lang="ts">
	import type { CommentMedia } from '$lib/api/types';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import LazyImage from '$lib/components/LazyImage.svelte';
	import { getLeonardoUrl } from '$lib/api/utils';

	let { media } = $props<{ media: CommentMedia[] }>();
</script>

{#if media?.length}
	<div class="comment-media">
		{#each media as m}
			{#if m.type === 'image'}
				<LazyImage
					src={getLeonardoUrl(m.data.uuid, { width: 400, format: 'webp' })}
					width={m.data.width}
					height={m.data.height}
					base64preview={m.data.base64preview}
					color={m.data.color}
					wrapperClass="comment-img"
				/>
			{:else if m.type === 'movie'}
				<video
					use:lazyVideo
					src={getLeonardoUrl(m.data.uuid, { format: 'mp4' })}
					loop
					muted
					playsinline
					class="comment-video"
					style="aspect-ratio: {m.data.width}/{m.data.height};"
				></video>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.comment-media {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	
	:global(.comment-img),
	.comment-video {
		max-width: min(100%, 400px);
		height: auto;
		border-radius: var(--comment-media-radius, 8px);
		display: block;
	}
</style>
