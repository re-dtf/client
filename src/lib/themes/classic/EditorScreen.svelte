<script lang="ts">
	import Editor from '$lib/components/editor/Editor.svelte';
	import SubsiteSelector from '$lib/components/editor/SubsiteSelector.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { session } = $props<{ session: any }>();

	onMount(() => {
		session.init();
	});

	onDestroy(() => {
		session.destroy();
	});

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
			<span class="status-msg">{session.saveMessage}</span>
			{#if session.postId}
				<div class="history-wrapper">
					<button class="icon-btn" onclick={session.toggleHistory} title="История изменений">
						🕒
					</button>
					{#if session.showHistory}
						<div class="history-dropdown">
							<h4>История черновика</h4>
							{#if session.loadingHistory}
								<div class="history-item">Загрузка...</div>
							{:else if session.historyVersions.length === 0}
								<div class="history-item">Нет сохраненных версий</div>
							{:else}
								{#each session.historyVersions as version}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="history-item clickable" onclick={() => session.loadVersion(version.id)}>
										{formatDate(version.dateCreated)}
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			<button class="publish-btn" onclick={session.publish} disabled={session.isSaving}>Опубликовать</button>
			<button class="back-link" onclick={session.goBack}>✕</button>
		</div>
	</div>

	<div class="settings-bar">
		{#if session.subsites.length > 0}
			<SubsiteSelector subsites={session.subsites} bind:selectedId={session.selectedSubsiteId} />
		{/if}
		
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={session.isAdult} />
			18+
		</label>
		
		<select class="settings-select" onchange={session.updateCommentPermission} value={session.commentPermission}>
			<option value="everyone">Комментарии: Всем</option>
			<option value="only_subscribers">Комментарии: Подписчикам</option>
			<option value="only_plus">Комментарии: С плюсом</option>
			<option value="nobody">Комментарии: Отключены</option>
		</select>
	</div>
	
	<input class="title-input" type="text" placeholder="Заголовок (необязательно)" bind:value={session.title} />

	<div class="editor-wrapper">
		<Editor bind:editorInstance={session.editorInstance} initialData={session.initialData} onChange={session.queueSave} />
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
