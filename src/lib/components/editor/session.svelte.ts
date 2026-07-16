import { untrack } from 'svelte';
import { api } from '$lib/api/index.svelte';
import type { SubsiteItem, PostHistoryVersion } from '$lib/api/types';
import { editorJsToDtf, dtfToEditorJs } from './mapper';
import type { OutputData } from '@editorjs/editorjs';

export function createEditorSession(initialPostId: number | null = null) {
	let postId = $state(initialPostId);
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

	let editorInstance: any = $state(null);

	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;

	const DEBOUNCE_MS = 2000;
	const MAX_WAIT_MS = 120000;
	let isFirstRender = true;

	async function init() {
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
	}

	function destroy() {
		if (saveTimer) clearTimeout(saveTimer);
		if (maxWaitTimer) clearTimeout(maxWaitTimer);
	}

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
				setTimeout(() => { history.back(); }, 1000);
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

	function goBack() {
		history.back();
	}

	// We can use $effect inside the session factory because it's called during component initialization
	$effect(() => {
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

	return {
		get postId() { return postId; },
		get initialData() { return initialData; },
		get subsites() { return subsites; },
		get selectedSubsiteId() { return selectedSubsiteId; },
		set selectedSubsiteId(v) { selectedSubsiteId = v; },
		get isAdult() { return isAdult; },
		set isAdult(v) { isAdult = v; },
		get title() { return title; },
		set title(v) { title = v; },
		get commentPermission() { return commentPermission; },
		get isSaving() { return isSaving; },
		get saveMessage() { return saveMessage; },
		get showHistory() { return showHistory; },
		get historyVersions() { return historyVersions; },
		get loadingHistory() { return loadingHistory; },
		
		get editorInstance() { return editorInstance; },
		set editorInstance(v) { editorInstance = v; },

		init,
		destroy,
		queueSave,
		publish,
		updateCommentPermission,
		toggleHistory,
		loadVersion,
		goBack
	};
}
