<script lang="ts">
	import type { MediaItem } from '$lib/api/types';

	let { media } = $props<{ media: MediaItem[] }>();
</script>

{#if media?.length}
	<div class="comment-media">
		{#each media as m}
			{#if m.type === 'image'}
				<img
					src="https://leonardo.osnova.io/{m.data.uuid}/-/preview/400/-/format/webp/"
					alt=""
					loading="lazy"
					style="aspect-ratio: {m.data.width}/{m.data.height}; background-color: #{m.data.color || 'eee'};"
					class="comment-img"
				/>
			{:else if m.type === 'movie'}
				<video
					src="https://leonardo.osnova.io/{m.data.uuid}/-/format/mp4/"
					autoplay
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
	
	.comment-img,
	.comment-video {
		max-width: min(100%, 400px);
		height: auto;
		border-radius: var(--comment-media-radius, 8px);
		display: block;
	}
</style>
