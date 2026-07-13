<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { DtfEditorEntry, SubsiteItem, PostHistoryVersion } from '$lib/api/types';
	import { editorJsToDtf, dtfToEditorJs } from '../editor/mapper';
	import Editor from '../editor/Editor.svelte';
	import SubsiteSelector from '../editor/SubsiteSelector.svelte';
	import type { OutputData } from '@editorjs/editorjs';
	import { onMount, untrack, onDestroy } from 'svelte';

	let { postId = null } = $props<{ postId?: number | null }>();

	let initialData: OutputData | undefined = $state(undefined);
	let subsites: SubsiteItem[] = $state([]);
	let selectedSubsiteId = $state(0);
	let isAdult = $state(false);
	let title = $state('');
	let commentPermission = $state<'everyone' | 'nobody' | 'only_plus' | 'only_subscribers'>('everyone');
	
	let isSaving = $state(false);
	let saveMessage = $state('');
	
	let showHistory = $state(false);
	let historyVersions: PostHistoryVersion[] = $state([]);
	let loadingHistory = $state(false);

	function goBack() {
		history.back();
	}

	onMount(async () => {
		try {
			subsites = await api.getSubsites();
			if (subsites.length > 0) {
				selectedSubsiteId = subsites[0].value;
			}
			if (postId) {
				commentPermission = await api.getCommentPermissions(postId);
			}
		} catch (e) {
			console.error("Failed to load initial data", e);
		}
	});

	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;

	const DEBOUNCE_MS = 2000;
	const MAX_WAIT_MS = 120000;

	let isFirstRender = true;

	$effect(() => {
		// Track dependencies
		const _t = title;
		const _s = selectedSubsiteId;
		const _a = isAdult;
		
		untrack(() => {
			if (isFirstRender) {
				isFirstRender = false;
				return;
			}
			queueSave();
		});
	});

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
		if (maxWaitTimer) clearTimeout(maxWaitTimer);
	});

	function queueSave() {
		if (!editorInstance) return;
		
		if (saveTimer) clearTimeout(saveTimer);
		
		saveTimer = setTimeout(() => {
			performSave(false);
		}, DEBOUNCE_MS);
		
		if (!maxWaitTimer) {
			maxWaitTimer = setTimeout(() => {
				performSave(false);
			}, MAX_WAIT_MS);
		}
	}

	async function performSave(isPublishing: boolean = false) {
		if (!isPublishing) {
			if (saveTimer) clearTimeout(saveTimer);
			if (maxWaitTimer) clearTimeout(maxWaitTimer);
			saveTimer = null;
			maxWaitTimer = null;
		}
		
		if (!editorInstance) return;
		
		try {
			const data = await editorInstance.save();
			
			if (title.trim() === '' && (!data.blocks || data.blocks.length === 0)) {
				if (isPublishing) saveMessage = 'Ошибка: Содержимое поста пусто';
				return;
			}
			
			isSaving = true;
			saveMessage = isPublishing ? 'Публикация...' : 'Сохранение черновика...';
			
			const dtfEntry = editorJsToDtf(data, {
				id: postId || 0,
				title,
				subsite_id: selectedSubsiteId,
				is_adult: isAdult,
				is_published: isPublishing
			});
			
			const result = await api.saveDraft(dtfEntry);
			
			if (!postId && result && result.id) {
				postId = result.id;
			}
			
			if (isPublishing) {
				saveMessage = 'Опубликовано!';
				setTimeout(() => { goBack(); }, 1000);
			} else {
				saveMessage = 'Черновик сохранен';
			}
		} catch (e: any) {
			saveMessage = 'Ошибка: ' + e.message;
			console.error(e);
		} finally {
			if (!isPublishing || saveMessage.startsWith('Ошибка')) {
				isSaving = false;
				setTimeout(() => { if (saveMessage === 'Черновик сохранен') saveMessage = ''; }, 3000);
			}
		}
	}

	let editorInstance: any = $state(null);

	function publish() {
		performSave(true);
	}

	async function updateCommentPermission(e: Event) {
		const target = e.target as HTMLSelectElement;
		const perm = target.value as 'everyone' | 'nobody' | 'only_plus' | 'only_subscribers';
		commentPermission = perm;
		
		if (!postId) {
			await performSave(false);
		}
		
		if (postId) {
			try {
				await api.setCommentPermissions(postId, perm);
				saveMessage = 'Права изменены';
				setTimeout(() => { if (saveMessage === 'Права изменены') saveMessage = ''; }, 3000);
			} catch (err: any) {
				saveMessage = 'Ошибка: ' + err.message;
			}
		}
	}

	async function toggleHistory() {
		if (!postId) return;
		showHistory = !showHistory;
		if (showHistory) {
			loadingHistory = true;
			try {
				historyVersions = await api.getPostHistory(postId);
			} catch (e) {
				console.error(e);
			} finally {
				loadingHistory = false;
			}
		}
	}
	
	async function loadVersion(versionId: number) {
		if (!postId || !editorInstance) return;
		try {
			const entry = await api.getPostHistoryVersion(postId, versionId);
			const editorData = dtfToEditorJs(entry);
			await editorInstance.render(editorData);
			title = entry.title || '';
			isAdult = entry.is_adult || false;
			showHistory = false;
			saveMessage = 'Версия восстановлена';
			setTimeout(() => { if (saveMessage === 'Версия восстановлена') saveMessage = ''; }, 3000);
		} catch (e: any) {
			saveMessage = 'Ошибка: ' + e.message;
		}
	}
	
	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString('ru-RU', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<div class="dialog-box">
	<div class="header">
		<h2>Написать пост</h2>
		<div class="actions">
			<span class="status-msg">{saveMessage}</span>
			{#if postId}
				<div class="history-wrapper">
					<button class="icon-btn" onclick={toggleHistory} title="История изменений">
						🕒
					</button>
					{#if showHistory}
						<div class="history-dropdown">
							<h4>История черновика</h4>
							{#if loadingHistory}
								<div class="history-item">Загрузка...</div>
							{:else if historyVersions.length === 0}
								<div class="history-item">Нет сохраненных версий</div>
							{:else}
								{#each historyVersions as version}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="history-item clickable" onclick={() => loadVersion(version.id)}>
										{formatDate(version.dateCreated)}
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			<button class="publish-btn" onclick={publish} disabled={isSaving}>Опубликовать</button>
			<button class="back-link" onclick={goBack}>✕</button>
		</div>
	</div>

	<div class="settings-bar">
		{#if subsites.length > 0}
			<SubsiteSelector {subsites} bind:selectedId={selectedSubsiteId} />
		{/if}
		
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={isAdult} />
			18+
		</label>
		
		<select class="settings-select" onchange={updateCommentPermission} value={commentPermission}>
			<option value="everyone">Комментарии: Всем</option>
			<option value="only_subscribers">Комментарии: Подписчикам</option>
			<option value="only_plus">Комментарии: С плюсом</option>
			<option value="nobody">Комментарии: Отключены</option>
		</select>
	</div>
	
	<input class="title-input" type="text" placeholder="Заголовок (необязательно)" bind:value={title} />

	<div class="editor-wrapper">
		<Editor bind:editorInstance={editorInstance} {initialData} onChange={queueSave} />
	</div>
</div>

<style>
	.dialog-box {
		background: #f4f5f7;
		border-radius: 12px;
		max-width: 800px;
		width: 100%;
		height: 90vh; /* Using absolute height so editor scrolls internally */
		box-shadow: 0 10px 40px rgba(0,0,0,0.25);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		background: #fff;
		border-bottom: 1px solid #e5e5e5;
		border-radius: 12px 12px 0 0;
	}
	.header h2 {
		margin: 0;
		font-size: 18px;
		color: #1a1a1a;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.status-msg {
		font-size: 13px;
		color: #888;
	}
	.publish-btn {
		background: #e65050;
		color: #fff;
		border: none;
		border-radius: 6px;
		padding: 8px 16px;
		font-weight: 500;
		cursor: pointer;
	}
	.publish-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.back-link {
		background: transparent;
		border: none;
		font-size: 20px;
		color: #888;
		cursor: pointer;
	}
	.settings-bar {
		padding: 12px 24px;
		display: flex;
		gap: 20px;
		align-items: center;
		border-bottom: 1px solid #e5e5e5;
		background: #fff;
	}
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		cursor: pointer;
	}
	.title-input {
		border: none;
		font-size: 28px;
		font-weight: bold;
		padding: 24px 24px 0 24px;
		background: #fff;
		outline: none;
		width: 100%;
		box-sizing: border-box;
	}
	.title-input::placeholder {
		color: #ccc;
	}
	.editor-wrapper {
		flex: 1;
		padding: 0 24px 24px 24px;
		background: #fff;
		overflow-y: auto;
		border-radius: 0 0 12px 12px;
	}
	.settings-select {
		padding: 4px 8px;
		border-radius: 6px;
		border: 1px solid #e5e5e5;
		background: #f9f9f9;
		color: #1a1a1a;
		font-size: 13px;
		outline: none;
		cursor: pointer;
	}
	.icon-btn {
		background: #f4f5f7;
		border: none;
		border-radius: 6px;
		padding: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
	}
	.icon-btn:hover {
		background: #e5e5e5;
	}
	.history-wrapper {
		position: relative;
	}
	.history-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 8px;
		width: 220px;
		background: #fff;
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		z-index: 100;
		max-height: 300px;
		overflow-y: auto;
	}
	.history-dropdown h4 {
		margin: 0;
		padding: 12px;
		font-size: 14px;
		border-bottom: 1px solid #e5e5e5;
		color: #1a1a1a;
	}
	.history-item {
		padding: 10px 12px;
		font-size: 13px;
		color: #555;
		border-bottom: 1px solid #f0f0f0;
	}
	.history-item:last-child {
		border-bottom: none;
	}
	.history-item.clickable:hover {
		background: #f4f5f7;
		cursor: pointer;
		color: #1a1a1a;
	}
</style>
