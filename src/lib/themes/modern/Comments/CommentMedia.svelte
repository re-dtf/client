<script lang="ts">
	import type { CommentMedia } from '$lib/api/types';
	import { lazyVideo } from '$lib/actions/lazyVideo';

	let { media } = $props<{ media: CommentMedia[] }>();
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
					use:lazyVideo
					src="https://leonardo.osnova.io/{m.data.uuid}/-/format/mp4/"
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
