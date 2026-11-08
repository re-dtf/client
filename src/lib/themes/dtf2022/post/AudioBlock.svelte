<script lang="ts">
	import { getAudioUrl, getLeonardoUrl } from '$lib/api/utils';
	import { formatNumber } from '../format';
	import { claimPlayback, formatDuration } from './audio';

	/*
	 * Блок audio: свой плеер вместо нативного, как у DTF начала 2023 (классы audio_player в оригинале).
	 * Обложка, название, перемотка на 15 секунд, скорость, громкость, скачивание и число прослушиваний.
	 * Плавающего плеера, который играет вне поста, у нас нет.
	 */
	let { data }: { data: any } = $props();

	const RATES = [1, 1.5, 2];
	const SKIP = 15;

	let file = $derived(data.audio?.data);
	let cover = $derived(data.image?.data);
	let title = $derived(data.title?.trim() || file?.filename?.replace(/\.[^.]+$/, '') || 'Аудио');
	let listens = $derived(file?.audio_info?.listens_count ?? 0);
	let src = $derived(file?.uuid ? getAudioUrl(file.uuid, file.filename) : '');

	let audio = $state<HTMLAudioElement>();
	let currentTime = $state(0);
	let duration = $state(0);
	let paused = $state(true);
	let ended = $state(false);
	let waiting = $state(false);
	let volume = $state(1);
	let muted = $state(false);
	let playbackRate = $state(1);

	// До загрузки метаданных длительность берём из данных блока
	let length = $derived(duration || file?.audio_info?.duration || 0);
	let progress = $derived(length ? Math.min(100, (currentTime / length) * 100) : 0);
	let mode = $derived(waiting && !paused ? 'loading' : !paused ? 'playing' : ended ? 'ended' : currentTime > 0 ? 'paused' : 'initial');

	function toggle() {
		if (!audio) return;
		if (audio.paused) audio.play().catch(() => {});
		else audio.pause();
	}

	function skip(seconds: number) {
		if (audio) audio.currentTime = Math.min(Math.max(0, currentTime + seconds), length);
	}

	function nextRate() {
		playbackRate = RATES[(RATES.indexOf(playbackRate) + 1) % RATES.length];
	}
</script>

