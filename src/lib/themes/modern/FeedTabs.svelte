<script lang="ts">
	let { currentFeed, switchFeed } = $props<{ currentFeed: string, switchFeed: (feed: 'popular' | 'new' | 'my') => void }>();
</script>

<div class="feed-tabs">
	<button class:active={currentFeed === 'popular'} onclick={() => switchFeed('popular')}>Популярное</button>
	<button class:active={currentFeed === 'new'} onclick={() => switchFeed('new')}>Свежее</button>
	<button class:active={currentFeed === 'my'} onclick={() => switchFeed('my')}>Моя лента</button>
</div>

<style>
	.feed-tabs {
		display: flex;
		gap: 12px;
		margin-bottom: 20px;
		padding: 0 16px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.feed-tabs::-webkit-scrollbar {
		display: none;
	}
	.feed-tabs button {
		background: var(--bg-secondary, #f0f0f0);
		border: none;
		padding: 8px 16px;
		border-radius: 20px;
		cursor: pointer;
		font-weight: 500;
		color: var(--text-secondary, #666);
		transition: all 0.2s ease;
		white-space: nowrap;
	}
	.feed-tabs button:hover {
		background: var(--bg-hover, #e0e0e0);
		color: var(--text-primary, #000);
	}
	.feed-tabs button.active {
		background: var(--accent-color, #2ea83a);
		color: #fff;
	}
</style>
