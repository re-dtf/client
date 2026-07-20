<script lang="ts">
	import PostContent from '$lib/components/PostContent.svelte';

	let { postId, sourceId = 'dtf' } = $props<{ postId: number, sourceId?: string }>();

	function goBack() {
		history.back();
	}
</script>

<PostContent {postId} {sourceId}>
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
