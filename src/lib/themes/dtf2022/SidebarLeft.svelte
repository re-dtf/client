<script lang="ts">
	import { resolve } from '$app/paths';

	let activeFeed = $state<'popular' | 'new' | 'my'>('popular');

	function selectFeed(feed: 'popular' | 'new' | 'my') {
		activeFeed = feed;
		window.dispatchEvent(new CustomEvent('switchFeed', { detail: feed }));
	}
</script>

<aside class="sidebar-left">
	<div class="sidebar-top">
		<nav class="feed-switcher">
			<button 
				class="switch-button" 
				class:active={activeFeed === 'popular'}
				onclick={() => selectFeed('popular')}
			>
				<svg height="24" width="24" class="icon">
					<use href="/icons.svg#ui_sidebar_feed"></use>
				</svg>
				<span class="label">Популярное</span>
			</button>
			<button 
				class="switch-button" 
				class:active={activeFeed === 'new'}
				onclick={() => selectFeed('new')}
			>
				<svg height="24" width="24" class="icon">
					<use href="/icons.svg#ui_sidebar_recent_big"></use>
				</svg>
				<span class="label">Свежее</span>
			</button>
			<button 
				class="switch-button" 
				class:active={activeFeed === 'my'}
				onclick={() => selectFeed('my')}
			>
				<svg height="24" width="24" class="icon">
					<use href="/icons.svg#ui_sidebar_subscriptions"></use>
				</svg>
				<span class="label">Подписки</span>
			</button>
		</nav>

		<nav class="subsites-switcher">
			<button class="switch-button">
				<img height="24" width="24" class="icon" alt="Игры"
					src="https://leonardo.osnova.io/e5348320-b11a-9419-fb85-f7b63e2de194/-/scale_crop/64x64/-/format/webp/" />
				<span class="label">Игры</span>
			</button>
			<button class="switch-button">
				<img height="24" width="24" class="icon" alt="Кино и сериалы"
					src="https://leonardo.osnova.io/5d198df0-3ba4-6837-b9c3-ac8c04fb9181/-/scale_crop/64x64/-/format/webp/" />
				<span class="label">Кино и сериалы</span>
			</button>
			<button class="switch-button">
				<img height="24" width="24" class="icon" alt="Индустрия"
					src="https://leonardo.osnova.io/f488fca4-88d6-c978-d052-4d49a3a62a44/-/scale_crop/64x64/-/format/webp/" />
				<span class="label">Индустрия</span>
			</button>
			<button class="switch-button">
				<img height="24" width="24" class="icon" alt="Gamedev"
					src="https://leonardo.osnova.io/9e71f64c-f452-321b-e24b-901bd6b01757/-/scale_crop/64x64/-/format/webp/" />
				<span class="label">Gamedev</span>
			</button>
			<button class="switch-button">
				<img height="24" width="24" class="icon" alt="Жизнь"
					src="https://leonardo.osnova.io/968a91e7-3a3c-5c79-a0cb-2b3df974a697/-/scale_crop/64x64/-/format/webp/" />
				<span class="label">Жизнь</span>
			</button>
		</nav>
	</div>

	<div class="sidebar-bottom">
		<div class="sidebar-footer">
			<div class="sidebar-footer__links">
				<a href={resolve('/about' as any)}>О проекте</a>
				<a href="https://github.com" target="_blank" rel="noreferrer">Наш Github</a>
				<a href={resolve('/donate' as any)}>Поддержать</a>
				<a href={resolve('/rules' as any)}>Правила DTF</a>
				<a href={resolve('/terms' as any)}>Правовая информация</a>
			</div>
		</div>
	</div>
</aside>
