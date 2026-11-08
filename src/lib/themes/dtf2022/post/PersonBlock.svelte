<script lang="ts">
	import { getLeonardoUrl } from '$lib/api/utils';
	import { sanitizeHtml } from '$lib/sanitize';

	/* Блок person: круглая фотография, имя и описание по центру (.block-person в оригинале) */
	let { data }: { data: any } = $props();

	let image = $derived(data.image?.data);
</script>

{#if image?.uuid || data.title || data.description}
	<div class="person">
		{#if image?.uuid}
			<img class="person__image" src={getLeonardoUrl(image.uuid, { scale_crop: '256x256' })} alt={data.title || ''} loading="lazy" />
		{/if}
		{#if data.title}
			<div class="person__title">{@html sanitizeHtml(data.title)}</div>
		{/if}
		{#if data.description}
			<div class="person__description">{@html sanitizeHtml(data.description)}</div>
		{/if}
	</div>
{/if}

<style>
	.person {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.person__image {
		width: 128px;
		height: 128px;
		border-radius: 50%;
		box-shadow: 0 0 0 1px var(--border-avatar);
		object-fit: cover;
	}

	.person__image:not(:last-child) {
		margin-bottom: 15px;
	}

	.person__title {
		font-size: 17px;
		font-weight: 500;
		line-height: 26px;
	}

	.person__title:not(:last-child) {
		margin-bottom: 5px;
	}

	.person__description {
		font-size: 15px;
		line-height: 22px;
	}

	@media (max-width: 859px) {
		.person__image {
			width: 96px;
			height: 96px;
		}

		.person__image:not(:last-child) {
			margin-bottom: 8px;
		}

		.person__title:not(:last-child) {
			margin-bottom: 4px;
		}
	}
</style>
