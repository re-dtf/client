<script lang="ts">
	import PostContent from '$lib/components/PostContent.svelte';
	import { closeOverlay } from '$lib/navigation';

	let {
		postId,
		sourceId = 'dtf',
		commentId,
		focusNonce,
		depth = 0,
		toComments
	}: { postId: number; sourceId?: string; commentId?: number; focusNonce?: number; toComments?: boolean; depth?: number } = $props();

	function goBack() {
		closeOverlay();
	}
</script>

<PostContent {postId} {sourceId} {commentId} {focusNonce} {toComments} {depth}>
	{#snippet backButton()}
		<button class="back-link" onclick={goBack}>← Вернуться в ленту</button>
	{/snippet}
</PostContent>

<style>
	.back-link {
		background: none;
		border: none;
		color: #1976d2;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style>
