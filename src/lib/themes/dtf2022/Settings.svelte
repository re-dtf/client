<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { themeState } from '$lib/themes/index.svelte';
	import type { ThemeName } from '$lib/themes/index.svelte';
	import { commentSettings } from '$lib/storage/commentSettings.svelte';
	import type { NestingMode } from '$lib/storage/commentSettings.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';


	let currentTheme = $derived(themeState.value);
	let nestingMode = $derived(commentSettings.value.nestingMode);
	
	let proxyUrl = $state(authStorage.proxyUrl || '');

	$effect(() => {
		authStorage.proxyUrl = proxyUrl;
	});



	function updateTheme(e: Event) {
		themeState.value = (e.target as HTMLSelectElement).value as ThemeName;
	}

	function updateNestingMode(mode: NestingMode) {
		commentSettings.value = { ...commentSettings.value, nestingMode: mode };
	}
</script>

<div class="settings classic-settings">
	<h2>Настройки клиента <span class="badge">DTF 2022</span></h2>



	<div class="section">
		<h3>Внешний вид</h3>
		<p class="description">Смена дизайна полностью меняет структуру компонентов благодаря ленивой загрузке.</p>
		
		<div class="control">
			<label for="theme-select">Дизайн (Тема):</label>
			<select id="theme-select" value={currentTheme} onchange={updateTheme}>
				<option value="classic">Классический дизайн (Classic)</option>
				<option value="modern">Современный дизайн (Modern)</option>
				<option value="dtf2022">DTF 2022</option>
			</select>
		</div>
	</div>

	<div class="section">
		<h3>Комментарии</h3>
		<p class="description">Режим отображения глубоко вложенных комментариев.</p>
		
		<div class="control nesting-control">
			<span style="font-weight: 500;">Режим вложенности:</span>
			<div class="radio-group">
				<label class="radio-label">
					<input type="radio" name="nesting" checked={nestingMode === 'flatten'} onchange={() => updateNestingMode('flatten')} />
					<span>Сглаживание (рекомендуется)</span>
					<small>Глубокие ветки сглаживаются с навигацией к родителю</small>
				</label>
				<label class="radio-label">
					<input type="radio" name="nesting" checked={nestingMode === 'autopan'} onchange={() => updateNestingMode('autopan')} />
					<span>Авто-панорама</span>
					<small>Без лимита вложенности, камера следит за глубиной</small>
				</label>
			</div>
		</div>
	</div>

	<div class="section">
		<h3>Сеть и Авторизация</h3>
		<p class="description">Настройки CORS-прокси для обхода блокировок при входе и обновлении токена (Cloudflare Pages и др.)</p>
		
		<div class="control" style="max-width: 100%;">
			<label for="proxy-url">URL Прокси:</label>
			<input 
				type="url" 
				id="proxy-url" 
				bind:value={proxyUrl} 
				placeholder="https://auth-proxy.example.workers.dev" 
				style="width: 100%; max-width: 400px; padding: 10px; border: 1px solid #ccc; border-radius: 6px;"
			/>
			<small style="color: #666; margin-top: 4px;">
				Вы можете использовать <button type="button" class="link-button" onclick={() => {
					if (confirm('Использовать прокси от автора проекта?')) {
						proxyUrl = import.meta.env.VITE_AUTH_PROXY_URL || 'https://dtf-proxy.re-dtf.workers.dev';
					}
				}}>прокси от автора проекта</button>
			</small>
		</div>
	</div>

	<div class="section">
		<SourcesSettings />
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

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 8px;
	}

	.radio-label {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		padding: 10px;
		border: 1px solid #eee;
		border-radius: 6px;
		transition: border-color 0.2s, background 0.2s;
	}

	.radio-label:hover {
		border-color: #ccc;
		background: #fafafa;
	}

	.radio-label:has(input:checked) {
		border-color: #1976d2;
		background: rgba(25, 118, 210, 0.04);
	}

	.radio-label small {
		width: 100%;
		font-size: 0.8em;
		color: #888;
		font-weight: 400;
		padding-left: 24px;
	}

	.nesting-control {
		max-width: 400px;
	}

	.link-button {
		background: none;
		border: none;
		padding: 0;
		color: #1976d2;
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
		display: inline;
	}

	.link-button:hover {
		color: #1565c0;
	}
</style>
