<script lang="ts">
	import { onMount } from 'svelte';
	import { notifications } from '$lib/api/notifications.svelte';
	import NotificationsPanel from './NotificationsPanel.svelte';

	onMount(() => {
		notifications.load().then(() => notifications.markSeen());
	});
</script>

<div class="notifications-page">
	<NotificationsPanel page />
</div>

<style>
	/* Колонка растягивается на всю высоту контента между сайдбарами */
	.notifications-page {
		width: 100%;
		max-width: 640px;
		flex-grow: 1;
		background: #fff;
		color: #000;
	}
</style>
