<script lang="ts">
	let {
		src,
		alt = '',
		width,
		height,
		base64preview,
		color,
		wrapperClass = ''
	} = $props<{
		src: string;
		alt?: string;
		width?: number;
		height?: number;
		base64preview?: string;
		color?: string;
		wrapperClass?: string;
	}>();

	let loaded = $state(false);

	let aspectRatio = $derived(width && height ? `${width} / ${height}` : 'auto');
	let bgColor = $derived(color ? `#${color}` : 'transparent');
	let bgImage = $derived(base64preview ? `url(data:image/png;base64,${base64preview})` : 'none');
</script>

<div class={['lazy-image-wrapper', wrapperClass, { loaded }]} style="aspect-ratio: {aspectRatio}; background-color: {bgColor};">
	{#if base64preview}
		<div class="preview" style="background-image: {bgImage};"></div>
	{/if}
	
	<div class="shimmer"></div>

	<img
		{src}
		{alt}
		loading="lazy"
		onload={() => (loaded = true)}
		class="full-image"
	/>
</div>

<style>
	.lazy-image-wrapper {
		position: relative;
		width: 100%;
		overflow: hidden;
		border-radius: var(--block-radius, 4px);
		background-size: cover;
		background-position: center;
	}

	.preview {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		filter: blur(50px);
		transform: scale(1.2);
		transition: opacity 0.5s ease;
		z-index: 1;
	}

	.shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0.15) 50%,
			rgba(255, 255, 255, 0) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 3s infinite ease-in-out;
		z-index: 2;
		transition: opacity 0.5s ease;
	}

	.full-image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.5s ease;
		z-index: 3;
	}

	.loaded .preview,
	.loaded .shimmer {
		opacity: 0;
	}

	.loaded .full-image {
		opacity: 1;
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}
</style>
