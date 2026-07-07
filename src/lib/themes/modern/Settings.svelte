<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { themeState } from '$lib/themes/index.svelte';
	import type { ThemeName } from '$lib/themes/index.svelte';
	import { commentSettings } from '$lib/storage/commentSettings.svelte';
	import type { NestingMode } from '$lib/storage/commentSettings.svelte';

	// Helper for two-way binding
	let enableCustomApi = $derived(api.enableCustomApi);
	let currentTheme = $derived(themeState.value);
	let nestingMode = $derived(commentSettings.value.nestingMode);

	function updateApi(e: Event) {
		api.enableCustomApi = (e.target as HTMLInputElement).checked;
	}

	function updateTheme(e: Event) {
		themeState.value = (e.target as HTMLSelectElement).value as ThemeName;
	}

	function updateNestingMode(mode: NestingMode) {
		commentSettings.value = { ...commentSettings.value, nestingMode: mode };
	}
</script>

<div class="settings modern-settings">
	<div class="header">
		<div class="icon-wrap">⚙️</div>
		<div>
			<h2>Настройки</h2>
			<p class="subtitle">Управление параметрами приложения</p>
		</div>
	</div>

	<div class="cards">
		<div class="card">
			<div class="card-header">
				<span class="card-icon">🔌</span>
				<h3>Источники API</h3>
			</div>
			<p class="description">Официальный API DTF включен по умолчанию. Подключите кастомный сервер для расширенных функций.</p>
			
			<label class="toggle">
				<input type="checkbox" checked={enableCustomApi} onchange={updateApi} />
				<span class="slider"></span>
				<span class="label-text">Кастомный сервер (Мой API)</span>
			</label>
		</div>

		<div class="card">
			<div class="card-header">
				<span class="card-icon">✨</span>
				<h3>Внешний вид</h3>
			</div>
			<p class="description">Переключение меняет архитектуру компонентов благодаря Lazy Loading.</p>
			
			<div class="theme-selector">
				<button 
					class="theme-btn"
					class:active={currentTheme === 'classic'}
					onclick={() => themeState.value = 'classic'}
				>
					Классика
				</button>
				<button 
					class="theme-btn"
					class:active={currentTheme === 'modern'}
					onclick={() => themeState.value = 'modern'}
				>
					Модерн
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header">
				<span class="card-icon">💬</span>
				<h3>Комментарии</h3>
			</div>
			<p class="description">Режим отображения глубоко вложенных веток комментариев.</p>
			
			<div class="nesting-selector">
				<button
					class="nesting-btn"
					class:active={nestingMode === 'flatten'}
					onclick={() => updateNestingMode('flatten')}
				>
					<span class="nesting-icon">📐</span>
					<span class="nesting-label">Сглаживание</span>
					<span class="nesting-desc">Глубокие ветки сглаживаются</span>
				</button>
				<button
					class="nesting-btn"
					class:active={nestingMode === 'autopan'}
					onclick={() => updateNestingMode('autopan')}
				>
					<span class="nesting-icon">🎥</span>
					<span class="nesting-label">Авто-панорама</span>
					<span class="nesting-desc">Камера следит за глубиной</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.modern-settings {
		max-width: 800px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 40px;
	}

	.icon-wrap {
		font-size: 40px;
		background: #ffffff;
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 24px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.08);
	}

	h2 {
		margin: 0 0 8px 0;
		font-size: 2em;
		color: #1a1a1a;
	}

	.subtitle {
		margin: 0;
		color: #888;
		font-size: 1.1em;
	}

	.cards {
		display: grid;
		gap: 24px;
	}

	.card {
		background: #ffffff;
		border-radius: 20px;
		padding: 30px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.05);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}

	.card-icon {
		font-size: 24px;
	}

	h3 {
		margin: 0;
		font-size: 1.3em;
		color: #1a1a1a;
	}

	.description {
		color: #666;
		line-height: 1.5;
		margin: 0 0 24px 0;
	}

	/* Toggle Switch */
	.toggle {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
	}

	.toggle input {
		display: none;
	}

	.slider {
		position: relative;
		width: 50px;
		height: 28px;
		background-color: #e0e0e0;
		border-radius: 34px;
		transition: .3s;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 20px;
		width: 20px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		border-radius: 50%;
		transition: .3s;
	}

	input:checked + .slider {
		background: linear-gradient(135deg, #6e8efb, #a777e3);
	}

	input:checked + .slider:before {
		transform: translateX(22px);
	}

	.label-text {
		font-weight: 600;
		color: #333;
	}

	/* Theme Selector Buttons */
	.theme-selector {
		display: flex;
		gap: 12px;
	}

	.theme-btn {
		flex: 1;
		padding: 16px;
		border: 2px solid #eee;
		background: transparent;
		border-radius: 12px;
		font-size: 1.1em;
		font-weight: 600;
		color: #666;
		cursor: pointer;
		transition: all 0.2s;
	}

	.theme-btn:hover {
		border-color: #ccc;
	}

	.theme-btn.active {
		border-color: #ff416c;
		color: #ff416c;
		background: rgba(255, 65, 108, 0.05);
	}

	/* Nesting mode selector */
	.nesting-selector {
		display: flex;
		gap: 12px;
	}

	.nesting-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 16px 12px;
		border: 2px solid #eee;
		background: transparent;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.nesting-btn:hover {
		border-color: #ccc;
	}

	.nesting-btn.active {
		border-color: #6e8efb;
		background: rgba(110, 142, 251, 0.05);
	}

	.nesting-icon {
		font-size: 24px;
	}

	.nesting-label {
		font-size: 0.95em;
		font-weight: 600;
		color: #333;
	}

	.nesting-desc {
		font-size: 0.78em;
		color: #888;
		text-align: center;
	}
</style>
