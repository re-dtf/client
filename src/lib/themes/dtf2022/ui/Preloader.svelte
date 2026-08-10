<script lang="ts">
	let { class: className = '' } = $props<{ class?: string }>();
</script>

<div class={['loader preloader preloader--default', className]}>
	<span class="preloader__dot"></span>
	<span class="preloader__dot"></span>
	<span class="preloader__dot"></span>
</div>
