<script lang="ts">
	import { onMount } from 'svelte';
	import { notifications } from '$lib/api/notifications.svelte';
	import NotificationsPanel from './NotificationsPanel.svelte';

	onMount(() => notifications.load());
</script>

<div class="notifications-page">
	<NotificationsPanel page />
</div>

<style>
	.notifications-page {
		max-width: 640px;
		margin: 0 auto;
		background: #fff;
		color: #000;
		min-height: 200px;
	}
</style>
