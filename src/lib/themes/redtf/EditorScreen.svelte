<script lang="ts">
	import BaseEditorScreen from '../dtf2022/EditorScreen.svelte';
	import { activeThemeSettings } from '../settings.svelte';

	let { session }: { session: any } = $props();

	const settings = activeThemeSettings();
	const fullscreen = $derived(settings.value.editorFullscreen !== false);
</script>

<!-- Окно или весь экран, плавно: геометрия .writing--window и переход заданы в theme.css -->
<BaseEditorScreen {session} windowed={!fullscreen}>
	{#snippet barExtra()}
		<button
			type="button"
			class="writing__mode"
			aria-label={fullscreen ? 'Показать редактор окном' : 'Развернуть редактор на весь экран'}
			onclick={() => settings.patch({ editorFullscreen: !fullscreen })}
		>
			<svg class="icon" width="24" height="24" aria-hidden="true">
				<use href="/icons.svg#{fullscreen ? 'v_minimize' : 'v_maximize'}"></use>
			</svg>
		</button>
	{/snippet}
</BaseEditorScreen>
