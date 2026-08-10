<script lang="ts">
	import type { Post } from '$lib/api/types';
	let { post, preview = true } = $props<{ post?: Post, preview?: boolean }>();
</script>
