<script lang="ts">
	import { hideSplash } from '$lib/splash';
	import { setupCompleted } from '$lib/storage/setup.svelte';

	let { ondone }: { ondone: () => void } = $props();

	const ORG_REPO = 'https://github.com/re-dtf/.github';
	let leaving = $state(false);

	async function start() {
		if (leaving) return;
		leaving = true;
		setupCompleted.value = true;
		await hideSplash();
		ondone();
	}
</script>

<!-- Логотип и размытый фон рисует заставка из app.html, здесь только текст и карточка поверх них -->
<div class="welcome" class:leaving role="dialog" aria-modal="true" aria-labelledby="welcome-title">
	<div class="title-box">
		<h1 id="welcome-title">Добро пожаловать!</h1>
	</div>

	<div class="card">
		<button class="start" onclick={start} {@attach (el) => el.focus({ preventScroll: true })}>Начать</button>
		<p class="legal">
			Нажимая эту кнопку, вы принимаете наши
			<a href="{ORG_REPO}/blob/main/docs/user/privacy-and-security.md" target="_blank" rel="noopener">политику конфиденциальности</a>,
			<a href="{ORG_REPO}/blob/main/LICENSE" target="_blank" rel="noopener">лицензионное соглашение</a>,
			<a href="https://dtf.ru/privacy" target="_blank" rel="noopener">политику</a> и
			<a href="https://dtf.ru/terms" target="_blank" rel="noopener">лицензионное соглашение DTF</a>, а также подтверждаете, что
			будете соблюдать <a href="https://dtf.ru/rules" target="_blank" rel="noopener">правила DTF</a>
		</p>
	</div>
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
	@media (prefers-color-scheme: dark) {
		.welcome {
			--ink: #fff;
			--card: #1c1c1e;
			--legal: rgb(255 255 255 / 0.5);
			--link: rgb(150 190 230 / 0.6);
		}
	}

	/* Заголовок по центру кадра макета (514 из 1080) */
	.title-box {
		position: absolute;
		top: 47.6%;
		left: 24px;
		right: 24px;
		transform: translateY(-50%);
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
		/* Появляется, когда заставка заканчивает перенос логотипа наверх; fill только backwards: иначе уход не сработает */
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
			translate 0.5s var(--out);
		animation: card-in 0.9s var(--out) 0.95s backwards;
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
	.start:focus-visible {
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
		h1,
		.card {
			animation: none;
		}
	}
</style>
