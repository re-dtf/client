<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div class="error-container">
	<div class="error-card">
		<h1 class="error-status">{page.status}</h1>
		<p class="error-message">{page.error?.message || 'Произошла непредвиденная ошибка'}</p>
		<a href={resolve('/')} class="error-link">На главную</a>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 24px;
	}

	.error-card {
		text-align: center;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.error-status {
		font-size: 64px;
		font-weight: 700;
		line-height: 1;
		margin: 0;
		color: var(--color-text, currentColor);
		opacity: 0.8;
	}

	.error-message {
		font-size: 16px;
		line-height: 1.5;
		margin: 0;
		color: var(--color-text-secondary, currentColor);
		opacity: 0.7;
	}

	.error-link {
		margin-top: 8px;
		padding: 8px 18px;
		font-size: 14px;
		font-weight: 500;
		border-radius: 8px;
		background: var(--color-primary, #007aff);
		color: #fff;
		text-decoration: none;
		transition: opacity 0.15s ease;
	}

	.error-link:hover {
		opacity: 0.9;
	}
</style>
