<script lang="ts">
	import type { User } from '$lib/api/types';
	import { badges } from '$lib/badges.svelte';
	import { settings } from '$lib/storage/settings.svelte';

	let { author, size = 16 }: { author: Pick<User, 'isPlus' | 'badgeId'>; size?: number } = $props();

	let customId = $derived(settings.value.plusBadges === 'custom' ? author.badgeId : undefined);
	let customUrl = $derived(customId ? badges.urlOf(customId) : undefined);

	$effect(() => {
		if (customId) void badges.load();
	});
</script>

{#if author.isPlus}
	<span class="plus-badge" title="Plus">
		{#if customUrl}
			<img src={customUrl} width={size} height={size} alt="" />
		{:else}
			<svg class="icon" width={size} height={size} aria-hidden="true">
				<use href="/icons.svg#ui_badge_plus"></use>
			</svg>
		{/if}
	</span>
{/if}

<style>
	.plus-badge {
		display: flex;
		flex-shrink: 0;
	}

	.plus-badge :is(img, .icon) {
		display: block;
	}
</style>
