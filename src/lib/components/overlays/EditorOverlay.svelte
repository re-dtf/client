<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { createEditorSession } from '../editor/session.svelte.js';
	import { untrack } from 'svelte';

	let { postId = null, repostId }: { postId?: number | null; repostId?: number } = $props();
	
	const session = createEditorSession(untrack(() => postId), untrack(() => repostId));
</script>

<ThemeLoader componentName="EditorScreen" {session} />
