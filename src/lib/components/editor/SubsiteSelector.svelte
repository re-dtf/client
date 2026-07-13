<script lang="ts">
	import type { SubsiteItem } from '$lib/api/types';
	import { clickOutside } from '$lib/actions/clickOutside.js';

	let {
		subsites = [],
		selectedId = $bindable(0),
	} = $props<{
		subsites: SubsiteItem[];
		selectedId: number;
	}>();

	let isOpen = $state(false);

	let selectedSubsite = $derived(subsites.find((s: SubsiteItem) => s.value === selectedId) || subsites[0]);

	function toggle() {
		isOpen = !isOpen;
	}

	function selectSubsite(id: number) {
		selectedId = id;
		isOpen = false;
	}
	
	function close() {
		isOpen = false;
	}
</script>

<div class="custom-select" use:clickOutside={close}>
	<button class="select-trigger" onclick={toggle}>
		{#if selectedSubsite}
			{#if selectedSubsite.image}
				<img src={selectedSubsite.image} alt="" class="subsite-icon" />
			{:else}
				<div class="subsite-icon fallback"></div>
			{/if}
			<span class="subsite-label">{selectedSubsite.label}</span>
		{:else}
			<span class="subsite-label">Выберите подсайт</span>
		{/if}
		<span class="arrow" class:open={isOpen}>▼</span>
	</button>

	{#if isOpen}
		<div class="dropdown">
			{#each subsites as subsite}
				<button 
					class="option" 
					class:selected={subsite.value === selectedId}
					onclick={() => selectSubsite(subsite.value)}
				>
					{#if subsite.image}
						<img src={subsite.image} alt="" class="subsite-icon" />
					{:else}
						<div class="subsite-icon fallback"></div>
					{/if}
					<span class="subsite-label">{subsite.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.custom-select {
		position: relative;
		min-width: 200px;
	}

	.select-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 8px 12px;
		background: #fff;
		border: 1px solid #ccc;
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
		font-size: 14px;
		color: #1a1a1a;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		width: 100%;
		background: #fff;
		border: 1px solid #ccc;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
		max-height: 300px;
		overflow-y: auto;
		z-index: 1000;
	}

	.option {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 14px;
		color: #1a1a1a;
	}

	.option:hover {
		background: #f4f5f7;
	}

	.option.selected {
		background: #eef2fa;
		font-weight: 500;
	}

	.subsite-icon {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		margin-right: 10px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.fallback {
		background: #ccc;
	}

	.arrow {
		margin-left: auto;
		font-size: 10px;
		color: #888;
		transition: transform 0.2s;
	}

	.arrow.open {
		transform: rotate(180deg);
	}
</style>
