<script lang="ts">
	import { flushSync, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { fade } from 'svelte/transition';
	import { shouldAutoplay } from '$lib/dataSaver.svelte';

	/**
	 * Пускает ролик в разметку сразу или, если по настройкам он не грузится сам, показывает вместо него
	 * кадр-превью с кнопкой воспроизведения. Сам `<video>` рисует вызывающий код (в `children`): его стили не меняются.
	 */
	let {
		media,
		kind,
		fill = false,
		maxHeight,
		menu,
		children
	}: {
		media: { uuid: string; width?: number; height?: number; color?: string; duration?: number };
		kind: 'gif' | 'video';
		/** Заглушка растягивается на родителя с заданными пропорциями (иначе берёт пропорции из данных) */
		fill?: boolean;
		/** Предел высоты заглушки вне рамки, px */
		maxHeight?: number;
		/** Контекстное меню ролика: доступно и до загрузки */
		menu?: Attachment<HTMLElement>;
		children: Snippet;
	} = $props();

	let playback = $derived({ uuid: media.uuid, phase: 'idle' as 'idle' | 'starting' | 'playing' });
	let player = $state<HTMLDivElement>();
	let direct = $derived(shouldAutoplay(kind));

	let ratio = $derived(media.width && media.height ? media.width / media.height : 16 / 9);
	let maxWidth = $derived(Math.min(media.width || Infinity, maxHeight ? maxHeight * ratio : Infinity));
	let duration = $derived(
		kind === 'video' && media.duration
			? `${Math.floor(media.duration / 60)}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}`
			: ''
	);
	let stillUrl = $derived(getLeonardoUrl(media.uuid, { width: 800, format: 'jpg' }));
	let vars = $derived(
		`--gate-ratio:${ratio};` +
			(!fill && Number.isFinite(maxWidth) ? `--gate-max-w:${maxWidth}px;` : '') +
			(media.color ? `--gate-bg:#${media.color};` : '')
	);

	async function start() {
		const attempt = { uuid: media.uuid, phase: 'starting' } as const;
		// Монтируем видео в обработчике нажатия, пока браузер разрешает запуск жестом пользователя.
		flushSync(() => (playback = attempt));
		try {
			await player!.querySelector('video')!.play();
			if (playback === attempt) playback = { ...attempt, phase: 'playing' };
		} catch {
			if (playback === attempt) playback = { ...attempt, phase: 'idle' };
		}
	}
</script>

{#if direct}
	{@render children()}
{:else if playback.phase !== 'idle'}
	<!-- Кадр-превью лежит поверх видео, пока оно не заиграло, и плавно гаснет: без мигания между кадром и первым кадром ролика -->
	<div class={['media-gate-wrap', { 'media-gate--fill': fill }]} style={vars} bind:this={player}>
		{@render children()}
		{#if playback.phase === 'starting'}
			<img class="media-gate__still media-gate__still--over" src={stillUrl} alt="" out:fade={{ duration: 200 }} />
		{/if}
	</div>
{:else}
	<button
		type="button"
		class={['media-gate', { 'media-gate--fill': fill }]}
		style={vars}
		aria-label={kind === 'gif' ? 'Воспроизвести GIF' : 'Воспроизвести видео'}
		onclick={start}
		{@attach menu}
	>
		<img class="media-gate__still" src={stillUrl} alt="" loading="lazy" decoding="async" />
		<span class={['media-gate__play', { 'media-gate__play--gif': kind === 'gif' }]} aria-hidden="true">
			{#if kind === 'gif'}
				GIF
			{:else}
				<svg width="28" height="28"><use href="#andropov_play_twitch"></use></svg>
			{/if}
		</span>
		{#if duration}
			<span class="media-gate__duration">{duration}</span>
		{/if}
	</button>
{/if}

<style>
	/* z-index 2: выше ссылки-подложки карточки поста, иначе нажатие открыло бы пост, а не ролик */
	.media-gate {
		position: relative;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 100%;
		max-width: var(--gate-max-w, 100%);
		aspect-ratio: var(--gate-ratio);
		padding: 0;
		border: 0;
		border-radius: 8px;
		overflow: hidden;
		background: var(--gate-bg, rgba(127, 127, 127, 0.2));
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* Обёртка играющего ролика: те же размеры, что у заглушки, чтобы вёрстка не прыгала. Без z-index, слои видео остаются как были */
	.media-gate-wrap {
		position: relative;
		width: 100%;
		max-width: var(--gate-max-w, 100%);
		aspect-ratio: var(--gate-ratio);
	}

	.media-gate--fill {
		position: absolute;
		inset: 0;
		max-width: none;
		aspect-ratio: auto;
		border-radius: 0;
	}

	.media-gate__still {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.media-gate__still--over {
		z-index: 3;
		border-radius: 8px;
		pointer-events: none;
	}

	.media-gate--fill .media-gate__still--over {
		border-radius: 0;
	}

	/* Как OSD-кнопки Adwaita: плоская тёмная плашка без размытия и масштабирования, наведение только осветляет */
	.media-gate__play {
		position: relative;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 24px;
		font-size: 15px;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.02em;
		color: #fff;
		background: rgba(0, 0, 0, 0.7);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
		transition: background-color var(--duration-base, 0.2s);
	}

	.media-gate__play--gif {
		width: auto;
		min-width: 64px;
		padding-inline: 14px;
	}

	.media-gate__play svg {
		fill: currentColor;
		margin-left: 2px;
	}

	.media-gate:hover .media-gate__play {
		background: rgba(48, 48, 48, 0.8);
	}

	.media-gate:focus-visible {
		outline: 2px solid var(--color-accent, #299ef0);
		outline-offset: -2px;
	}

	.media-gate__duration {
		position: absolute;
		left: 8px;
		bottom: 8px;
		padding: 2px 6px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		line-height: 16px;
		color: #fff;
		background: rgba(0, 0, 0, 0.7);
	}
</style>
