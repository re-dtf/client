<script lang="ts">
	import { untrack } from 'svelte';
	import type { OutputData } from '@editorjs/editorjs';
	import './editor.css';
	import { getEditorConfig } from './config';

	let { 
		initialData = undefined, 
		placeholder = 'Напишите что-нибудь...', 
		onChange = () => {},
		editorInstance = $bindable(null)
	} = $props<{
		initialData?: OutputData;
		placeholder?: string;
		onChange?: () => void;
		editorInstance?: any;
	}>();

	let editorElement: HTMLElement;

	$effect(() => {
		if (!editorElement) return;

		let isDestroyed = false;
		let instance: any = null;

		(async () => {
			const EditorJS = (await import('@editorjs/editorjs')).default;
			const config = await getEditorConfig();

			if (isDestroyed) return;

			instance = new EditorJS({
				holder: editorElement,
				placeholder,
				tunes: config.tunes,
				tools: config.tools,
				data: untrack(() => initialData),
				onChange: () => {
					if (!instance) return;
					onChange();
				}
			});
			editorInstance = instance;
		})();

		return () => {
			isDestroyed = true;
			if (instance && typeof instance.destroy === 'function') {
				try {
					instance.destroy();
				} catch (e) {
					// Catch potential errors if editor is still initializing when destroyed
					console.error("Error destroying EditorJS instance", e);
				}
			}
		};
	});
</script>

<div bind:this={editorElement} class="editor-container"></div>

<style>
	.editor-container {
		min-height: 300px;
		background: #fff;
		border-radius: 8px;
		padding: 20px 40px;
		color: #1a1a1a;
		font-family: inherit;
	}
	
</style>
