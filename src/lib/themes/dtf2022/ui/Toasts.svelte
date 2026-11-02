<script lang="ts">
	import Toast from './Toast.svelte';
	import { toasts } from './notify.svelte';
</script>

<div class="notify" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<Toast type={toast.type} message={toast.message} onhide={() => toasts.remove(toast.id)} />
	{/each}
</div>

<style>
	.notify {
		position: fixed;
		z-index: 2000;
		right: 0;
		top: 67px;
		width: 350px;
		overflow: hidden;
		padding: 5px 20px;
	}

	.notify:empty {
		display: none;
	}

	@media (max-width: 859px) {
		.notify {
			width: 100%;
			padding-left: 16px;
			padding-right: 16px;
		}
	}
</style>
