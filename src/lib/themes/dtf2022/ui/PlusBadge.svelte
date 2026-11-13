<script lang="ts">
	import type { User } from '$lib/api/types';
	import { badges } from '$lib/badges.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import BadgeInfoModal from '../BadgeInfoModal.svelte';

	let { author, size = 16 }: { author: Pick<User, 'isPlus' | 'badgeId'>; size?: number } = $props();

	let customId = $derived(settings.value.plusBadges === 'custom' ? author.badgeId : undefined);
	let customUrl = $derived(customId ? badges.urlOf(customId) : undefined);
	let showModal = $state(false);

	$effect(() => {
		if (customId) void badges.load();
	});
</script>

{#if author.isPlus}
	<button
		type="button"
		class="plus-badge"
		title="Подписка DTF Plus"
		aria-label="Подписка DTF Plus"
		onclick={(e) => {
			e.stopPropagation();
			e.preventDefault();
			showModal = true;
		}}
	>
		{#if customUrl}
			<img src={customUrl} width={size} height={size} alt="" />
		{:else}
			<svg class="icon" width={size} height={size} aria-hidden="true">
				<use href="/icons.svg#ui_badge_plus"></use>
			</svg>
		{/if}
	</button>

	{#if showModal}
		<BadgeInfoModal badge={{ type: 'plus', customUrl }} onclose={() => (showModal = false)} />
	{/if}
{/if}

<style>
	.plus-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		margin: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		line-height: 1;
		transition: opacity var(--duration-fast, 0.15s) ease;
	}

	.plus-badge:hover {
		opacity: 0.85;
	}

	.plus-badge :is(img, .icon) {
		display: block;
	}
</style>
