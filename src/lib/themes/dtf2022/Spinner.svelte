<script lang="ts">
	import Preloader from './ui/Preloader.svelte';
	let { inline = false } = $props<{ inline?: boolean }>();
</script>

<div class="spinner-wrapper" class:inline>
	<Preloader />
</div>

<style>
	.spinner-wrapper {
		display: flex;
		justify-content: center;
		padding: 30px;
	}
	.spinner-wrapper.inline {
		padding: 10px;
	}
</style>
