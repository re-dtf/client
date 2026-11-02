<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
</script>

<!-- Разметку рисует компонент темы Notifications; у тем без него — ссылка на DTF -->
<ThemeLoader componentName="Notifications">
	<div class="notifications-fallback">
		<a href="https://dtf.ru/notifications" target="_blank" rel="noreferrer">Открыть уведомления на DTF</a>
	</div>
</ThemeLoader>

<style>
	.notifications-fallback {
		padding: 40px;
		text-align: center;
	}
</style>
