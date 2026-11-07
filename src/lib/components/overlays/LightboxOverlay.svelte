<script lang="ts">
	import { onMount } from 'svelte';
	import { downloadImage, getLeonardoOriginalUrl, getLeonardoUrl } from '$lib/api/utils';
	import { closeOverlay, preloadLightbox, takeLightboxOrigin } from '$lib/navigation';

	/** Просмотр картинок на весь экран. PhotoSwipe рисует себя сам, поэтому здесь только запуск и закрытие */
	let {
		images,
		index
	}: {
		images: { uuid: string; width: number; height: number; type?: string }[];
		index: number;
	} = $props();

	const MAX_WIDTH = 2048;

	onMount(() => {
		const origin = takeLightboxOrigin();
		let closed = false;
		let pswp: import('photoswipe').default | undefined;
		let downloadBtn: HTMLButtonElement | undefined;
		const downloading = new Set<string>();

		const updateButtonState = () => {
			if (!downloadBtn || !pswp) return;
			const current = images[pswp.currIndex];
			const isBusy = !!current?.uuid && downloading.has(current.uuid);
			downloadBtn.disabled = isBusy;
			downloadBtn.style.display = current?.uuid ? '' : 'none';
		};

		// Библиотека тяжёлая и нужна не всем: грузим при первом открытии (или берём из preload)
		(async () => {
			try {
				const res = await preloadLightbox();
				if (!res || closed) return;
				const [PhotoSwipeModule] = res;
				const PhotoSwipe = PhotoSwipeModule.default;

				pswp = new PhotoSwipe({
					index,
					// Стандартные 0.8 просвечивают страницу под просмотром
					bgOpacity: 0.92,
					dataSource: images.map(({ uuid, width, height }, i) => {
						// Картинка приходит не шире MAX_WIDTH, поэтому и размер заявляем такой, иначе приближение будет мыльным
						const scale = Math.min(1, MAX_WIDTH / width);
						return {
							src: getLeonardoUrl(uuid, { width: MAX_WIDTH }),
							width: Math.round(width * scale),
							height: Math.round(height * scale),
							// Только у открытого кадра: листали дальше — закрываемся плавным исчезновением
							...(i === index && origin && { element: origin, msrc: origin.currentSrc })
						};
					})
				});

				// Кнопка скачивания оригинала в полном качестве
				pswp.on('uiRegister', () => {
					pswp?.ui?.registerElement({
						name: 'download',
						ariaLabel: 'Скачать оригинал',
						title: 'Скачать оригинал',
						order: 15,
						isButton: true,
						html: {
							isCustomSVG: true,
							inner: '<path d="M15 6h2v9h4l-5 5-5-5h4V6zM7 21v4h18v-4h2v6H5v-6h2z" id="pswp__icn-download"/>',
							outlineID: 'pswp__icn-download'
						},
						onInit: (el) => {
							downloadBtn = el as HTMLButtonElement;
							updateButtonState();
						},
						onClick: async (e) => {
							e.stopPropagation();
							if (!pswp) return;
							const current = images[pswp.currIndex];
							if (!current?.uuid || downloading.has(current.uuid)) return;

							downloading.add(current.uuid);
							updateButtonState();

							try {
								const originalUrl = getLeonardoOriginalUrl(current.uuid);
								await downloadImage(originalUrl, current.uuid, current.type);
							} finally {
								downloading.delete(current.uuid);
								updateButtonState();
							}
						}
					});
				});

				pswp.on('change', () => {
					updateButtonState();
				});

				// Закрыли крестиком, Esc или свайпом: шаг истории назад
				pswp.on('destroy', () => {
					if (closed) return;
					closed = true;
					closeOverlay();
				});
				// «Назад» во время раскрытия PhotoSwipe пропускает: дожидаемся конца анимации
				pswp.on('openingAnimationEnd', () => closed && pswp?.destroy());
				pswp.init();
			} catch (e) {
				console.error(e);
				if (!closed) {
					closed = true;
					closeOverlay();
				}
			}
		})();

		// «Назад» в браузере: оверлея уже нет в истории, просто убираем просмотр
		return () => {
			closed = true;
			pswp?.destroy();
		};
	});
</script>

<!-- Невидимый барьер, пока PhotoSwipe инициализируется: блокирует повторные клики сквозь оверлей -->
<div class="pswp-barrier" aria-hidden="true"></div>

<style>
	.pswp-barrier {
		position: fixed;
		inset: 0;
		z-index: 99999;
		pointer-events: auto;
	}
</style>
