<script lang="ts">
	import SidebarLeft from './SidebarLeft.svelte';
	import SidebarRight from './SidebarRight.svelte';
	import MobileBar from './MobileBar.svelte';

	let { children } = $props<{ children?: any }>();
</script>

<div class="layout layout--between">
	<SidebarLeft />
	
	<main class="page-content" id="content">
		{#if children}
			{@render children()}
		{/if}
	</main>
	
	<SidebarRight />
</div>

<MobileBar />
