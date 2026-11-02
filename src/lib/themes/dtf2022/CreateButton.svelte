<script lang="ts">
	import { startWriting } from './actions.svelte';
</script>

<!-- navigation-create из шапки DTF: 40px, значок 20px, на ≤719px остаётся один значок -->
<button type="button" class="create" onclick={startWriting}>
	<span class="create__icon">
		<svg class="icon" width="20" height="20" aria-hidden="true">
			<use href="/icons.svg#v_plus"></use>
		</svg>
	</span>
	<span class="create__label">Создать</span>
</button>

<style>
	.create {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		height: 40px;
		min-width: 44px;
		border-radius: 8px;
		background-color: #fff;
		color: #000;
		box-shadow: 0 -1px 0 0 rgba(0, 0, 0, 0.06) inset, 0 1px 2px 0 rgba(0, 0, 0, 0.06);
		font-size: 15px;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
	}

	.create:hover {
		box-shadow: 0 -1px 0 0 rgba(0, 0, 0, 0.06) inset, 0 2px 4px 0 rgba(0, 0, 0, 0.08);
	}

	.create:active {
		box-shadow: 0 -1px 0 0 rgba(0, 0, 0, 0.06) inset, 0 0 2px 0 rgba(0, 0, 0, 0.04);
		transform: translateY(1px);
	}

	.create__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-left: 12px;
		margin-right: -8px;
	}

	.create__label {
		margin: 0 auto;
		padding: 0 16px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 719px) {
		.create__label {
			display: none;
		}

		.create__icon {
			min-width: 44px;
			margin: 0;
		}
	}
</style>