{#snippet icon(id: string, width: number, height: number)}
	<svg class="icon" {width} {height} aria-hidden="true"><use href="/icons.svg#{id}"></use></svg>
{/snippet}

{#if file?.uuid}
	<div class="audio-block">
		{#if cover?.uuid}
			<img
				class="audio-block__cover"
				src={getLeonardoUrl(cover.uuid, { width: 1024 })}
				alt=""
				loading="lazy"
				style:aspect-ratio={cover.width && cover.height ? `${cover.width} / ${cover.height}` : undefined}
			/>
		{/if}
		<div class="audio-player" data-state={mode}>
			<audio
				bind:this={audio}
				{src}
				preload="metadata"
				bind:currentTime
				bind:duration
				bind:paused
				bind:ended
				bind:volume
				bind:muted
				bind:playbackRate
				onplay={() => audio && claimPlayback(audio)}
				onwaiting={() => (waiting = true)}
				onplaying={() => (waiting = false)}
			></audio>

			<button class="audio-player__button audio-player__play" aria-label={paused ? 'Играть' : 'Пауза'} onclick={toggle}>
				{#if paused}
					{@render icon('audio_play', 15, 19)}
				{:else}
					{@render icon('audio_pause', 14, 15)}
				{/if}
			</button>
			<button class="audio-player__button audio-player__rwd" aria-label="Назад на {SKIP} секунд" onclick={() => skip(-SKIP)}>
				{@render icon('audio_rwd', 13, 15)}
			</button>
			<button class="audio-player__button audio-player__skip" aria-label="Вперёд на {SKIP} секунд" onclick={() => skip(SKIP)}>
				{@render icon('audio_fwd', 13, 15)}
			</button>

			<div class="audio-player__info">
				<span class="audio-player__title" {title}>{title}</span>
				{#if listens > 0}
					<span class="audio-player__listens">{@render icon('audio_listens', 12, 12)} {formatNumber(listens)}</span>
				{/if}
			</div>

			<span class="audio-player__duration">{formatDuration(currentTime)} / {formatDuration(length)}</span>

			<button class="audio-player__button audio-player__rate" class:audio-player__rate--default={playbackRate === 1} aria-label="Скорость" onclick={nextRate}>
				×{playbackRate}
			</button>

			<div class="audio-player__volume">
				<button class="audio-player__button" aria-label={muted ? 'Включить звук' : 'Выключить звук'} onclick={() => (muted = !muted)}>
					{@render icon(muted ? 'audio_mute' : 'audio_volume', 18, 14)}
				</button>
				<input
					class="audio-player__slider audio-player__slider--volume"
					type="range"
					min="0"
					max="1"
					step="0.05"
					aria-label="Громкость"
					value={muted ? 0 : volume}
					style:--progress="{(muted ? 0 : volume) * 100}%"
					oninput={(e) => {
						volume = +e.currentTarget.value;
						muted = false;
					}}
				/>
			</div>

			<a class="audio-player__button audio-player__download" href={src} download={file.filename} target="_blank" rel="noopener" aria-label="Скачать">
				{@render icon('audio_download', 10, 12)}
			</a>

			<input
				class="audio-player__slider audio-player__seek"
				type="range"
				min="0"
				max={length}
				step="0.1"
				aria-label="Перемотка"
				value={currentTime}
				style:--progress="{progress}%"
				oninput={(e) => (currentTime = +e.currentTarget.value)}
			/>
		</div>
	</div>
{/if}

<style>
	/* Рамка как у .block-audio в оригинале; боковые линии в ленте убирает PostBlocks, на мобильном — тут */
	.audio-block {
		border: 1px solid #f2f2f2;
		overflow: hidden;
	}

	.audio-block__cover {
		display: block;
		width: 100%;
	}

	.audio-player {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		padding: 3px var(--island-offset-x, 16px) 12px;
		font-size: 13px;
		line-height: normal;
		user-select: none;
	}

	.audio-player audio {
		display: none;
	}

	.audio-player__button {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 24px;
		padding: 0 7px;
		color: #000;
		cursor: pointer;
	}

	.audio-player__button:hover {
		color: #333;
	}

	.audio-player__play {
		padding: 0 5px 0 9px;
		margin-right: 10px;
	}

	.audio-player[data-state='playing'] .audio-player__play,
	.audio-player[data-state='loading'] .audio-player__play {
		padding: 0 7px 0 8px;
	}

	.audio-player__info {
		display: flex;
		flex: 1;
		align-items: baseline;
		min-width: 0;
		margin-right: 5px;
	}

	.audio-player__title {
		overflow: hidden;
		max-width: 200px;
		margin-right: 17px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.audio-player__listens {
		display: flex;
		align-items: baseline;
		gap: 6px;
		color: var(--text-muted);
		font-size: 11px;
	}

	.audio-player__listens :global(.icon) {
		color: #b0b0b0;
	}

	.audio-player__duration {
		margin-right: 17px;
		color: var(--text-muted);
		font-size: 11px;
		white-space: nowrap;
	}

	.audio-player__rate {
		padding: 0 12px;
		font-size: 15px;
		font-weight: 500;
	}

	.audio-player__rate--default,
	.audio-player__volume .audio-player__button,
	.audio-player__download {
		color: #b0b0b0;
	}

	.audio-player__rate--default:hover,
	.audio-player__volume .audio-player__button:hover,
	.audio-player__download:hover {
		color: #000;
	}

	.audio-player__volume .audio-player__button,
	.audio-player__download {
		padding: 0 12px;
	}

	.audio-player__download {
		margin-right: -7px;
		border: 0;
	}

	.audio-player__volume {
		position: relative;
	}

	/* Ползунок громкости появляется слева от кнопки при наведении */
	.audio-player__slider--volume {
		position: absolute;
		top: 1px;
		right: 100%;
		width: 65px;
		background-color: var(--bg-card);
		visibility: hidden;
	}

	.audio-player__volume:hover .audio-player__slider--volume,
	.audio-player__slider--volume:focus-visible {
		visibility: visible;
	}

	/* Полоса: 2px, закрашенная часть чёрная, точка на конце (при наведении крупнее) */
	.audio-player__slider {
		appearance: none;
		height: 24px;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}

	.audio-player__seek {
		flex-basis: 100%;
		width: 100%;
	}

	.audio-player__slider::-webkit-slider-runnable-track {
		height: 2px;
		border-radius: 2px;
		background: linear-gradient(to right, #000 var(--progress), #cecece var(--progress));
	}

	.audio-player__slider::-moz-range-track {
		height: 2px;
		border-radius: 2px;
		background: linear-gradient(to right, #000 var(--progress), #cecece var(--progress));
	}

	.audio-player__slider::-webkit-slider-thumb {
		appearance: none;
		width: 4px;
		height: 4px;
		margin-top: -1px;
		border: 0;
		border-radius: 50%;
		background: #000;
		transition: transform 0.2s;
	}

	.audio-player__slider::-moz-range-thumb {
		width: 4px;
		height: 4px;
		border: 0;
		border-radius: 50%;
		background: #000;
		transition: transform 0.2s;
	}

	.audio-player__slider:hover::-webkit-slider-thumb {
		transform: scale(1.5);
	}

	.audio-player__slider:hover::-moz-range-thumb {
		transform: scale(1.5);
	}

	.audio-player[data-state='initial'] .audio-player__seek::-webkit-slider-thumb {
		visibility: hidden;
	}

	.audio-player[data-state='initial'] .audio-player__seek::-moz-range-thumb {
		visibility: hidden;
	}

	@media (max-width: 639px) {
		.audio-block {
			border-left: 0;
			border-right: 0;
		}
	}

	@media (max-width: 859px) {
		.audio-player__rwd {
			margin-left: -5px;
		}

		.audio-player__duration {
			margin-right: 0;
		}

		.audio-player__rate {
			margin-right: -10px;
		}

		.audio-player__listens,
		.audio-player__volume,
		.audio-player__download {
			display: none;
		}
	}
</style>
