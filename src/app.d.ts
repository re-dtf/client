// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}

		/**
		 * Оверлей поверх ленты. Что открыть и с какими данными. Новый тип оверлея описывается здесь,
		 * в src/lib/navigation.ts (адрес и способ показа) и в src/routes/+layout.svelte (компонент).
		 */
		type OverlayData =
			| { type: 'post'; data: { postId: number; sourceId: string; commentId?: number } }
			| { type: 'profile'; data: { profileId: number } }
			| { type: 'settings' }
			| { type: 'notifications' }
			| { type: 'login' }
			| { type: 'editor'; data?: { postId?: number | null; repostId?: number } }
			| { type: 'lightbox'; data: { images: { uuid: string; width: number; height: number }[]; index: number } };

		/** Оверлей в стеке: то, что открыли, плюс служебные поля */
		type OverlayState = OverlayData & {
			id: string;
			/** page — вместо страницы, лента под ним скрыта; modal — окно поверх; fullscreen — рисует себя сам на весь экран */
			presentation: 'page' | 'modal' | 'fullscreen';
		};

		interface PageState {
			overlays?: OverlayState[];
		}
		// interface Platform {}
	}
}

export {};
