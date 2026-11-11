<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import {
		fetchSupportersFromNetwork,
		type Supporter,
		type SupportersPayload
	} from '$lib/supporters';
	import { openDtfLink } from '$lib/navigation';

	const DONATE_RU_URL = 'https://pay.cloudtips.ru/p/2fa64784';
	const DONATE_WORLD_URL = 'https://dalink.to/donnertech';

	const AVATAR_COLORS = [
		'#e5484d',
		'#1693e5',
		'#1f8a3b',
		'#8e4ec6',
		'#d99a00',
		'#d6409f',
		'#00a2c7',
		'#f76808'
	];

	function getAvatarColor(name: string): string {
		const code = name.charCodeAt(0) || 0;
		return AVATAR_COLORS[code % AVATAR_COLORS.length];
	}

	function getInitial(name: string): string {
		const clean = name.replace(/^[@#\s]+/, '').trim();
		return clean ? clean.charAt(0).toUpperCase() : '★';
	}

	let data = $state<SupportersPayload | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load(force = false) {
		loading = true;
		error = null;
		try {
			data = await fetchSupportersFromNetwork(force);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Не удалось загрузить список';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load(false);
	});

	function handleLinkClick(e: MouseEvent, href?: string) {
		if (!href) return;
		if (href.startsWith('https://dtf.ru') || href.startsWith('/')) {
			if (openDtfLink(e, href)) {
				e.preventDefault();
			}
		}
	}
</script>

<section class="hero">
	<span class="hero__icon">
		<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
			<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
		</svg>
	</span>
	<div class="hero__text">
		<h3 class="hero__title">Поддержавшие проект</h3>
		<p class="hero__description">
			{data?.description || 'Мы очень благодарны всем, кто поддерживает развитие reDTF. Деньги идут на сервер, домен и труд разработки.'}
		</p>
		<div class="hero__actions">
			<SettingsButton variant="suggested" href={DONATE_RU_URL}>Из России</SettingsButton>
			<SettingsButton href={DONATE_WORLD_URL}>Из других стран</SettingsButton>
		</div>
	</div>
</section>

{#if loading}
	<div class="state-card">
		<div class="spinner" aria-hidden="true"></div>
		<p class="state-card__text">Загрузка списка спонсоров...</p>
	</div>
{:else if error}
	<div class="state-card state-card--error">
		<p class="state-card__title">Не удалось загрузить список</p>
		<p class="state-card__text">{error}</p>
		<SettingsButton variant="suggested" onclick={() => load(true)}>Попробовать снова</SettingsButton>
	</div>
{:else if data && data.supporters.length > 0}
	<SettingsGroup title="Спонсоры" description={data.updatedAt ? `Обновлено: ${data.updatedAt}` : undefined}>
		{#each data.supporters as supporter (supporter.name)}
			<SettingsRow title={supporter.name} subtitle={supporter.comment}>
				{#snippet prefix()}
					<span
						class="supporter-avatar"
						style="background-color: {getAvatarColor(supporter.name)}"
						aria-hidden="true"
					>
						{getInitial(supporter.name)}
					</span>
				{/snippet}

				<div class="supporter-extra">
					{#if supporter.amount}
						<span class="supporter-amount">{supporter.amount}</span>
					{/if}
					{#if supporter.link}
						<a
							class="supporter-link"
							href={supporter.link}
							target={supporter.link.startsWith('http') ? '_blank' : undefined}
							rel={supporter.link.startsWith('http') ? 'noopener noreferrer' : undefined}
							onclick={(e) => handleLinkClick(e, supporter.link)}
							aria-label="Профиль {supporter.name}"
						>
							<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M6 3h7v7M13 3L6 10" />
							</svg>
						</a>
					{/if}
				</div>
			</SettingsRow>
		{/each}
	</SettingsGroup>

	<p class="hint">
		При отправке доната напишите свой никнейм, и он появится здесь при следующем обновлении.
	</p>
{:else}
	<div class="state-card">
		<p class="state-card__title">Список пока пуст</p>
		<p class="state-card__text">Вы можете стать первым, кто поддержит развитие клиента!</p>
		<SettingsButton variant="suggested" href={DONATE_RU_URL}>Поддержать</SettingsButton>
	</div>
{/if}

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 32px;
		padding: 24px;
		border-radius: 18px;
		background:
			linear-gradient(135deg, color-mix(in srgb, #e5484d 16%, transparent), transparent 75%),
			var(--st-card);
		box-shadow: var(--st-card-shadow);
	}

	.hero__icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: color-mix(in srgb, #e5484d 18%, transparent);
		color: #e5484d;
	}

	:global(html[data-theme-mode='dark']) .hero__icon {
		color: #ff6467;
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme-mode='light'])) .hero__icon {
			color: #ff6467;
		}
	}

	.hero__text {
		flex: 1;
		min-width: 0;
	}

	.hero__title {
		margin: 0;
		color: var(--st-text);
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.hero__description {
		margin: 4px 0 0;
		color: var(--st-muted);
		font-size: 14px;
		line-height: 20px;
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 16px;
	}

	.supporter-avatar {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		color: #ffffff;
		font-size: 15px;
		font-weight: 600;
		flex: none;
	}

	.supporter-extra {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: none;
	}

	.supporter-amount {
		padding: 4px 10px;
		border-radius: 12px;
		background: color-mix(in srgb, #1f8a3b 15%, transparent);
		color: #1f8a3b;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.2px;
	}

	:global(html[data-theme-mode='dark']) .supporter-amount {
		color: #3dd68c;
		background: color-mix(in srgb, #3dd68c 18%, transparent);
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme-mode='light'])) .supporter-amount {
			color: #3dd68c;
			background: color-mix(in srgb, #3dd68c 18%, transparent);
		}
	}

	.supporter-link {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		color: var(--st-muted);
		transition: background-color var(--duration-base), color var(--duration-base);
	}

	.supporter-link:hover {
		background: var(--st-hover);
		color: var(--st-text);
	}

	.hint {
		margin: 20px 4px 0;
		color: var(--st-muted);
		font-size: 13px;
		line-height: 18px;
		text-align: center;
	}

	.state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 36px 20px;
		margin-bottom: 24px;
		border-radius: 16px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow);
		text-align: center;
	}

	.state-card--error {
		border: 1px solid color-mix(in srgb, #e5484d 30%, transparent);
	}

	.state-card__title {
		margin: 0;
		font-size: 16px;
		font-weight: 500;
		color: var(--st-text);
	}

	.state-card__text {
		margin: 0;
		font-size: 14px;
		color: var(--st-muted);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 3px solid var(--st-separator);
		border-top-color: var(--st-accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@container (max-width: 719px) {
		.hero {
			flex-direction: column;
			align-items: flex-start;
			gap: 14px;
		}

		.hero__actions :global(.btn) {
			width: 100%;
		}
	}
</style>
