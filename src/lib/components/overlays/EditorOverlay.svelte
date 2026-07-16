<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { createEditorSession } from '../editor/session.svelte.js';
	import { untrack } from 'svelte';

	let { postId = null } = $props<{ postId?: number | null }>();
	
	const session = createEditorSession(untrack(() => postId));
</script>

<ThemeLoader componentName="EditorScreen" {session} />
