<script lang="ts">
	import { hideSplash } from '$lib/splash';
	import { setupCompleted } from '$lib/storage/setup.svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicIn, quintOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import WelcomePreferences from './WelcomePreferences.svelte';

	let { ondone }: { ondone: () => void } = $props();

	const ORG_REPO = 'https://github.com/re-dtf/.github';
	let leaving = $state(false);
	let step = $state<'welcome' | 'preferences' | 'ready'>('welcome');
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	async function finish() {
		if (leaving) return;
		leaving = true;
		setupCompleted.value = true;
		await hideSplash();
		ondone();
	}
</script>

<!-- Логотип и размытый фон рисует заставка из app.html, здесь только текст и карточка поверх них -->
<div class="welcome" class:leaving role="dialog" aria-modal="true" aria-labelledby="welcome-title-{step}">
	{#each [step] as current (current)}
		<div
			class={['screen', current === 'welcome' ? 'intro' : 'guided']}
			inert={leaving || current !== step}
			out:fade={{ duration: reducedMotion.current ? 0 : 300 }}
		>
			<div
				class="title-box"
				in:fly={{ y: 22, duration: reducedMotion.current || current === 'welcome' ? 0 : 650, delay: reducedMotion.current ? 0 : 120, easing: quintOut }}
				out:fly={{ y: -12, duration: reducedMotion.current ? 0 : 220, easing: cubicIn }}
			>
				<h1 id="welcome-title-{current}">
					{#if current === 'welcome'}Добро пожаловать!
					{:else if current === 'preferences'}Давайте настроим клиент под вас
					{:else}Всё готово!{/if}
				</h1>
			</div>

			<div
				class="card"
				in:fly={{ y: 36, duration: reducedMotion.current || current === 'welcome' ? 0 : 750, delay: reducedMotion.current ? 0 : 210, easing: quintOut }}
				out:fly={{ y: -18, duration: reducedMotion.current ? 0 : 260, easing: cubicIn }}
			>
				{#if current === 'welcome'}
					<button class="start" onclick={() => (step = 'preferences')} {@attach (el) => el.focus({ preventScroll: true })}>Начать</button>
					<p class="legal">
						Нажимая эту кнопку, вы принимаете наши
						<a href="{ORG_REPO}/blob/main/PRIVACY.md" target="_blank" rel="noopener">политику конфиденциальности</a>,
						<a href="{ORG_REPO}/blob/main/TERMS.md" target="_blank" rel="noopener">условия использования</a>,
						<a href="https://dtf.ru/privacy" target="_blank" rel="noopener">политику конфиденциальности</a> и
						<a href="https://dtf.ru/terms" target="_blank" rel="noopener">использования</a> DTF, а также подтверждаете, что
						будете соблюдать <a href="https://dtf.ru/rules" target="_blank" rel="noopener">правила DTF</a>
					</p>
				{:else if current === 'preferences'}
					<p class="note">Всего пара штрихов, чтобы стало уютнее.<br />Можно оставить всё как есть.</p>
					<WelcomePreferences />
					<div class="actions">
						<button class="start" onclick={() => (step = 'ready')} {@attach (el) => el.focus({ preventScroll: true })}>Продолжить</button>
						<button class="skip" onclick={() => (step = 'ready')}>Пропустить</button>
					</div>
				{:else}
					<p class="note">Ещё больше возможностей — в настройках.<br />Там же можно в любой момент изменить ваш выбор.</p>
					<p class="wish">Приятного чтения, интересных находок<br />и хороших разговоров на DTF!</p>
					<button class="start" onclick={finish} {@attach (el) => el.focus({ preventScroll: true })}>К ленте</button>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.welcome {
		--ink: #000;
		--card: #fff;
		--legal: rgb(0 0 0 / 0.5);
		--link: rgb(18 58 92 / 0.5);
		--out: cubic-bezier(0.165, 0.84, 0.44, 1);
		position: fixed;
		inset: 0;
		z-index: 9999; /* Над заставкой (9998), под ней лежит размытая лента */
		font-family: Roboto, system-ui, sans-serif;
		color: var(--ink);
	}
	.screen {
		position: absolute;
		inset: 0;
	}
	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme-mode='light'])) .welcome {
			--ink: #fff;
			--card: #1c1c1e;
			--legal: rgb(255 255 255 / 0.5);
			--link: rgb(150 190 230 / 0.6);
		}
	}
	:global(html[data-theme-mode='dark']) .welcome {
		--ink: #fff;
		--card: #1c1c1e;
		--legal: rgb(255 255 255 / 0.5);
		--link: rgb(150 190 230 / 0.6);
	}

	/* Заголовок по центру кадра макета (514 из 1080) */
	.title-box {
		position: absolute;
		top: 47.6%;
		left: 24px;
		right: 24px;
		transform: translateY(-50%);
		transition: opacity 350ms ease;
	}
	h1 {
		font-size: clamp(30px, 10.5vw, 75px);
		font-weight: 200;
		letter-spacing: 0.05em;
		line-height: 1.2;
		text-align: center;
		text-wrap: balance;
		transition:
			opacity 0.5s ease,
			transform 0.6s var(--out),
			filter 0.5s ease;
	}
	.intro h1 {
		/* Появляется после переноса логотипа; backwards позволяет анимировать уход */
		animation: title-in 1.1s var(--out) 0.5s backwards;
	}

	.card {
		position: absolute;
		left: 50%;
		bottom: max(16px, env(safe-area-inset-bottom), 4.4vh);
		width: min(496px, calc(100% - 32px));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 19px;
		padding: 29px 42px 16px;
		border-radius: 20px;
		background: var(--card);
		box-shadow: 0 0 12.5px rgb(0 0 0 / 0.15);
		transform: translateX(-50%);
		transition:
			opacity 0.45s ease,
			translate 0.5s var(--out),
			background-color 0.45s ease,
			box-shadow 0.45s ease;
	}
	.intro .card {
		animation: card-in 0.9s var(--out) 0.95s backwards;
	}
	.guided {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 28px;
		padding: max(152px, 18vh) 16px max(24px, env(safe-area-inset-bottom), 4.4vh);
		overflow-y: auto;
	}
	.guided .title-box {
		position: static;
		flex-shrink: 0;
		width: min(600px, 100%);
		transform: none;
	}
	.guided h1 {
		font-size: clamp(30px, 6vw, 48px);
		letter-spacing: 0.025em;
	}
	.guided .card {
		position: static;
		flex-shrink: 0;
		width: min(496px, 100%);
		margin: auto 0;
		padding: 24px;
		gap: 20px;
		transform: none;
	}
	.note, .wish {
		font-size: 14px;
		line-height: 1.6;
		text-align: center;
		text-wrap: pretty;
		transition: opacity 350ms ease;
	}
	.note {
		color: var(--legal);
	}
	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		transition: opacity 350ms ease;
	}
	.welcome:global([data-slider-drag]) .card {
		background-color: transparent;
		box-shadow: none;
	}
	.welcome:global([data-slider-drag]) .title-box,
	.welcome:global([data-slider-drag]) .note,
	.welcome:global([data-slider-drag]) .actions {
		opacity: 0;
		pointer-events: none;
	}
	.skip {
		min-height: 36px;
		padding: 0 16px;
		border-radius: 9px;
		color: var(--legal);
		font-size: 14px;
		cursor: pointer;
	}
	.skip:hover {
		color: var(--ink);
	}
	.start {
		min-width: 140px;
		height: 34px;
		padding: 0 25px;
		border-radius: 9px;
		background: #317df0;
		color: #fff;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			scale 0.15s var(--out);
	}
	.start:hover {
		background: #2a6fd8;
	}
	.start:active {
		scale: 0.96;
	}
	.start:focus-visible, .skip:focus-visible {
		outline: 2px solid #317df0;
		outline-offset: 3px;
	}
	.legal {
		font-size: 11px;
		font-weight: 300;
		line-height: 12px;
		text-align: center;
		color: var(--legal);
	}
	.legal a {
		color: var(--link);
		text-decoration: underline;
	}

	.leaving h1 {
		opacity: 0;
		transform: translateY(-14px);
		filter: blur(8px);
		animation: none;
	}
	.leaving .card {
		opacity: 0;
		translate: 0 24px;
		animation: none;
		pointer-events: none;
	}

	@keyframes title-in {
		from {
			opacity: 0;
			transform: translateY(24px);
			filter: blur(12px);
		}
	}
	@keyframes card-in {
		from {
			opacity: 0;
			translate: 0 32px;
			scale: 0.96;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.intro h1,
		.intro .card,
		.leaving h1,
		.leaving .card {
			animation: none;
			transition: none;
		}
	}
</style>
