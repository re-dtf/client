<script lang="ts">
	import Preloader from '../dtf2022/ui/Preloader.svelte';
	let { inline = false, block = false }: { inline?: boolean; block?: boolean } = $props();
</script>

<!-- Кольцо рисует theme.css (.preloader). С block — карточка на месте будущего содержимого (только там, где точно знаем, что это карточка ленты) -->
{#if block}
	<div class="placeholder"><Preloader /></div>
{:else}
	<div class={['spinner-wrapper', { inline }]}><Preloader /></div>
{/if}

<style>
	/* Спиннер не мелькает на быстрых загрузках: появляется чуть позже и плавно */
	.spinner-wrapper,
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		animation: spinner-in 0.3s ease 0.12s backwards;
	}

	.spinner-wrapper {
		padding: 30px;
	}

	.spinner-wrapper.inline {
		padding: 12px;
	}

	.placeholder {
		box-sizing: border-box;
		width: 100%;
		max-width: var(--placeholder-width, var(--content-width));
		min-height: var(--placeholder-height, 220px);
		/* Отступ сверху такой же, как у карточки ленты, чтобы заглушка не прыгала при замене постами */
		margin: var(--placeholder-top, 28px) auto 0;
		border-radius: var(--placeholder-radius, 8px);
		background: var(--bg-card);
	}

	@media (max-width: 639px) {
		.placeholder {
			margin-top: var(--placeholder-top, 20px);
			border-radius: 0;
		}
	}

	@keyframes spinner-in {
		from {
			opacity: 0;
			scale: 0.9;
		}
	}
</style>
