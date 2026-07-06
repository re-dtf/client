<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { themeState } from '$lib/themes/index.svelte';
	import type { ThemeName } from '$lib/themes/index.svelte';

	// Helper for two-way binding
	let enableCustomApi = $derived(api.enableCustomApi);
	let currentTheme = $derived(themeState.value);

	function updateApi(e: Event) {
		api.enableCustomApi = (e.target as HTMLInputElement).checked;
	}

	function updateTheme(e: Event) {
		themeState.value = (e.target as HTMLSelectElement).value as ThemeName;
	}
</script>

<div class="settings classic-settings">
	<h2>Настройки клиента <span class="badge">Classic</span></h2>

	<div class="section">
		<h3>Источники данных (API)</h3>
		<p class="description">Основным источником всегда является официальный API DTF. Вы можете подключить дополнительный сервер для расширения функционала.</p>
		
		<div class="control checkbox-control">
			<label>
				<input type="checkbox" checked={enableCustomApi} onchange={updateApi} />
				Подключить кастомный сервер (Мой API)
			</label>
		</div>
	</div>

	<div class="section">
		<h3>Внешний вид</h3>
		<p class="description">Смена дизайна полностью меняет структуру компонентов благодаря ленивой загрузке.</p>
		
		<div class="control">
			<label for="theme-select">Дизайн (Тема):</label>
			<select id="theme-select" value={currentTheme} onchange={updateTheme}>
				<option value="classic">Классический дизайн (Classic)</option>
				<option value="modern">Современный дизайн (Modern)</option>
			</select>
		</div>
	</div>
</div>

<style>
	.classic-settings {
		background: white;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}

	h2 {
		margin-top: 0;
		margin-bottom: 24px;
		padding-bottom: 12px;
		border-bottom: 1px solid #eee;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.badge {
		font-size: 14px;
		background: #eee;
		color: #666;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.section {
		margin-bottom: 30px;
	}

	h3 {
		margin-bottom: 8px;
		color: #333;
	}

	.description {
		font-size: 0.9em;
		color: #666;
		margin-bottom: 16px;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 300px;
	}

	.checkbox-control label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	label {
		font-weight: 500;
	}

	select {
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 1em;
		background: #f9f9f9;
	}
</style>
