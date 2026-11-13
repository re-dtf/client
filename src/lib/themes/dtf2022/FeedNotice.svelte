<script lang="ts">
	import { resolve } from '$app/paths';
	import { openSettings } from '$lib/navigation';
	import { shareApp } from '$lib/shareApp';
	import { notify } from './ui/notify.svelte';

	/* Плашка между постами ленты: карточка с мягким розовым верхом, кнопки поддержки и два тихих «не сейчас» внизу */
	let { onlater, onnever }: { onlater: () => void; onnever: () => void } = $props();

	async function share() {
		if ((await shareApp()) === 'copied') notify.success('Ссылка скопирована');
	}
</script>

<section class="notice" aria-labelledby="feed-notice-title">
	<div class="notice__head">
		<span class="notice__badge" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="24" height="24">
				<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
			</svg>
		</span>
		<div class="notice__text">
			<h3 id="feed-notice-title" class="notice__title">Нравится reDTF?</h3>
			<p class="notice__description">Мы благодарны любой поддержке от вас. Будь это финансовая помощь, распространение проекта или star на гитхабе. Спасибо что вы с нами!</p>
		</div>
	</div>

	<div class="notice__actions">
		<a href="{resolve('/settings')}?page=help" class="notice__btn notice__btn--primary" onclick={(e) => openSettings(e, 'help')}>Поддержать проект</a>
		<button class="notice__btn" onclick={share}>
			<svg class="icon" width="20" height="20" aria-hidden="true"><use href="/icons.svg#v_share"></use></svg>
			Рассказать друзьям
		</button>
		<a href="https://github.com/re-dtf/client" class="notice__btn" target="_blank" rel="noopener noreferrer">
			<svg class="icon" width="20" height="20" aria-hidden="true"><use href="/icons.svg#v_star"></use></svg>
			Звезда на GitHub
		</a>
	</div>

	<div class="notice__footer">
		<button class="notice__quiet" onclick={onlater}>Напомнить позже</button>
		<button class="notice__quiet" onclick={onnever}>Больше не показывать</button>
	</div>
</section>

<style>
	.notice {
		width: 100%;
		max-width: var(--content-width);
		margin: 28px auto 0;
		padding: 20px;
		border-radius: 8px;
		background: linear-gradient(180deg, color-mix(in srgb, var(--color-like) 12%, transparent), transparent 140px) var(--bg-card);
	}

	.notice__head {
		display: flex;
		gap: 14px;
	}

	.notice__badge {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 100%;
		background: color-mix(in srgb, var(--color-like) 14%, transparent);
		color: var(--color-like);
	}

	.notice__title {
		margin: 0;
		font-size: 17px;
		line-height: 24px;
		font-weight: 500;
	}

	.notice__description {
		margin: 4px 0 0;
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 22px;
	}

	.notice__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}

	/* Кнопки как у DTF: белая с обводкой-тенью и синяя главная */
	.notice__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 36px;
		padding: 0 14px;
		border-radius: 8px;
		background: var(--bg-button);
		color: var(--text-primary);
		box-shadow: var(--shadow-btn-outline);
		font-size: 15px;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
	}

	.notice__btn .icon {
		flex-shrink: 0;
	}

	.notice__btn:hover {
		box-shadow: var(--shadow-btn-outline-hover);
	}

	.notice__btn:active {
		box-shadow: var(--shadow-btn-outline-active);
		transform: translateY(1px);
	}

	.notice__btn--primary {
		background: var(--bg-submit-button);
		color: var(--text-submit-button);
		box-shadow: var(--shadow-button-blue);
	}

	.notice__btn--primary:hover {
		background: var(--bg-submit-button--hover);
		box-shadow: var(--shadow-button-blue);
	}

	.notice__btn--primary:active {
		box-shadow: var(--shadow-button-blue-active);
	}

	.notice__footer {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--border-subtle);
	}

	.notice__quiet {
		padding: 2px 0;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 20px;
		cursor: pointer;
	}

	@media (hover: hover) {
		.notice__quiet:hover {
			color: var(--text-primary);
		}
	}

	@media (max-width: 859px) {
		.notice {
			margin-top: 20px;
		}
	}

	@media (max-width: 639px) {
		.notice {
			padding: 20px 16px;
			border-radius: 0;
		}

		/* Главная кнопка на всю ширину, две остальные рядом */
		.notice__btn {
			flex: 1 1 0;
			min-width: 0;
			padding: 0 8px;
		}

		.notice__btn--primary {
			flex-basis: 100%;
		}
	}
</style>
